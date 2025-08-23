import {
  Controller,
  Get,
  Query,
  Param,
  BadRequestException,
  NotFoundException,
  HttpStatus,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchResponseDto, MediaItemDto } from '../../dto';

@ApiTags('Search')
@Controller('api/search')
@UseInterceptors(CacheInterceptor)
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search media items',
    description: `
      Perform a comprehensive search across IMAGO's media collection.
      Supports keyword-based search, filtering, sorting, and pagination.
      
      **Key Features:**
      - Full-text search across titles, descriptions, and metadata
      - Advanced filtering by photographer, date range, dimensions, and database type
      - Flexible sorting options including relevance, date, and dimensions
      - Pagination support for large result sets
      - Search result highlighting for better user experience
      - Faceted search results for improved filtering
      - Data quality warnings and automatic text cleaning
      - Fallback title/description generation for missing fields
      
      **Data Quality Handling:**
      - Automatically fixes character encoding issues (? � ')
      - Generates titles from search text when missing
      - Creates descriptions from available metadata
      - Detects and reports data quality issues
      
      **Performance Notes:**
      - Results are cached for improved performance
      - Maximum 100 results per page to prevent performance issues
      - Search suggestions provided for queries with few results
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search completed successfully',
    type: SearchResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid search parameters provided',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error during search',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  @CacheTTL(30000) // Cache for 30 seconds
  async search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
    this.logger.log(`Search request: ${JSON.stringify(query)}`);

    // Validate query parameters
    this.validateSearchQuery(query);

    // Perform search
    const result = await this.searchService.search(query);

    // Log search statistics
    this.logger.log(
      `Search completed: ${result.metadata.total} total results, ${result.metadata.count} returned, took ${result.metadata.took}ms`,
    );

    // Log warnings if any
    if (result.warnings && result.warnings.length > 0) {
      this.logger.warn(`Search warnings: ${result.warnings.join(', ')}`);
    }

    return result;
  }

  @Get('media/:id')
  @ApiOperation({
    summary: 'Get specific media item by ID',
    description: `
      Retrieve detailed information about a specific media item.
      
      **Returns:**
      - Complete media metadata including dimensions, photographer, and date
      - Generated title and description with fallbacks for missing data
      - Properly constructed image URLs following IMAGO's URL structure
      - Cleaned text with encoding issues fixed
      - Language detection and orientation information
      
      **URL Structure:**
      Images are accessible at: \`https://www.imago-images.de/bild/{db}/{bildnummer}/s.jpg\`
      where \`bildnummer\` is zero-padded to 10 characters.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the media item',
    example: '258999077',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Media item found and returned successfully',
    type: MediaItemDto,
  })
  @ApiNotFoundResponse({
    description: 'Media item not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Media item not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @CacheTTL(300000) // Cache for 5 minutes
  async getMediaItem(@Param('id') id: string): Promise<MediaItemDto> {
    try {
      this.logger.log(`Get media item request: ${id}`);

      // Validate ID format
      if (!id || id.trim().length === 0) {
        throw new BadRequestException('Media item ID is required');
      }

      const mediaItem = await this.searchService.getMediaItem(id);

      if (!mediaItem) {
        throw new NotFoundException(`Media item with ID '${id}' not found`);
      }

      this.logger.log(`Media item retrieved: ${mediaItem.bildnummer}`);
      return mediaItem;
    } catch (error) {
      this.logger.error(`Failed to get media item ${id}`, error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new NotFoundException(`Media item with ID '${id}' not found`);
    }
  }

  @Get('fields')
  @ApiOperation({
    summary: 'Get available searchable fields',
    description: `
      Retrieve information about available searchable fields and index statistics.
      
      **Returns:**
      - Field mappings from Elasticsearch
      - Index statistics including document count and size
      - List of searchable fields with their priorities
      - Data quality metrics
      
      **Searchable Fields:**
      - \`suchtext\`: Main search text (highest priority)
      - \`title\`: Image titles (high priority, often missing)
      - \`description\`: Image descriptions (medium priority, often missing)  
      - \`fotografen\`: Photographer/agency names (low priority)
      - \`datum\`: Creation/upload dates
      - \`bildnummer\`: Unique image identifiers
      
      This endpoint is useful for building dynamic search interfaces
      and understanding the available data structure.
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Field information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        mapping: {
          type: 'object',
          description: 'Elasticsearch field mappings',
        },
        stats: {
          type: 'object',
          properties: {
            totalDocuments: { type: 'number', example: 1000003 },
            totalSize: { type: 'number', example: 52428800 },
            deleted: { type: 'number', example: 18 },
          },
        },
        searchableFields: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'suchtext',
            'fotografen',
            'datum',
            'bildnummer',
            'title',
            'description',
          ],
        },
      },
    },
  })
  @CacheTTL(3600000) // Cache for 1 hour
  async getSearchableFields(): Promise<any> {
    try {
      this.logger.log('Get searchable fields request');

      const fieldsInfo = await this.searchService.getSearchableFields();

      this.logger.log(
        `Searchable fields retrieved: ${fieldsInfo.searchableFields.length} fields available`,
      );
      return fieldsInfo;
    } catch (error) {
      this.logger.error('Failed to get searchable fields', error);
      throw error;
    }
  }

  /**
   * Validate search query parameters
   */
  private validateSearchQuery(query: SearchQueryDto): void {
    // Validate date range
    if (query.dateFrom && query.dateTo) {
      const fromDate = new Date(query.dateFrom);
      const toDate = new Date(query.dateTo);

      if (fromDate > toDate) {
        throw new BadRequestException('dateFrom must be earlier than dateTo');
      }
    }

    // Validate dimension ranges
    if (query.minWidth && query.maxWidth && query.minWidth > query.maxWidth) {
      throw new BadRequestException(
        'minWidth must be less than or equal to maxWidth',
      );
    }

    if (
      query.minHeight &&
      query.maxHeight &&
      query.minHeight > query.maxHeight
    ) {
      throw new BadRequestException(
        'minHeight must be less than or equal to maxHeight',
      );
    }

    // Validate pagination
    if (query.from && query.from < 0) {
      throw new BadRequestException('from parameter must be non-negative');
    }

    if (query.size && (query.size < 1 || query.size > 100)) {
      throw new BadRequestException('size parameter must be between 1 and 100');
    }

    // Validate search query length
    if (query.q && query.q.length > 500) {
      throw new BadRequestException(
        'Search query is too long (maximum 500 characters)',
      );
    }

    // Validate database type
    if (query.db && !['st', 'sp'].includes(query.db)) {
      throw new BadRequestException(
        'db parameter must be either "st" (stock) or "sp" (sport)',
      );
    }

    // Validate image IDs
    if (query.imageIds && query.imageIds.length > 50) {
      throw new BadRequestException('Too many image IDs (maximum 50)');
    }

    if (query.imageIds) {
      const invalidIds = query.imageIds.filter((id) => !/^\d+$/.test(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Invalid image IDs: ${invalidIds.join(', ')} (must be numeric)`,
        );
      }
    }
  }
}
