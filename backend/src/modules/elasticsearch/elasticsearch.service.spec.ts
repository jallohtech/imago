import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from './elasticsearch.service';
import { Client, errors } from '@elastic/elasticsearch';
import {
  InternalServerErrorException,
  ServiceUnavailableException,
  RequestTimeoutException,
} from '@nestjs/common';

// Mock the Elasticsearch client
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    cluster: {
      health: jest.fn(),
    },
    ping: jest.fn(),
    close: jest.fn(),
    search: jest.fn(),
    get: jest.fn(),
    mget: jest.fn(),
    count: jest.fn(),
    indices: {
      getMapping: jest.fn(),
      stats: jest.fn(),
      exists: jest.fn(),
    },
  })),
  errors: {
    ConnectionError: class ConnectionError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ConnectionError';
      }
    },
    ResponseError: class ResponseError extends Error {
      statusCode: number;
      constructor(message: string, statusCode: number = 500) {
        super(message);
        this.name = 'ResponseError';
        this.statusCode = statusCode;
      }
    },
    RequestAbortedError: class RequestAbortedError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'RequestAbortedError';
      }
    },
  },
}));

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  let mockClient: any;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig = {
    node: 'https://localhost:9200',
    maxRetries: 3,
    requestTimeout: 30000,
    sniffOnStart: false,
    sniffInterval: 60000,
    sniffOnConnectionFault: false,
    resurrectStrategy: 'ping',
    compression: 'gzip',
    auth: {
      username: 'elastic',
      password: 'password',
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'elasticsearch') return mockConfig;
              if (key === 'elasticsearch.pool.sniffInterval') return 60000;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ElasticsearchService>(ElasticsearchService);
    configService = module.get(ConfigService);

    // Get the mocked client instance
    mockClient = (service as any).client = new Client({} as any);

    // Mock successful initialization responses
    mockClient.info.mockResolvedValue({
      name: 'test-node',
      cluster_name: 'test-cluster',
      cluster_uuid: 'test-uuid',
      version: {
        number: '8.0.0',
        build_date: '2023-01-01T00:00:00.000Z',
        build_flavor: 'default',
        build_hash: 'test-hash',
        build_snapshot: false,
        build_type: 'docker',
        lucene_version: '9.0.0',
        minimum_index_compatibility_version: '7.0.0',
        minimum_wire_compatibility_version: '7.0.0',
      },
      tagline: 'You Know, for Search',
    } as any);

    mockClient.cluster.health.mockResolvedValue({
      cluster_name: 'test-cluster',
      status: 'green',
      timed_out: false,
      number_of_nodes: 1,
      number_of_data_nodes: 1,
      active_primary_shards: 5,
      active_shards: 10,
      relocating_shards: 0,
      initializing_shards: 0,
      unassigned_shards: 0,
      delayed_unassigned_shards: 0,
      number_of_pending_tasks: 0,
      number_of_in_flight_fetch: 0,
      task_max_waiting_in_queue_millis: 0,
      active_shards_percent_as_number: 100,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear any intervals that might have been set
    if ((service as any).healthCheckInterval) {
      clearInterval((service as any).healthCheckInterval);
    }
  });

  describe('handleElasticsearchError', () => {
    it('should throw ServiceUnavailableException for ConnectionError', () => {
      const connectionError = new errors.ConnectionError('Connection failed');

      expect(() => {
        (service as any).handleElasticsearchError(connectionError);
      }).toThrow(ServiceUnavailableException);

      expect(() => {
        (service as any).handleElasticsearchError(connectionError);
      }).toThrow('Elasticsearch service is temporarily unavailable');
    });

    it('should throw appropriate exceptions for ResponseError status codes', () => {
      // Test 400 Bad Request
      const badRequestError = new errors.ResponseError({
        body: { error: 'Bad request' },
        statusCode: 400,
      } as any);
      expect(() => {
        (service as any).handleElasticsearchError(badRequestError);
      }).toThrow(InternalServerErrorException);
      expect(() => {
        (service as any).handleElasticsearchError(badRequestError);
      }).toThrow('Invalid Elasticsearch query');

      // Test 404 Not Found
      const notFoundError = new errors.ResponseError({
        body: { error: 'Not found' },
        statusCode: 404,
      } as any);
      expect(() => {
        (service as any).handleElasticsearchError(notFoundError);
      }).toThrow(InternalServerErrorException);
      expect(() => {
        (service as any).handleElasticsearchError(notFoundError);
      }).toThrow('Elasticsearch index not found');

      // Test 429 Too Many Requests
      const rateLimitError = new errors.ResponseError({
        body: { error: 'Rate limit' },
        statusCode: 429,
      } as any);
      expect(() => {
        (service as any).handleElasticsearchError(rateLimitError);
      }).toThrow(ServiceUnavailableException);
      expect(() => {
        (service as any).handleElasticsearchError(rateLimitError);
      }).toThrow('Elasticsearch service is overloaded');

      // Test 503 Service Unavailable
      const serviceError = new errors.ResponseError({
        body: { error: 'Service unavailable' },
        statusCode: 503,
      } as any);
      expect(() => {
        (service as any).handleElasticsearchError(serviceError);
      }).toThrow(ServiceUnavailableException);
      expect(() => {
        (service as any).handleElasticsearchError(serviceError);
      }).toThrow('Elasticsearch service is temporarily unavailable');
    });

    it('should throw RequestTimeoutException for RequestAbortedError', () => {
      const timeoutError = new errors.RequestAbortedError('Request timeout');

      expect(() => {
        (service as any).handleElasticsearchError(timeoutError);
      }).toThrow(RequestTimeoutException);

      expect(() => {
        (service as any).handleElasticsearchError(timeoutError);
      }).toThrow('Elasticsearch request timed out');
    });

    it('should throw InternalServerErrorException for unknown errors', () => {
      const unknownError = new Error('Unknown error');

      expect(() => {
        (service as any).handleElasticsearchError(unknownError);
      }).toThrow(InternalServerErrorException);

      expect(() => {
        (service as any).handleElasticsearchError(unknownError);
      }).toThrow('An unexpected error occurred while accessing search data');
    });
  });

  describe('sanitizeQuery', () => {
    it('should convert string queries to match_all', () => {
      const stringQuery = 'dangerous string query';

      const result = (service as any).sanitizeQuery(stringQuery);

      expect(result).toEqual({ match_all: {} });
    });

    it('should block dangerous query types in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const dangerousQuery = {
        script: { source: 'malicious script' },
        match: { field: 'value' },
      };

      const result = (service as any).sanitizeQuery(dangerousQuery);

      expect(result).toEqual({ match: { field: 'value' } });
      expect(result).not.toHaveProperty('script');

      process.env.NODE_ENV = originalEnv;
    });

    it('should escape special characters in string values', () => {
      const queryWithSpecialChars = {
        match: { field: 'test+value-with&special|chars' },
      };

      const result = (service as any).sanitizeQuery(queryWithSpecialChars);

      expect(result.match.field).toBe('test\\+value\\-with\\&special\\|chars');
    });

    it('should recursively sanitize nested objects', () => {
      const nestedQuery = {
        bool: {
          must: {
            match: { field: 'value+with-special&chars' },
          },
          should: [{ term: { category: 'test+category' } }],
        },
      };

      const result = (service as any).sanitizeQuery(nestedQuery);

      expect(result.bool.must.match.field).toBe(
        'value\\+with\\-special\\&chars',
      );
      expect(result.bool.should[0].term.category).toBe('test\\+category');
    });

    it('should preserve non-string values unchanged', () => {
      const queryWithMixedTypes = {
        range: { price: { gte: 100, lte: 500 } },
        term: { active: true },
        terms: { tags: ['tag1', 'tag2'] },
      };

      const result = (service as any).sanitizeQuery(queryWithMixedTypes);

      expect(result.range.price.gte).toBe(100);
      expect(result.range.price.lte).toBe(500);
      expect(result.term.active).toBe(true);
      expect(result.terms.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('search', () => {
    it('should execute search and return formatted results', async () => {
      const mockSearchResponse = {
        hits: {
          total: { value: 100 },
          hits: [
            { _id: '1', _score: 1.5, _source: { title: 'Test' } },
            { _id: '2', _score: 1.2, _source: { title: 'Test 2' } },
          ],
        },
        took: 45,
        aggregations: {
          categories: {
            buckets: [{ key: 'nature', doc_count: 50 }],
          },
        },
      };

      mockClient.search.mockResolvedValue({
        ...mockSearchResponse,
        timed_out: false,
        _shards: {
          total: 5,
          successful: 5,
          skipped: 0,
          failed: 0,
        },
      } as any);

      const searchParams = {
        index: 'test-index',
        query: { match: { title: 'test' } },
        size: 20,
        from: 0,
      };

      const result = await service.search(searchParams);

      expect(result).toEqual({
        total: { value: 100 },
        hits: mockSearchResponse.hits.hits,
        aggregations: mockSearchResponse.aggregations,
        took: 45,
      });

      expect(mockClient.search).toHaveBeenCalledWith({
        index: 'test-index',
        query: expect.objectContaining({
          match: { title: 'test' },
        }),
        size: 20,
        from: 0,
      });
    });

    it('should handle search errors by calling error handler', async () => {
      const searchError = new errors.ConnectionError('Search failed');
      mockClient.search.mockRejectedValue(searchError);

      const searchParams = {
        index: 'test-index',
        query: { match_all: {} },
      };

      await expect(service.search(searchParams)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('get', () => {
    it('should return document when found', async () => {
      const mockDoc = {
        _id: 'test-id',
        _source: { title: 'Test Document' },
        found: true,
      };

      mockClient.get.mockResolvedValue({
        ...mockDoc,
        _index: 'test-index',
        _type: '_doc',
        _version: 1,
        _seq_no: 0,
        _primary_term: 1,
      } as any);

      const result = await service.get('test-index', 'test-id');

      expect(result).toEqual(mockDoc);
      expect(mockClient.get).toHaveBeenCalledWith({
        index: 'test-index',
        id: 'test-id',
      });
    });

    it('should return null when document not found (404)', async () => {
      const notFoundError = new errors.ResponseError({
        body: { error: 'Not found' },
        statusCode: 404,
      } as any);
      mockClient.get.mockRejectedValue(notFoundError);

      const result = await service.get('test-index', 'nonexistent-id');

      expect(result).toBeNull();
    });

    it('should handle non-404 errors by calling error handler', async () => {
      const serverError = new errors.ResponseError({
        body: { error: 'Server error' },
        statusCode: 500,
      } as any);
      mockClient.get.mockRejectedValue(serverError);

      await expect(service.get('test-index', 'test-id')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('indexExists', () => {
    it('should return true when index exists', async () => {
      mockClient.indices.exists.mockResolvedValue({ body: true } as any);

      const result = await service.indexExists('existing-index');

      expect(result).toBe(true);
      expect(mockClient.indices.exists).toHaveBeenCalledWith({
        index: 'existing-index',
      });
    });

    it('should return false when index does not exist', async () => {
      mockClient.indices.exists.mockResolvedValue({ body: false } as any);

      const result = await service.indexExists('nonexistent-index');

      expect(result).toBe(false);
    });

    it('should handle errors by calling error handler', async () => {
      const error = new errors.ConnectionError('Connection failed');
      mockClient.indices.exists.mockRejectedValue(error);

      await expect(service.indexExists('test-index')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
