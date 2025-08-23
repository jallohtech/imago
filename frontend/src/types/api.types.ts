// API Response Types matching backend DTOs

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  timestamp: string;
  metadata?: {
    pagination?: PaginationMetadata;
    timing?: TimingMetadata;
    facets?: Record<string, FacetBucket[]>;
    suggestions?: string[];
    warnings?: string[];
  };
}

export interface PaginationMetadata {
  total: number;
  returned: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface TimingMetadata {
  took: number;
  clientIp?: string;
  userAgent?: string;
}

export interface FacetBucket {
  key: string;
  doc_count: number;
}

export interface MediaItem {
  id: string;
  bildnummer: string;
  title: string;
  description: string;
  searchText: string;
  photographer: string;
  date: string;
  width: number;
  height: number;
  database: string;
  imageUrl: string;
  thumbnailUrl: string;
  score?: number;
  highlights?: Record<string, string[]>;
  aspectRatio?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  language?: string;
  cleanedText?: string;
  fileSize?: number;
  lastModified?: string;
  mimeType?: string;
  imageValidation?: {
    isValid: boolean;
    statusCode: number;
    errors: string[];
  };
}

export interface SearchResponse {
  results: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, FacetBucket[]>;
  suggestions?: string[];
  warnings?: string[];
}

export interface SearchParams {
  q: string;
  size?: number;
  from?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  photographer?: string;
  database?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'relevance' | 'date' | 'width' | 'height';
  sortOrder?: 'asc' | 'desc';
  language?: string;
}

export interface SearchFieldsResponse {
  searchableFields: string[];
  stats: {
    totalDocuments: number;
    indexSize: string;
    fieldCoverage: Record<string, { present: number; missing: number; coverage: number }>;
  };
  facets?: Record<string, FacetBucket[]>;
  languages?: FacetBucket[];
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version?: string;
  environment?: string;
  issues?: string[];
}

export interface ImageValidationResult {
  isValid: boolean;
  statusCode: number;
  contentType?: string;
  contentLength?: number;
  lastModified?: string;
  errors?: string[];
}