import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaItemDto } from './media-item.dto';

export class SearchMetadataDto {
  @ApiProperty({
    description: 'Total number of results found',
    example: 1543,
  })
  total!: number;

  @ApiProperty({
    description: 'Number of results returned in this response',
    example: 20,
  })
  count!: number;

  @ApiProperty({
    description: 'Current page offset',
    example: 0,
  })
  from!: number;

  @ApiProperty({
    description: 'Page size used for this request',
    example: 20,
  })
  size!: number;

  @ApiProperty({
    description: 'Time taken to execute the search (in milliseconds)',
    example: 45,
  })
  took!: number;

  @ApiProperty({
    description: 'Whether there are more results available',
    example: true,
  })
  hasMore!: boolean;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 78,
  })
  totalPages!: number;
}

export class SearchFacetValueDto {
  @ApiProperty({
    description: 'Facet value',
    example: 'ABACAPRESS',
  })
  value!: string;

  @ApiProperty({
    description: 'Number of documents with this value',
    example: 256,
  })
  count!: number;
}

export class SearchFacetDto {
  @ApiProperty({
    description: 'Facet name',
    example: 'photographers',
  })
  name!: string;

  @ApiProperty({
    description: 'Facet values with counts',
    type: [SearchFacetValueDto],
  })
  values!: SearchFacetValueDto[];
}

export class SearchStatsDto {
  @ApiPropertyOptional({
    description: 'Statistics for image dimensions',
    example: {
      width: { min: 640, max: 7680, avg: 2048 },
      height: { min: 480, max: 4320, avg: 1365 },
    },
  })
  dimensions?: {
    width: { min: number; max: number; avg: number };
    height: { min: number; max: number; avg: number };
  };

  @ApiPropertyOptional({
    description: 'Date range statistics',
    example: {
      earliest: '2020-01-01T00:00:00.000Z',
      latest: '2023-12-31T23:59:59.999Z',
    },
  })
  dateRange?: {
    earliest: string;
    latest: string;
  };

  @ApiPropertyOptional({
    description: 'Quality indicators for the search results',
    example: {
      withTitle: 85,
      withDescription: 92,
      withCleanText: 100,
    },
  })
  quality?: {
    withTitle: number;
    withDescription: number;
    withCleanText: number;
  };
}

export class SearchResponseDto {
  @ApiProperty({
    description: 'Array of media items matching the search criteria',
    type: [MediaItemDto],
  })
  results!: MediaItemDto[];

  @ApiProperty({
    description: 'Search metadata and pagination information',
    type: SearchMetadataDto,
  })
  metadata!: SearchMetadataDto;

  @ApiPropertyOptional({
    description: 'Search facets for filtering',
    type: [SearchFacetDto],
  })
  facets?: SearchFacetDto[];

  @ApiPropertyOptional({
    description: 'Search result statistics',
    type: SearchStatsDto,
  })
  stats?: SearchStatsDto;

  @ApiPropertyOptional({
    description: 'Search suggestions for query correction or enhancement',
    example: ['mountain landscape', 'nature photography', 'sunset scenery'],
  })
  suggestions?: string[];

  @ApiProperty({
    description: 'Indicates if the search was successful',
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Error message if the search failed',
    example: 'Search query could not be processed',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Warnings about data quality or search limitations',
    example: [
      'Some results may have missing titles',
      'Character encoding issues detected',
    ],
  })
  warnings?: string[];
}
