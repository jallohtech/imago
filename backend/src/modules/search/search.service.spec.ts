import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

describe('SearchService', () => {
  let service: SearchService;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;

  // Mock data based on actual ES structure
  const mockMediaHit = {
    _id: '258999077',
    _index: 'imago',
    _score: 1.5,
    _source: {
      bildnummer: '258999077',
      datum: '2023-08-15T10:30:00.000Z',
      suchtext: 'Berg Landschaft Sonnenuntergang Natur Himmel Wolken',
      fotografen: 'ABACAPRESS',
      hoehe: 1080,
      breite: 1920,
      db: 'st',
      title: undefined, // Often missing in real data
      description: undefined, // Often missing in real data
    },
  };

  const mockSearchResponse = {
    total: { value: 1543, relation: 'eq' as const },
    hits: [mockMediaHit],
    took: 45,
  };

  beforeEach(async () => {
    const mockElasticsearchService = {
      search: jest.fn(),
      get: jest.fn(),
      getMapping: jest.fn(),
      getIndexStats: jest.fn(),
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'app.baseImageUrl')
                return 'https://www.imago-images.de';
              if (key === 'elasticsearch.index') return 'imago';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    elasticsearchService = module.get(ElasticsearchService);
  });

  describe('buildElasticsearchQuery', () => {
    it('should build a simple match_all query when no search term provided', () => {
      const query = { q: '', size: 20, from: 0 };

      // Access private method using bracket notation for testing
      const result = (service as any).buildElasticsearchQuery(query);

      expect(result.query.bool.must).toContainEqual({
        match_all: {},
      });
    });

    it('should build multi_match query with boosted fields for search term', () => {
      const query = { q: 'mountain landscape', size: 20, from: 0 };

      const result = (service as any).buildElasticsearchQuery(query);

      const multiMatchQuery = result.query.bool.must.find(
        (q: any) => q.multi_match,
      );

      expect(multiMatchQuery).toBeDefined();
      expect(multiMatchQuery.multi_match.query).toBe('mountain landscape');
      expect(multiMatchQuery.multi_match.fields).toContain('suchtext^3');
      expect(multiMatchQuery.multi_match.fields).toContain('title^2');
    });

    it('should add filters for photographer and dimensions', () => {
      const query = {
        q: 'test',
        photographer: 'ABACAPRESS',
        minWidth: 1920,
        maxHeight: 1080,
      };

      const result = (service as any).buildElasticsearchQuery(query);

      expect(result.query.bool.filter).toContainEqual({
        term: { 'fotografen.keyword': 'ABACAPRESS' },
      });

      expect(result.query.bool.filter).toContainEqual({
        range: { breite: { gte: 1920 } },
      });

      expect(result.query.bool.filter).toContainEqual({
        range: { hoehe: { lte: 1080 } },
      });
    });
  });

  describe('transformMediaItem', () => {
    it('should transform ES hit to MediaItemDto with generated title and description', () => {
      const result = (service as any).transformMediaItem(mockMediaHit);

      expect(result.id).toBe('258999077');
      expect(result.bildnummer).toBe('258999077');
      expect(result.photographer).toBe('ABACAPRESS');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.database).toBe('st');
      expect(result.aspectRatio).toBeCloseTo(1.777, 2);
      expect(result.orientation).toBe('landscape');

      // Should generate title from search text when missing
      expect(result.title).toContain('Berg');
      expect(result.description).toContain('Berg Landschaft');

      // Should build proper image URL
      expect(result.imageUrl).toBe(
        'https://www.imago-images.de/bild/st/0258999077/s.jpg',
      );
    });

    it('should preserve existing title and description when available', () => {
      const hitWithMetadata = {
        ...mockMediaHit,
        _source: {
          ...mockMediaHit._source,
          title: 'Existing Title',
          description: 'Existing Description',
        },
      };

      const result = (service as any).transformMediaItem(hitWithMetadata);

      expect(result.title).toBe('Existing Title');
      expect(result.description).toBe('Existing Description');
    });
  });

  describe('cleanText', () => {
    it('should fix common encoding issues', () => {
      const dirtyText = 'Text with ? and � encoding issues';

      const result = (service as any).cleanText(dirtyText);

      expect(result).toBe("Text with ' and ' encoding issues");
    });

    it('should remove redundant copyright notices and extra whitespace', () => {
      const textWithCopyright = 'Mountain   landscape  �ABACAPRESS  content';

      const result = (service as any).cleanText(textWithCopyright);

      expect(result).toBe('Mountain landscape content');
      expect(result).not.toContain('ABACAPRESS');
    });

    it('should handle empty and null input gracefully', () => {
      expect((service as any).cleanText('')).toBe('');
      expect((service as any).cleanText(null)).toBe('');
      expect((service as any).cleanText(undefined)).toBe('');
    });
  });

  describe('generateTitle', () => {
    it('should use existing title when available', () => {
      const result = (service as any).generateTitle(
        'Existing Title',
        'some search text',
      );

      expect(result).toBe('Existing Title');
    });

    it('should generate title from cleaned search text when missing', () => {
      const result = (service as any).generateTitle(
        undefined,
        'mountain landscape sunset beautiful nature photography',
      );

      expect(result).toBe(
        'Mountain landscape sunset beautiful nature photography',
      );
      expect(result.charAt(0)).toBe('M'); // Should be capitalized
    });

    it('should limit generated title to 6 meaningful words', () => {
      const longText = 'one two three four five six seven eight nine ten';

      const result = (service as any).generateTitle(undefined, longText);

      const words = result.split(' ');
      expect(words).toHaveLength(6);
      expect(result).toBe('One two three four five six');
    });

    it('should fallback to "Untitled Image" for empty text', () => {
      const result = (service as any).generateTitle(undefined, '');

      expect(result).toBe('Untitled Image');
    });
  });

  describe('buildImageUrl', () => {
    it('should construct proper IMAGO URL with zero-padded ID', () => {
      const result = (service as any).buildImageUrl('st', '123456');

      expect(result).toBe(
        'https://www.imago-images.de/bild/st/0000123456/s.jpg',
      );
    });

    it('should handle already padded IDs correctly', () => {
      const result = (service as any).buildImageUrl('sp', '1234567890');

      expect(result).toBe(
        'https://www.imago-images.de/bild/sp/1234567890/s.jpg',
      );
    });
  });

  describe('detectLanguage', () => {
    it('should detect German text', () => {
      const germanText = 'Berg und Landschaft mit der Natur sind sehr schön';

      const result = (service as any).detectLanguage(germanText);

      expect(result).toBe('de');
    });

    it('should detect English text', () => {
      const englishText =
        'Mountain and landscape with the nature are very beautiful';

      const result = (service as any).detectLanguage(englishText);

      expect(result).toBe('en');
    });

    it('should detect mixed language content', () => {
      const mixedText = 'Mountain Berg landscape Landschaft';

      const result = (service as any).detectLanguage(mixedText);

      expect(result).toBe('mixed');
    });
  });

  describe('search integration', () => {
    it('should perform full search flow with mocked ES response', async () => {
      elasticsearchService.search.mockResolvedValue(mockSearchResponse);
      elasticsearchService.aggregate.mockResolvedValue({});

      const result = await service.search({
        q: 'mountain',
        size: 20,
        from: 0,
        sortBy: 'relevance' as any,
        sortOrder: 'desc' as any,
        highlight: false,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.metadata.total).toBe(1543);
      expect(result.metadata.took).toBeGreaterThan(0);

      // Verify the transformed result
      const mediaItem = result.results[0];
      expect(mediaItem.id).toBe('258999077');
      expect(mediaItem.title).toContain('Berg');
    });
  });

  describe('getMediaItem', () => {
    it('should return null when media item not found', async () => {
      elasticsearchService.get.mockResolvedValue(null);

      const result = await service.getMediaItem('nonexistent');

      expect(result).toBeNull();
    });

    it('should transform and return media item when found', async () => {
      const mockESResponse = {
        _id: '258999077',
        _index: 'imago',
        _version: 1,
        _seq_no: 1,
        _primary_term: 1,
        found: true,
        _source: mockMediaHit._source,
      };

      elasticsearchService.get.mockResolvedValue(mockESResponse);

      const result = await service.getMediaItem('258999077');

      expect(result).toBeDefined();
      expect(result!.id).toBe('258999077');
      expect(result!.title).toContain('Berg');
    });
  });
});
