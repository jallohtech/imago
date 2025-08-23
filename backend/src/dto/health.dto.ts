import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// First, declare all the basic DTOs without dependencies

export class HeapMetricsDto {
  @ApiProperty({
    description: 'Used heap memory in bytes',
    example: 89478485,
  })
  used!: number;

  @ApiProperty({
    description: 'Total heap memory in bytes',
    example: 134217728,
  })
  total!: number;

  @ApiProperty({
    description: 'Heap usage percentage',
    example: 66.7,
  })
  percentage!: number;
}

export class CpuMetricsDto {
  @ApiProperty({
    description: 'CPU usage percentage',
    example: 23.5,
  })
  usage!: number;

  @ApiProperty({
    description: 'System load average (1 minute)',
    example: 0.45,
  })
  loadAverage!: number[];
}

export class GarbageCollectionMetricsDto {
  @ApiProperty({
    description: 'Number of GC cycles',
    example: 42,
  })
  collections!: number;

  @ApiProperty({
    description: 'Total time spent in GC (ms)',
    example: 123.45,
  })
  time!: number;
}

export class RequestMetricsDto {
  @ApiProperty({
    description: 'Total number of requests',
    example: 1024,
  })
  total!: number;

  @ApiProperty({
    description: 'Average response time in milliseconds',
    example: 45.6,
  })
  averageResponseTime!: number;

  @ApiProperty({
    description: 'Requests per second',
    example: 12.3,
  })
  requestsPerSecond!: number;
}

export class MemoryMetricsDto {
  @ApiProperty({
    description: 'Memory usage in bytes',
    example: 134217728,
  })
  used!: number;

  @ApiProperty({
    description: 'Total memory available in bytes',
    example: 2147483648,
  })
  total!: number;

  @ApiProperty({
    description: 'Memory usage percentage',
    example: 6.25,
  })
  percentage!: number;

  @ApiProperty({
    description: 'Heap usage details',
  })
  heap!: HeapMetricsDto;
}

export class PerformanceMetricsDto {
  @ApiProperty({
    description: 'Memory usage statistics',
  })
  memory!: MemoryMetricsDto;

  @ApiProperty({
    description: 'CPU usage statistics',
  })
  cpu!: CpuMetricsDto;

  @ApiProperty({
    description: 'Event loop lag in milliseconds',
    example: 1.23,
  })
  eventLoopLag!: number;

  @ApiProperty({
    description: 'Garbage collection metrics',
  })
  gc!: GarbageCollectionMetricsDto;

  @ApiPropertyOptional({
    description: 'Request metrics (if available)',
  })
  requests?: RequestMetricsDto;
}

export class ElasticsearchClusterDto {
  @ApiProperty({
    description: 'Cluster name',
    example: 'imago-search-cluster',
  })
  name!: string;

  @ApiProperty({
    description: 'Cluster health status',
    example: 'green',
    enum: ['green', 'yellow', 'red'],
  })
  health!: 'green' | 'yellow' | 'red';

  @ApiProperty({
    description: 'Number of nodes in the cluster',
    example: 3,
  })
  numberOfNodes!: number;

  @ApiProperty({
    description: 'Number of data nodes',
    example: 3,
  })
  numberOfDataNodes!: number;

  @ApiProperty({
    description: 'Active primary shards',
    example: 5,
  })
  activePrimaryShards!: number;

  @ApiProperty({
    description: 'Active shards',
    example: 10,
  })
  activeShards!: number;

  @ApiProperty({
    description: 'Elasticsearch version',
    example: '8.11.0',
  })
  version!: string;
}

export class ElasticsearchHealthDto {
  @ApiProperty({
    description: 'Elasticsearch connection status',
    example: 'connected',
    enum: ['connected', 'disconnected', 'error'],
  })
  status!: 'connected' | 'disconnected' | 'error';

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 45,
  })
  responseTime!: number;

  @ApiProperty({
    description: 'Cluster information',
  })
  cluster!: ElasticsearchClusterDto;

  @ApiPropertyOptional({
    description: 'Error message if connection failed',
    example: 'Connection timeout',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Last successful connection timestamp',
    example: '2023-12-25T10:29:00.000Z',
  })
  lastConnected?: string;
}

export class DatabaseHealthDto {
  @ApiProperty({
    description: 'Database connection status',
    example: 'connected',
    enum: ['connected', 'disconnected', 'error'],
  })
  status!: 'connected' | 'disconnected' | 'error';

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 12,
  })
  responseTime!: number;

  @ApiPropertyOptional({
    description: 'Error message if connection failed',
    example: 'Connection refused',
  })
  error?: string;
}

export class ExternalServiceHealthDto {
  @ApiProperty({
    description: 'Service status',
    example: 'ok',
    enum: ['ok', 'degraded', 'down'],
  })
  status!: 'ok' | 'degraded' | 'down';

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 234,
  })
  responseTime!: number;

  @ApiPropertyOptional({
    description: 'Error message if service is down',
    example: 'Service temporarily unavailable',
  })
  error?: string;
}

export class ServiceHealthDto {
  @ApiProperty({
    description: 'Elasticsearch service health',
  })
  elasticsearch!: ElasticsearchHealthDto;

  @ApiPropertyOptional({
    description: 'Database service health (if applicable)',
  })
  database?: DatabaseHealthDto;

  @ApiPropertyOptional({
    description: 'External services health',
    additionalProperties: { type: 'object' },
  })
  external?: Record<string, ExternalServiceHealthDto>;
}

export class HealthCheckDto {
  @ApiProperty({
    description: 'Overall health status',
    example: 'ok',
    enum: ['ok', 'warning', 'error'],
  })
  status!: 'ok' | 'warning' | 'error';

  @ApiProperty({
    description: 'Current timestamp',
    example: '2023-12-25T10:30:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Application uptime in seconds',
    example: 12345.67,
  })
  uptime!: number;

  @ApiProperty({
    description: 'Application version',
    example: '1.0.0',
  })
  version!: string;

  @ApiProperty({
    description: 'Environment name',
    example: 'production',
  })
  environment!: string;

  @ApiProperty({
    description: 'Service checks results',
  })
  services!: ServiceHealthDto;

  @ApiProperty({
    description: 'Performance metrics',
  })
  metrics!: PerformanceMetricsDto;

  @ApiPropertyOptional({
    description: 'Additional health information',
    additionalProperties: true,
  })
  details?: Record<string, any>;
}
