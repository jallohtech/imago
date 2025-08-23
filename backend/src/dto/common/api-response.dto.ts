import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StandardResponseDto<T> {
  @ApiProperty({
    description: 'Indicates if the operation was successful',
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Response data when operation is successful',
  })
  data?: T;

  @ApiPropertyOptional({
    description: 'Error message when operation fails',
    example: 'Resource not found',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata about the response',
    example: {
      pagination: { page: 1, total: 100 },
      timing: { took: 45 },
    },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Response timestamp in ISO 8601 format',
    example: '2023-12-25T10:30:00.000Z',
  })
  timestamp!: string;
}

export class StandardErrorDto {
  @ApiProperty({
    description: 'Always false for error responses',
    example: false,
  })
  success!: false;

  @ApiProperty({
    description: 'Error message describing what went wrong',
    example: 'Resource not found',
  })
  error!: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 404,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error timestamp in ISO 8601 format',
    example: '2023-12-25T10:30:00.000Z',
  })
  timestamp!: string;

  @ApiPropertyOptional({
    description: 'Additional error details',
    example: {
      field: 'id',
      value: 'invalid-id',
      constraint: 'must be a valid number',
    },
  })
  details?: Record<string, any>;
}

export class PaginationMetadataDto {
  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  size!: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 1543,
  })
  total!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 78,
  })
  totalPages!: number;

  @ApiProperty({
    description: 'Whether there are more pages available',
    example: true,
  })
  hasMore!: boolean;
}

export class TimingMetadataDto {
  @ApiProperty({
    description: 'Time taken to process the request (in milliseconds)',
    example: 45,
  })
  took!: number;
}
