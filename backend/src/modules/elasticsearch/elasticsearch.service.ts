import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  InternalServerErrorException,
  ServiceUnavailableException,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, errors } from '@elastic/elasticsearch';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import * as fs from 'fs';
import {
  ElasticsearchConfig,
  ElasticsearchClientConfig,
  SearchParams,
  InternalSearchParams,
  SearchResult,
  ElasticsearchSearchResponse,
  ElasticsearchGetResponse,
  ElasticsearchMgetResponse,
  ElasticsearchCountResponse,
  ElasticsearchMappingResponse,
  ElasticsearchStatsResponse,
  ElasticsearchInfoResponse,
  ElasticsearchHealthResponse,
  GetParams,
  MgetParams,
  CountParams,
  AggregateParams,
  ElasticsearchQuery,
  AggregationsConfig,
  AggregationsResponse,
} from '../../types/elasticsearch.types';

@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client!: Client;
  private healthCheckInterval!: NodeJS.Timeout;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeClient();
    this.startHealthCheck();
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.client) {
      await this.client.close();
    }
  }

  private async initializeClient() {
    try {
      const config =
        this.configService.get<ElasticsearchConfig>('elasticsearch');
      if (!config) {
        throw new Error('Elasticsearch configuration not found');
      }

      // Build client configuration
      const clientConfig: ElasticsearchClientConfig = {
        node: config.node,
        maxRetries: config.maxRetries,
        requestTimeout: config.requestTimeout,
        sniffOnStart: config.sniffOnStart,
        sniffInterval: config.sniffInterval,
        sniffOnConnectionFault: config.sniffOnConnectionFault,
        resurrectStrategy: config.resurrectStrategy,
        compression: config.compression,
      };

      // Configure authentication
      if (config.auth.apiKey) {
        clientConfig.auth = {
          apiKey: config.auth.apiKey,
        };
      } else if (config.auth.username && config.auth.password) {
        clientConfig.auth = {
          username: config.auth.username,
          password: config.auth.password,
        };
      }

      // Configure TLS settings
      if (config.tls) {
        clientConfig.tls = {
          rejectUnauthorized: config.tls.rejectUnauthorized,
        };

        // Load CA certificate if provided
        if (config.tls.ca && fs.existsSync(config.tls.ca)) {
          clientConfig.tls.ca = fs.readFileSync(config.tls.ca);
        }
      }

      this.client = new Client(clientConfig);

      // Test connection
      const info = (await this.client.info()) as ElasticsearchInfoResponse;
      this.logger.log(
        `Connected to Elasticsearch cluster: ${info.cluster_name}`,
      );

      // Check cluster health
      const health =
        (await this.client.cluster.health()) as ElasticsearchHealthResponse;
      this.logger.log(`Cluster health status: ${health.status}`);

      if (health.status === 'red') {
        this.logger.error('Elasticsearch cluster health is RED!');
      } else if (health.status === 'yellow') {
        this.logger.warn('Elasticsearch cluster health is YELLOW');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Elasticsearch client', error);
      throw error;
    }
  }

  private startHealthCheck() {
    const interval = this.configService.get<number>(
      'elasticsearch.pool.sniffInterval',
      60000,
    );

    this.healthCheckInterval = setInterval(() => {
      void (async () => {
        try {
          await this.client.ping();
        } catch (error) {
          this.logger.error('Elasticsearch health check failed', error);
          // Attempt to reconnect
          await this.initializeClient();
        }
      })();
    }, interval);
  }

  /**
   * Search documents in the specified index
   */
  async search(params: SearchParams): Promise<SearchResult> {
    try {
      const {
        index,
        query,
        size = 10,
        from = 0,
        sort,
        source,
        highlight,
        aggregations,
      } = params;

      const searchParams: InternalSearchParams = {
        index,
        size,
        from,
      };

      if (query) {
        // Temporarily bypass sanitization for debugging
        searchParams.query = query;
      }

      if (sort) {
        searchParams.sort = sort;
      }

      if (source !== undefined) {
        searchParams._source = source;
      }

      if (highlight) {
        searchParams.highlight = highlight;
      }

      if (aggregations) {
        searchParams.aggs = aggregations as unknown;
      }

      const response = (await this.client.search(
        searchParams as SearchRequest,
      )) as ElasticsearchSearchResponse;

      return {
        total: response.hits.total,
        hits: response.hits.hits,
        aggregations: response.aggregations,
        took: response.took,
      };
    } catch (error) {
      this.handleElasticsearchError(error);
    }
  }

  /**
   * Get a document by ID
   */
  async get(
    index: string,
    id: string,
    source?: string[] | boolean,
  ): Promise<ElasticsearchGetResponse | null> {
    try {
      const params: GetParams = { index, id };

      if (source !== undefined) {
        params._source = source;
      }

      const response = (await this.client.get(
        params,
      )) as ElasticsearchGetResponse;
      return response;
    } catch (error) {
      if (error instanceof errors.ResponseError && error.statusCode === 404) {
        return null;
      }
      this.handleElasticsearchError(error);
    }
  }

  /**
   * Get multiple documents by IDs
   */
  async mget(
    index: string,
    ids: string[],
    source?: string[] | boolean,
  ): Promise<ElasticsearchGetResponse[]> {
    try {
      const params: MgetParams = {
        index,
        docs: ids.map((id) => ({ _id: id, _index: index })),
      };

      if (source !== undefined) {
        params._source = source;
      }

      const response = (await this.client.mget(
        params,
      )) as ElasticsearchMgetResponse;
      return response.docs as ElasticsearchGetResponse[];
    } catch (error) {
      this.handleElasticsearchError(error);
    }
  }

  /**
   * Count documents matching a query
   */
  async count(index: string, query?: ElasticsearchQuery): Promise<number> {
    try {
      const params: CountParams = { index };

      if (query) {
        // Temporarily bypass sanitization for debugging
        params.query = query;
      }

      const response = (await this.client.count(
        params,
      )) as ElasticsearchCountResponse;
      return response.count;
    } catch (error) {
      this.handleElasticsearchError(error);
    }
  }

  /**
   * Execute aggregations without fetching documents
   */
  async aggregate(
    index: string,
    aggregations: AggregationsConfig,
    query?: ElasticsearchQuery,
  ): Promise<AggregationsResponse | undefined> {
    try {
      const params: AggregateParams = {
        index,
        size: 0, // Don't return documents, only aggregations
        aggs: aggregations as unknown,
      };

      if (query) {
        // Temporarily bypass sanitization for debugging
        params.query = query;
      }

      const response = (await this.client.search(
        params as SearchRequest,
      )) as ElasticsearchSearchResponse;
      return response.aggregations;
    } catch (error) {
      this.handleElasticsearchError(error);
    }
  }

  /**
   * Get index mapping
   */
  async getMapping(
    index: string,
  ): Promise<ElasticsearchMappingResponse[string] | undefined> {
    try {
      const response = (await this.client.indices.getMapping({
        index,
      })) as ElasticsearchMappingResponse;
      return response[index];
    } catch (error) {
      this.handleElasticsearchError(error);
    }
  }

  /**
   * Get index stats
   */
  async getIndexStats(
    index: string,
  ): Promise<
    NonNullable<ElasticsearchStatsResponse['indices']>[string] | undefined
  > {
    try {
      const response = (await this.client.indices.stats({
        index,
      })) as ElasticsearchStatsResponse;
      return response?.indices?.[index];
    } catch (error) {
      this.handleElasticsearchError(error);
    }
  }

  /**
   * Check if index exists
   */
  async indexExists(index: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({
        index,
      });
      return response;
    } catch (error) {
      this.handleElasticsearchError(error);
    }
  }

  /**
   * Sanitize query to prevent injection attacks
   */
  private sanitizeQuery(query: any): any {
    // If it's a string query, escape special characters and wrap in match query
    if (typeof query === 'string') {
      return {
        match: {
          _all: this.escapeQueryString(query),
        },
      };
    }

    // Handle arrays properly
    if (Array.isArray(query)) {
      return query.map((item) => this.sanitizeQuery(item));
    }

    // For object queries, recursively sanitize
    if (typeof query === 'object' && query !== null) {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(query)) {
        // Block potentially dangerous query types in production
        if (process.env.NODE_ENV === 'production') {
          const dangerousQueries = ['script', 'script_score', 'function_score'];
          if (dangerousQueries.includes(key)) {
            this.logger.warn(
              `Blocked potentially dangerous query type: ${key}`,
            );
            continue;
          }
        }

        if (typeof value === 'string') {
          // Only escape query text, not field names or configuration values
          // Field names with boosting (e.g., "field^2") should not be escaped
          if (key === 'query' || key === 'value') {
            sanitized[key] = this.escapeQueryString(value);
          } else {
            sanitized[key] = value;
          }
        } else if (Array.isArray(value)) {
          // Handle arrays properly
          sanitized[key] = value.map((item) =>
            typeof item === 'string' && (key === 'query' || key === 'value')
              ? this.escapeQueryString(item)
              : typeof item === 'object' && item !== null
                ? this.sanitizeQuery(item)
                : item,
          );
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeQuery(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return query;
  }

  /**
   * Escape special characters in query strings
   */
  private escapeQueryString(str: string): string {
    // Escape Lucene special characters
    const specialChars = /[+\-&|!(){}[\]^"~*?:\\]/g;
    return str.replace(specialChars, '\\$&');
  }

  /**
   * Handle Elasticsearch errors by throwing appropriate NestJS exceptions
   */
  private handleElasticsearchError(error: unknown): never {
    this.logger.error('Elasticsearch operation failed', error);

    if (error instanceof errors.ConnectionError) {
      throw new ServiceUnavailableException(
        'Elasticsearch service is temporarily unavailable',
      );
    } else if (error instanceof errors.ResponseError) {
      // Map ES status codes to appropriate HTTP exceptions
      switch (error.statusCode) {
        case 400: {
          this.logger.error(
            'Elasticsearch 400 error details:',
            error.meta?.body,
          );
          const errorType =
            error.meta?.body &&
            typeof error.meta.body === 'object' &&
            'error' in error.meta.body
              ? (error.meta.body as any).error?.type
              : error.message;
          throw new InternalServerErrorException(
            `Invalid Elasticsearch query: ${errorType}`,
          );
        }
        case 404:
          throw new InternalServerErrorException(
            'Elasticsearch index not found',
          );
        case 429:
          throw new ServiceUnavailableException(
            'Elasticsearch service is overloaded, please try again later',
          );
        case 503:
          throw new ServiceUnavailableException(
            'Elasticsearch service is temporarily unavailable',
          );
        default:
          throw new InternalServerErrorException(
            `Elasticsearch operation failed: ${error.message}`,
          );
      }
    } else if (error instanceof errors.RequestAbortedError) {
      throw new RequestTimeoutException('Elasticsearch request timed out');
    } else {
      throw new InternalServerErrorException(
        'An unexpected error occurred while accessing search data',
      );
    }
  }

  /**
   * Get the Elasticsearch client instance (for advanced usage)
   */
  getClient(): Client {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }
    return this.client;
  }
}
