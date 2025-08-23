/**
 * TypeScript interfaces for Elasticsearch configurations and responses
 */
// Elasticsearch Configuration Types
export interface ElasticsearchConfig {
  node: string;
  maxRetries: number;
  requestTimeout: number;
  sniffOnStart: boolean;
  sniffInterval: number;
  sniffOnConnectionFault: boolean;
  resurrectStrategy: 'ping' | 'optimistic' | 'none';
  compression: boolean;
  auth: {
    apiKey?: string;
    username?: string;
    password?: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
    ca?: string;
  };
  pool?: {
    sniffInterval: number;
  };
}

// Elasticsearch Client Configuration
export interface ElasticsearchClientConfig {
  node: string;
  maxRetries: number;
  requestTimeout: number;
  sniffOnStart: boolean;
  sniffInterval: number;
  sniffOnConnectionFault: boolean;
  resurrectStrategy: 'ping' | 'optimistic' | 'none';
  compression: boolean;
  auth?:
    | {
        apiKey: string;
      }
    | {
        username: string;
        password: string;
      };
  tls?: {
    rejectUnauthorized: boolean;
    ca?: Buffer;
  };
}

// Elasticsearch Query Types
export interface ElasticsearchQuery {
  [key: string]: unknown;
}

// Search Parameters
export interface SearchParams {
  index: string;
  query?: ElasticsearchQuery;
  size?: number;
  from?: number;
  sort?: Array<Record<string, { order: 'asc' | 'desc' }> | string>;
  source?: string[] | boolean;
  highlight?: HighlightConfig;
  aggregations?: AggregationsConfig;
}

// Internal Search Parameters (for ES client)
export interface InternalSearchParams {
  index: string;
  size: number;
  from: number;
  query?: ElasticsearchQuery;
  sort?: Array<Record<string, { order: 'asc' | 'desc' }> | string>;
  _source?: string[] | boolean;
  highlight?: HighlightConfig;
  aggs?: unknown;
}

// Highlight Configuration
export interface HighlightConfig {
  fields: {
    [field: string]: Record<string, unknown>;
  };
  pre_tags?: string[];
  post_tags?: string[];
  fragment_size?: number;
  number_of_fragments?: number;
}

// Aggregations Configuration
export interface AggregationsConfig {
  [key: string]: {
    terms?: {
      field: string;
      size?: number;
    };
    range?: {
      field: string;
      ranges: Array<{
        from?: number;
        to?: number;
        key?: string;
      }>;
    };
    date_range?: {
      field: string;
      ranges: Array<{
        from?: string;
        to?: string;
        key?: string;
      }>;
    };
    date_histogram?: {
      field: string;
      calendar_interval?: string;
      fixed_interval?: string;
      interval?: string;
      format?: string;
    };
    stats?: {
      field: string;
    };
    nested?: {
      path: string;
      aggs?: unknown;
    };
  };
}

// Elasticsearch Response Types
export interface ElasticsearchHit {
  _index: string;
  _id: string;
  _score: number;
  _source: Record<string, unknown>;
  highlight?: {
    [field: string]: string[];
  };
}

export interface ElasticsearchTotal {
  value: number;
  relation: 'eq' | 'gte';
}

export interface ElasticsearchHits {
  total: ElasticsearchTotal;
  max_score: number | null;
  hits: ElasticsearchHit[];
}

// Aggregation Bucket
export interface AggregationBucket {
  key: string | number;
  doc_count: number;
  [key: string]: unknown; // For nested aggregations
}

// Aggregation Response
export interface AggregationResponse {
  doc_count_error_upper_bound?: number;
  sum_other_doc_count?: number;
  buckets: AggregationBucket[];
}

// Generic Aggregations Response
export interface AggregationsResponse {
  [key: string]:
    | AggregationResponse
    | AggregationBucket[]
    | Record<string, unknown>;
}

// Search Response
export interface ElasticsearchSearchResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: ElasticsearchHits;
  aggregations?: AggregationsResponse;
}

// Search Result (simplified for our API)
export interface SearchResult {
  total: ElasticsearchTotal;
  hits: ElasticsearchHit[];
  aggregations?: AggregationsResponse;
  took: number;
}

// Get Response
export interface ElasticsearchGetResponse {
  _index: string;
  _id: string;
  _version: number;
  _seq_no: number;
  _primary_term: number;
  found: boolean;
  _source?: Record<string, unknown>;
}

// Multi-get Response
export interface ElasticsearchMgetResponse {
  docs: Array<
    ElasticsearchGetResponse | { found: false; _index: string; _id: string }
  >;
}

// Count Response
export interface ElasticsearchCountResponse {
  count: number;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
}

// Index Mapping Response
export interface ElasticsearchMappingResponse {
  [index: string]: {
    mappings: {
      properties: {
        [field: string]: {
          type: string;
          [key: string]: unknown;
        };
      };
    };
  };
}

// Index Stats Response
export interface ElasticsearchStatsResponse {
  indices?: {
    [index: string]: {
      total: {
        docs: {
          count: number;
          deleted: number;
        };
        store: {
          size_in_bytes: number;
        };
      };
    };
  };
}

// Cluster Info Response
export interface ElasticsearchInfoResponse {
  cluster_name: string;
  cluster_uuid: string;
  name: string;
  version: {
    number: string;
    build_flavor: string;
    build_type: string;
    build_hash: string;
    build_date: string;
    build_snapshot: boolean;
    lucene_version: string;
    minimum_wire_compatibility_version: string;
    minimum_index_compatibility_version: string;
  };
  tagline: string;
}

// Cluster Health Response
export interface ElasticsearchHealthResponse {
  cluster_name: string;
  status: 'green' | 'yellow' | 'red';
  timed_out: boolean;
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
  delayed_unassigned_shards: number;
  number_of_pending_tasks: number;
  number_of_in_flight_fetch: number;
  task_max_waiting_in_queue_millis: number;
  active_shards_percent_as_number: number;
}

// Index Exists Response
export type ElasticsearchIndexExistsResponse = boolean;

// Basic Parameter Types
export interface GetParams {
  index: string;
  id: string;
  _source?: string[] | boolean;
}

export interface MgetParams {
  index: string;
  docs: Array<{
    _id: string;
    _index?: string;
  }>;
  _source?: string[] | boolean;
}

export interface CountParams {
  index: string;
  query?: ElasticsearchQuery;
}

export interface AggregateParams {
  index: string;
  size: number;
  aggs: unknown;
  query?: ElasticsearchQuery;
}
