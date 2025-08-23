import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import {
  SearchQueryDto,
  SearchResponseDto,
  MediaItemDto,
  SearchMetadataDto,
  SearchFacetDto,
  SearchStatsDto,
} from '../../dto';
import {
  ElasticsearchQuery,
  AggregationsConfig,
  AggregationsResponse,
  SearchResult,
  ElasticsearchHit,
} from '../../types/elasticsearch.types';

interface MediaSourceData {
  bildnummer: string;
  datum: string;
  suchtext: string;
  fotografen: string;
  hoehe: number;
  breite: number;
  db: string;
  title?: string;
  description?: string;
  bearbeitet_bild?: string;
}

interface MediaHit extends Omit<ElasticsearchHit, '_source'> {
  _source: MediaSourceData;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly baseImageUrl: string;
  private readonly imagoIndex: string;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    this.baseImageUrl = this.configService.get<string>(
      'app.baseImageUrl',
      'https://www.imago-images.de',
    );
    this.imagoIndex = this.configService.get<string>(
      'elasticsearch.index',
      'imago',
    );
  }

  /**
   * Perform a comprehensive search across the media collection
   */
  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const startTime = Date.now();

    // Build Elasticsearch query
    const esQuery = this.buildElasticsearchQuery(query);

    // Execute search with aggregations for facets and stats
    const [searchResponse, facetResponse] = await Promise.all([
      this.elasticsearchService.search({
        index: this.imagoIndex,
        query: esQuery.query,
        size: query.size,
        from: query.from,
        sort: this.buildSort(
          query.sortBy || '_score',
          query.sortOrder || 'desc',
        ),
        highlight: query.highlight ? this.buildHighlight() : undefined,
      }),
      this.getFacets(esQuery.query),
    ]);

    // Transform results
    const results = this.transformSearchResults(
      searchResponse.hits as unknown as MediaHit[],
      query.highlight,
    );

    // Build metadata
    const metadata = this.buildMetadata(
      searchResponse,
      query,
      Date.now() - startTime,
    );

    // Build stats from aggregations
    const stats = this.buildStats(facetResponse);

    // Get suggestions if no results or few results
    const totalResults =
      typeof searchResponse.total === 'object'
        ? searchResponse.total.value
        : searchResponse.total || 0;
    const suggestions = await this.getSuggestions(query, totalResults);

    // Detect data quality warnings
    const warnings = this.detectWarnings(results);

    return {
      results,
      metadata,
      facets: this.buildFacets(facetResponse),
      stats,
      suggestions,
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get a specific media item by ID
   */
  async getMediaItem(id: string): Promise<MediaItemDto | null> {
    const response = await this.elasticsearchService.get(this.imagoIndex, id);

    if (!response) {
      return null;
    }

    return this.transformMediaItem({
      _id: response._id || '',
      _score: 1,
      _source: response._source as unknown as MediaSourceData,
    } as MediaHit);
  }

  /**
   * Get available searchable fields and their statistics
   */
  async getSearchableFields(): Promise<{
    mapping: Record<string, unknown>;
    stats: {
      totalDocuments: number;
      totalSize: number;
      deleted: number;
    };
    searchableFields: string[];
  }> {
    const mapping = await this.elasticsearchService.getMapping(this.imagoIndex);
    const stats = await this.elasticsearchService.getIndexStats(
      this.imagoIndex,
    );

    return {
      mapping: mapping?.mappings?.properties || {},
      stats: {
        totalDocuments: stats?.total?.docs?.count || 0,
        totalSize: stats?.total?.store?.size_in_bytes || 0,
        deleted: stats?.total?.docs?.deleted || 0,
      },
      searchableFields: [
        'suchtext',
        'fotografen',
        'datum',
        'bildnummer',
        'title',
        'description',
      ],
    };
  }

  /**
   * Build Elasticsearch query from search parameters
   */
  private buildElasticsearchQuery(query: SearchQueryDto): {
    query: ElasticsearchQuery;
  } {
    const must: ElasticsearchQuery[] = [];
    const filter: ElasticsearchQuery[] = [];

    // Main text search
    if (query.q && query.q.trim()) {
      const searchText = this.sanitizeSearchText(query.q.trim());

      must.push({
        multi_match: {
          query: searchText,
          fields: [
            'suchtext^3', // Highest priority for main search text
            'title^2', // High priority for titles (when available)
            'description^1.5', // Medium priority for descriptions
            'fotografen^1', // Lower priority for photographer names
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'and',
          minimum_should_match: '75%',
        },
      });
    } else {
      // If no query, match all documents
      must.push({
        match_all: {},
      });
    }

    // Photographer filter
    if (query.photographer) {
      filter.push({
        term: {
          'fotografen.keyword': query.photographer,
        },
      });
    }

    // Date range filter
    if (query.dateFrom || query.dateTo) {
      const dateRange: Record<string, string> = {};

      if (query.dateFrom) {
        dateRange.gte = query.dateFrom;
      }

      if (query.dateTo) {
        dateRange.lte = query.dateTo;
      }

      filter.push({
        range: {
          datum: dateRange,
        },
      });
    }

    // Dimension filters
    if (query.minWidth || query.maxWidth) {
      const widthRange: Record<string, number> = {};

      if (query.minWidth) {
        widthRange.gte = query.minWidth;
      }

      if (query.maxWidth) {
        widthRange.lte = query.maxWidth;
      }

      filter.push({
        range: {
          breite: widthRange,
        },
      });
    }

    if (query.minHeight || query.maxHeight) {
      const heightRange: Record<string, number> = {};

      if (query.minHeight) {
        heightRange.gte = query.minHeight;
      }

      if (query.maxHeight) {
        heightRange.lte = query.maxHeight;
      }

      filter.push({
        range: {
          hoehe: heightRange,
        },
      });
    }

    // Database type filter
    if (query.db) {
      filter.push({
        term: {
          db: query.db,
        },
      });
    }

    // Specific image IDs filter
    if (query.imageIds && query.imageIds.length > 0) {
      filter.push({
        terms: {
          bildnummer: query.imageIds,
        },
      });
    }

    return {
      query: {
        bool: {
          must,
          filter,
        },
      },
    };
  }

  /**
   * Build sort configuration for Elasticsearch
   */
  private buildSort(
    sortBy: string,
    sortOrder: string,
  ): Array<Record<string, { order: 'asc' | 'desc' }> | string> {
    const sort: Array<Record<string, { order: 'asc' | 'desc' }> | string> = [];

    const order =
      sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'desc';

    switch (sortBy) {
      case '_score':
        sort.push({ _score: { order } });
        break;

      case 'datum':
        sort.push({ datum: { order } });
        break;

      case 'bildnummer':
        sort.push({ bildnummer: { order } });
        break;

      case 'breite':
        sort.push({ breite: { order } });
        break;

      case 'hoehe':
        sort.push({ hoehe: { order } });
        break;

      default:
        sort.push({ _score: { order: 'desc' } });
        break;
    }

    // Add a secondary sort by image number for consistent pagination
    if (sortBy !== 'bildnummer') {
      sort.push({ bildnummer: { order: 'asc' } });
    }

    return sort;
  }

  /**
   * Build highlight configuration for search result highlighting
   */
  private buildHighlight(): {
    fields: {
      [field: string]: {
        fragment_size: number;
        number_of_fragments: number;
        pre_tags: string[];
        post_tags: string[];
      };
    };
  } {
    return {
      fields: {
        suchtext: {
          fragment_size: 150,
          number_of_fragments: 3,
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
        },
        title: {
          fragment_size: 100,
          number_of_fragments: 1,
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
        },
        description: {
          fragment_size: 200,
          number_of_fragments: 2,
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
        },
      },
    };
  }

  /**
   * Transform Elasticsearch hits to MediaItemDto array
   */
  private transformSearchResults(
    hits: MediaHit[],
    includeHighlights: boolean = false,
  ): MediaItemDto[] {
    return hits.map((hit) => this.transformMediaItem(hit, includeHighlights));
  }

  /**
   * Transform a single Elasticsearch hit to MediaItemDto
   */
  private transformMediaItem(
    hit: MediaHit,
    includeHighlights: boolean = false,
  ): MediaItemDto {
    const source = hit._source;

    // Clean up text and fix encoding issues
    const cleanedText = this.cleanText(source.suchtext);

    // Generate title and description from suchtext if missing
    const title = this.generateTitle(source.title, cleanedText);
    const description = this.generateDescription(
      source.description,
      cleanedText,
    );

    // Build image URLs
    const imageUrl = this.buildImageUrl(source.db, source.bildnummer);

    // Calculate aspect ratio and orientation
    const aspectRatio = source.breite / source.hoehe;
    const orientation = this.determineOrientation(aspectRatio);

    // Detect language
    const language = this.detectLanguage(cleanedText);

    const mediaItem: MediaItemDto = {
      id: hit._id,
      bildnummer: source.bildnummer,
      title,
      description,
      searchText: source.suchtext,
      photographer: source.fotografen,
      date: source.datum,
      width: source.breite,
      height: source.hoehe,
      database: source.db,
      imageUrl,
      thumbnailUrl: imageUrl, // Same URL for now, could be different size
      score: hit._score,
      aspectRatio,
      orientation,
      language,
      cleanedText,
    };

    // Add highlights if requested and available
    if (includeHighlights && hit.highlight) {
      mediaItem.highlights = hit.highlight;
    }

    return mediaItem;
  }

  /**
   * Build image URL according to IMAGO's URL structure
   */
  private buildImageUrl(db: string, bildnummer: string): string {
    // Ensure bildnummer is 10 characters, zero-padded if shorter
    const paddedId = bildnummer.padStart(10, '0');

    return `${this.baseImageUrl}/bild/${db}/${paddedId}/s.jpg`;
  }

  /**
   * Clean text by fixing common encoding issues
   */
  private cleanText(text: string): string {
    if (!text) return '';

    return (
      text
        // Fix common encoding issues
        .replace(/\?/g, "'") // Question marks are likely apostrophes
        .replace(/�"/g, "'") // UTF-8 encoding issues
        .replace(/�S/g, '"')
        .replace(/�/g, '"')
        .replace(/⬦/g, '...')
        // Remove redundant copyright notices
        .replace(/�.*?(ABACAPRESS|IMAGO|Getty Images)/gi, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Generate a title from available data
   */
  private generateTitle(
    existingTitle: string | undefined,
    cleanedText: string,
  ): string {
    if (existingTitle && existingTitle.trim()) {
      return this.cleanText(existingTitle);
    }

    // Extract the first meaningful phrase from search text
    const words = cleanedText.split(' ').filter((word) => word.length > 2);
    const titleWords = words.slice(0, 6); // Take the first 6 meaningful words

    let title = titleWords.join(' ');

    // Capitalize the first letter
    if (title) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return title || 'Untitled Image';
  }

  /**
   * Generate a description from available data
   */
  private generateDescription(
    existingDescription: string | undefined,
    cleanedText: string,
  ): string {
    if (existingDescription && existingDescription.trim()) {
      return this.cleanText(existingDescription);
    }

    // Create a description from search text, limiting to a reasonable length
    const description =
      cleanedText.length > 200
        ? cleanedText.substring(0, 200) + '...'
        : cleanedText;

    return description || 'No description available';
  }

  /**
   * Determine image orientation based on an aspect ratio
   */
  private determineOrientation(
    aspectRatio: number,
  ): 'landscape' | 'portrait' | 'square' {
    if (Math.abs(aspectRatio - 1) < 0.1) {
      return 'square';
    } else if (aspectRatio > 1) {
      return 'landscape';
    } else {
      return 'portrait';
    }
  }

  /**
   * Detect primary language of text content
   */
  private detectLanguage(text: string): string {
    if (!text) return 'unknown';

    // Simple language detection based on common words
    const germanWords =
      /\b(und|der|die|das|ein|eine|mit|von|zu|auf|ist|sind|haben|werden|oder|aber)\b/gi;
    const englishWords =
      /\b(and|the|of|a|an|with|from|to|on|is|are|have|will|or|but)\b/gi;

    const germanMatches = (text.match(germanWords) || []).length;
    const englishMatches = (text.match(englishWords) || []).length;

    if (germanMatches > englishMatches * 1.5) {
      return 'de';
    } else if (englishMatches > germanMatches * 1.5) {
      return 'en';
    } else {
      return 'mixed';
    }
  }

  /**
   * Sanitize search text to prevent injection attacks
   */
  private sanitizeSearchText(text: string): string {
    // Remove potentially dangerous characters while preserving search functionality
    return text
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/[{}[\]]/g, '') // Remove JSON characters
      .replace(/[()]/g, '') // Remove parentheses that could affect the query structure
      .trim();
  }

  /**
   * Build metadata for search response
   */
  private buildMetadata(
    searchResponse: SearchResult,
    query: SearchQueryDto,
    took: number,
  ): SearchMetadataDto {
    const total =
      typeof searchResponse.total === 'object'
        ? searchResponse.total.value
        : searchResponse.total;

    const from = query.from || 0;
    const size = query.size || 20;
    const count = searchResponse.hits.length;
    const page = Math.floor(from / size) + 1;
    const totalPages = Math.ceil(total / size);
    const hasMore = from + count < total;

    return {
      total,
      count,
      from,
      size,
      took,
      hasMore,
      page,
      totalPages,
    };
  }

  /**
   * Get facets for filtering
   */
  private async getFacets(
    query: ElasticsearchQuery,
  ): Promise<AggregationsResponse> {
    try {
      const facetAggs: AggregationsConfig = {
        photographers: {
          terms: {
            field: 'fotografen.keyword',
            size: 20,
          },
        },
        databases: {
          terms: {
            field: 'db',
            size: 10,
          },
        },
        dimensions: {
          stats: {
            field: 'breite',
          },
        },
        heights: {
          stats: {
            field: 'hoehe',
          },
        },
        date_range: {
          date_histogram: {
            field: 'datum',
            calendar_interval: 'year',
          },
        },
      };

      return (
        (await this.elasticsearchService.aggregate(
          this.imagoIndex,
          facetAggs,
          query,
        )) || {}
      );
    } catch (error) {
      this.logger.warn('Failed to get facets', error);
      return {};
    }
  }

  /**
   * Build facets from aggregation response
   */
  private buildFacets(aggregations: AggregationsResponse): SearchFacetDto[] {
    const facets: SearchFacetDto[] = [];

    // Type guard for photographer aggregation
    const photographers = aggregations?.photographers as
      | { buckets?: Array<{ key: string; doc_count: number }> }
      | undefined;
    if (photographers?.buckets) {
      facets.push({
        name: 'photographers',
        values: photographers.buckets.map((bucket) => ({
          value: bucket.key,
          count: bucket.doc_count,
        })),
      });
    }

    // Type guard for database aggregation
    const databases = aggregations?.databases as
      | { buckets?: Array<{ key: string; doc_count: number }> }
      | undefined;
    if (databases?.buckets) {
      facets.push({
        name: 'databases',
        values: databases.buckets.map((bucket) => ({
          value: bucket.key,
          count: bucket.doc_count,
        })),
      });
    }

    return facets;
  }

  /**
   * Build statistics from aggregations
   */
  private buildStats(aggregations: AggregationsResponse): SearchStatsDto {
    const stats: SearchStatsDto = {};

    // Type guards for dimensions and heights
    const dimensions = aggregations?.dimensions as
      | { min?: number; max?: number; avg?: number }
      | undefined;
    const heights = aggregations?.heights as
      | { min?: number; max?: number; avg?: number }
      | undefined;

    if (dimensions && heights) {
      stats.dimensions = {
        width: {
          min: dimensions.min || 0,
          max: dimensions.max || 0,
          avg: Math.round(dimensions.avg || 0),
        },
        height: {
          min: heights.min || 0,
          max: heights.max || 0,
          avg: Math.round(heights.avg || 0),
        },
      };
    }

    // Type guard for date_range aggregation
    const dateRange = aggregations?.date_range as
      | { buckets?: Array<{ key_as_string: string }> }
      | undefined;
    if (dateRange?.buckets && dateRange.buckets.length > 0) {
      const buckets = dateRange.buckets;
      stats.dateRange = {
        earliest: buckets[0].key_as_string,
        latest: buckets[buckets.length - 1].key_as_string,
      };
    }

    return stats;
  }

  /**
   * Get search suggestions for query enhancement
   */
  private getSuggestions(
    query: SearchQueryDto,
    totalResults: number,
  ): Promise<string[]> {
    // Only provide suggestions if few or no results
    if (totalResults > 10) {
      return Promise.resolve([]);
    }

    const suggestions: string[] = [];

    // Common photography terms
    const photoTerms = [
      'landscape',
      'portrait',
      'nature',
      'wildlife',
      'architecture',
      'street photography',
      'macro',
      'sunset',
      'sunrise',
      'mountain',
      'ocean',
      'forest',
      'city',
      'people',
      'sport',
      'event',
    ];

    // Add relevant suggestions based on the search query
    if (query.q) {
      const queryLower = query.q.toLowerCase();

      suggestions.push(
        ...photoTerms
          .filter(
            (term) => term.includes(queryLower) || queryLower.includes(term),
          )
          .slice(0, 3),
      );
    }

    // Add general suggestions if no specific matches
    if (suggestions.length === 0) {
      suggestions.push(...photoTerms.slice(0, 5));
    }

    return Promise.resolve(suggestions);
  }

  /**
   * Detect data quality warnings
   */
  private detectWarnings(results: MediaItemDto[]): string[] {
    const warnings: string[] = [];

    if (results.length === 0) {
      return warnings;
    }

    // Check for missing titles
    const missingTitles = results.filter(
      (item) => item.title === 'Untitled Image' || !item.title,
    ).length;

    if (missingTitles > 0) {
      warnings.push(
        `${missingTitles} of ${results.length} results have generated titles due to missing original titles`,
      );
    }

    // Check for encoding issues
    const encodingIssues = results.filter(
      (item) =>
        item.searchText.includes('?') || item.cleanedText !== item.searchText,
    ).length;

    if (encodingIssues > 0) {
      warnings.push(
        `${encodingIssues} of ${results.length} results had text encoding issues that were automatically corrected`,
      );
    }

    // Check for missing descriptions
    const missingDescriptions = results.filter(
      (item) => item.description === 'No description available',
    ).length;

    if (missingDescriptions > 0) {
      warnings.push(
        `${missingDescriptions} of ${results.length} results have generated descriptions due to missing original descriptions`,
      );
    }

    return warnings;
  }
}
