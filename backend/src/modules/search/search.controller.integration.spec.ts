import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { SearchService } from './search.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

describe('SearchController (Integration)', () => {
  let app: INestApplication;
  let searchService: jest.Mocked<SearchService>;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;

  const mockSearchResponse = {
    results: [
      {
        id: '258999077',
        bildnummer: '258999077',
        title: 'Mountain Landscape',
        description: 'Beautiful mountain landscape at sunset',
        searchText: 'mountain landscape sunset nature',
        photographer: 'TESTPHOTOGRAPHER',
        date: '2023-08-15T10:30:00.000Z',
        width: 1920,
        height: 1080,
        database: 'st',
        imageUrl: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
        thumbnailUrl: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
        score: 1.5,
        aspectRatio: 1.777,
        orientation: 'landscape' as 'landscape' | 'portrait' | 'square',
        language: 'en',
        cleanedText: 'mountain landscape sunset nature',
      },
    ],
    metadata: {
      total: 1543,
      count: 1,
      from: 0,
      size: 20,
      took: 45,
      hasMore: true,
      page: 1,
      totalPages: 78,
    },
    facets: [
      {
        name: 'photographers',
        values: [{ value: 'TESTPHOTOGRAPHER', count: 150 }],
      },
    ],
    stats: {
      dimensions: {
        width: { min: 800, max: 5000, avg: 2500 },
        height: { min: 600, max: 3500, avg: 1800 },
      },
    },
    success: true,
    warnings: undefined,
  };

  const mockMediaItem = {
    id: '258999077',
    bildnummer: '258999077',
    title: 'Mountain Landscape',
    description: 'Beautiful mountain landscape at sunset',
    searchText: 'mountain landscape sunset nature',
    photographer: 'TESTPHOTOGRAPHER',
    date: '2023-08-15T10:30:00.000Z',
    width: 1920,
    height: 1080,
    database: 'st',
    imageUrl: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
    thumbnailUrl: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
    score: 1.5,
    aspectRatio: 1.777,
    orientation: 'landscape' as 'landscape' | 'portrait' | 'square',
    language: 'en',
    cleanedText: 'mountain landscape sunset nature',
  };

  beforeEach(async () => {
    const mockSearchService = {
      search: jest.fn(),
      getMediaItem: jest.fn(),
      getSearchableFields: jest.fn(),
    };

    const mockElasticsearchService = {
      indexExists: jest.fn(),
      getMapping: jest.fn(),
      getIndexStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SearchService)
      .useValue(mockSearchService)
      .overrideProvider(ElasticsearchService)
      .useValue(mockElasticsearchService)
      .compile();

    app = module.createNestApplication();
    await app.init();

    searchService = module.get(SearchService);
    elasticsearchService = module.get(ElasticsearchService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /api/search', () => {
    it('should return search results with standardized response format', async () => {
      searchService.search.mockResolvedValue(mockSearchResponse);

      const response = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'mountain', size: 20, from: 0 })
        .expect(200);

      // Verify standardized response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toEqual(mockSearchResponse.results);

      // Verify metadata extraction
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('pagination');
      expect(response.body.metadata.pagination.total).toBe(1543);
      expect(response.body.metadata).toHaveProperty('timing');
      expect(response.body.metadata.timing.took).toBe(45);
    });

    it('should handle search with all query parameters', async () => {
      searchService.search.mockResolvedValue(mockSearchResponse);

      const response = await request(app.getHttpServer())
        .get('/api/search')
        .query({
          q: 'landscape',
          photographer: 'TESTPHOTOGRAPHER',
          dateFrom: '2023-01-01',
          dateTo: '2023-12-31',
          minWidth: 1920,
          maxWidth: 3840,
          minHeight: 1080,
          maxHeight: 2160,
          db: 'st',
          size: 10,
          from: 20,
          sortBy: 'date',
          sortOrder: 'desc',
          highlight: true,
        })
        .expect(200);

      expect(searchService.search).toHaveBeenCalledWith({
        q: 'landscape',
        photographer: 'TESTPHOTOGRAPHER',
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
        minWidth: 1920,
        maxWidth: 3840,
        minHeight: 1080,
        maxHeight: 2160,
        db: 'st',
        size: 10,
        from: 20,
        sortBy: 'date',
        sortOrder: 'desc',
        highlight: true,
      });

      expect(response.body.success).toBe(true);
    });

    it('should handle empty search results', async () => {
      const emptyResponse = {
        ...mockSearchResponse,
        results: [],
        metadata: { ...mockSearchResponse.metadata, total: 0, count: 0 },
      };

      searchService.search.mockResolvedValue(emptyResponse);

      const response = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'nonexistent' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.metadata.pagination.total).toBe(0);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/search')
        .query({ size: -1, from: -5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.statusCode).toBe(400);
    });

    it('should return 503 when search service is unavailable', async () => {
      searchService.search.mockRejectedValue(
        new Error('Elasticsearch connection failed'),
      );

      const response = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'test' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.statusCode).toBe(500);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/search/:id', () => {
    it('should return specific media item with standardized format', async () => {
      searchService.getMediaItem.mockResolvedValue(mockMediaItem);

      const response = await request(app.getHttpServer())
        .get('/api/search/258999077')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMediaItem);
      expect(response.body).toHaveProperty('timestamp');

      expect(searchService.getMediaItem).toHaveBeenCalledWith('258999077');
    });

    it('should return 404 for non-existent media item', async () => {
      searchService.getMediaItem.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/search/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
      expect(response.body.statusCode).toBe(404);
    });

    it('should return 400 for invalid media ID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/search/invalid@id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/search/fields', () => {
    it('should return searchable fields information', async () => {
      const mockFieldsResponse = {
        mapping: {
          suchtext: { type: 'text' },
          fotografen: { type: 'keyword' },
        },
        stats: {
          totalDocuments: 1000000,
          totalSize: 50000000000,
          deleted: 1500,
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

      searchService.getSearchableFields.mockResolvedValue(mockFieldsResponse);

      const response = await request(app.getHttpServer())
        .get('/api/search/fields')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFieldsResponse);
      expect(response.body.data.searchableFields).toContain('suchtext');
      expect(response.body.data.stats.totalDocuments).toBe(1000000);
    });

    it('should handle service errors gracefully', async () => {
      searchService.getSearchableFields.mockRejectedValue(
        new Error('Index mapping unavailable'),
      );

      const response = await request(app.getHttpServer())
        .get('/api/search/fields')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Response Consistency', () => {
    it('should maintain consistent response format across all endpoints', async () => {
      // Test search endpoint
      searchService.search.mockResolvedValue(mockSearchResponse);
      const searchResp = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'test' })
        .expect(200);

      // Test media item endpoint
      searchService.getMediaItem.mockResolvedValue(mockMediaItem);
      const itemResp = await request(app.getHttpServer())
        .get('/api/search/258999077')
        .expect(200);

      // Test fields endpoint
      const fieldsData = {
        mapping: {},
        stats: { totalDocuments: 0, totalSize: 0, deleted: 0 },
        searchableFields: [],
      };
      searchService.getSearchableFields.mockResolvedValue(fieldsData);
      const fieldsResp = await request(app.getHttpServer())
        .get('/api/search/fields')
        .expect(200);

      // All responses should have the same structure
      [searchResp.body, itemResp.body, fieldsResp.body].forEach((body) => {
        expect(body).toHaveProperty('success');
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('timestamp');
        expect(typeof body.success).toBe('boolean');
        expect(typeof body.timestamp).toBe('string');
        expect(body.success).toBe(true);
      });
    });

    it('should maintain consistent error response format', async () => {
      // Test different types of errors
      searchService.search.mockRejectedValue(new Error('Service error'));
      const searchErrorResp = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'test' })
        .expect(500);

      searchService.getMediaItem.mockResolvedValue(null);
      const notFoundResp = await request(app.getHttpServer())
        .get('/api/search/nonexistent')
        .expect(404);

      const badRequestResp = await request(app.getHttpServer())
        .get('/api/search')
        .query({ size: -1 })
        .expect(400);

      // All error responses should have the same structure
      [searchErrorResp.body, notFoundResp.body, badRequestResp.body].forEach(
        (body) => {
          expect(body).toHaveProperty('success', false);
          expect(body).toHaveProperty('error');
          expect(body).toHaveProperty('statusCode');
          expect(body).toHaveProperty('timestamp');
          expect(typeof body.error).toBe('string');
          expect(typeof body.statusCode).toBe('number');
          expect(typeof body.timestamp).toBe('string');
        },
      );
    });
  });
});
