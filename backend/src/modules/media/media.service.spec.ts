import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { SearchService } from '../search/search.service';
import { MediaItemDto } from '../../dto';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('MediaService', () => {
  let service: MediaService;
  let searchService: jest.Mocked<SearchService>;

  const mockMediaItem: MediaItemDto = {
    id: '258999077',
    bildnummer: '258999077',
    title: 'Test Image',
    description: 'Test description',
    searchText: 'nature mountain landscape',
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
    cleanedText: 'nature mountain landscape',
  };

  beforeEach(async () => {
    const mockSearchService = {
      getMediaItem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'app.baseImageUrl')
                return 'https://www.imago-images.de';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    searchService = module.get(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMediaItem', () => {
    it('should return enhanced media item for valid ID', async () => {
      searchService.getMediaItem.mockResolvedValue(mockMediaItem);

      // Mock successful HEAD request
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockImplementation((header: string) => {
            switch (header) {
              case 'content-type':
                return 'image/jpeg';
              case 'content-length':
                return '150000';
              case 'last-modified':
                return 'Wed, 15 Aug 2023 10:30:00 GMT';
              default:
                return null;
            }
          }),
        },
      } as any);

      const result = await service.getMediaItem('258999077');

      expect(result).toBeDefined();
      expect(result.id).toBe('258999077');
      expect(result.imageValidation?.isValid).toBe(true);
      expect(result.fileSize).toBe(150000);
      expect(result.mimeType).toBe('image/jpeg');
      expect(searchService.getMediaItem).toHaveBeenCalledWith('258999077');
    });

    it('should throw BadRequestException for invalid ID format', async () => {
      const invalidIds = [
        '', // empty string
        'a'.repeat(51), // too long
        'invalid@id', // invalid characters
        'id with spaces', // contains spaces
        '../../etc/passwd', // path traversal attempt
      ];

      for (const invalidId of invalidIds) {
        await expect(service.getMediaItem(invalidId)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.getMediaItem(invalidId)).rejects.toThrow(
          'Invalid media ID format',
        );
      }
    });

    it('should throw NotFoundException when media item not found', async () => {
      searchService.getMediaItem.mockResolvedValue(null);

      await expect(service.getMediaItem('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMediaItem('nonexistent')).rejects.toThrow(
        "Media item with ID 'nonexistent' not found",
      );
    });

    it('should handle image metadata fetch failures gracefully', async () => {
      searchService.getMediaItem.mockResolvedValue(mockMediaItem);

      // Mock failed HEAD request
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.getMediaItem('258999077');

      expect(result).toBeDefined();
      expect(result.id).toBe('258999077');
      expect(result.imageValidation?.isValid).toBe(false);
      expect(result.imageValidation?.errors).toContain(
        'Network error: Network error',
      );
    });
  });

  describe('isValidMediaId', () => {
    it('should validate correct media ID formats', () => {
      const validIds = [
        '123456789',
        'abc123',
        '258999077',
        'id_with_underscores',
        'id-with-hyphens',
        'UPPERCASE123',
        'mixedCase456',
      ];

      validIds.forEach((id) => {
        expect((service as any).isValidMediaId(id)).toBe(true);
      });
    });

    it('should reject invalid media ID formats', () => {
      const invalidIds = [
        '', // empty
        null, // null
        undefined, // undefined
        'a'.repeat(51), // too long
        'id with spaces', // spaces
        'id@with.special', // special characters
        'id/with/slashes', // slashes
        '../../traversal', // path traversal
        '<script>alert(1)</script>', // XSS attempt
      ];

      invalidIds.forEach((id) => {
        expect((service as any).isValidMediaId(id)).toBe(false);
      });
    });
  });

  describe('validateAndConstructImageUrl', () => {
    it('should construct valid image URLs with proper padding', () => {
      const testCases = [
        {
          db: 'st',
          bildnummer: '123456',
          expected: 'https://www.imago-images.de/bild/st/0000123456/s.jpg',
        },
        {
          db: 'sp',
          bildnummer: '1234567890',
          expected: 'https://www.imago-images.de/bild/sp/1234567890/s.jpg',
        },
        {
          db: 'st',
          bildnummer: '258999077',
          expected: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
        },
      ];

      testCases.forEach(({ db, bildnummer, expected }) => {
        const result = (service as any).validateAndConstructImageUrl(
          db,
          bildnummer,
        );
        expect(result).toBe(expected);
      });
    });

    it('should handle special characters in URL components properly', () => {
      // Test with characters that need URL encoding
      const result = (service as any).validateAndConstructImageUrl(
        'st',
        '123456',
      );

      expect(result).toContain('/bild/st/0000123456/s.jpg');
      expect(() => new URL(result)).not.toThrow();
    });

    it('should log warnings for invalid database types but still construct URL', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = (service as any).validateAndConstructImageUrl(
        'invalid_db',
        '123456',
      );

      expect(result).toContain('invalid_db');
      expect(result).toContain('0000123456');

      consoleSpy.mockRestore();
    });

    it('should log warnings for invalid bildnummer formats but still construct URL', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = (service as any).validateAndConstructImageUrl(
        'st',
        'abc123',
      );

      expect(result).toContain('st');
      expect(result).toContain('0000abc123');

      consoleSpy.mockRestore();
    });

    it('should throw BadRequestException for malformed URLs', () => {
      // Mock URL constructor to throw
      const originalURL = global.URL;
      (global.URL as any) = jest.fn().mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      expect(() => {
        (service as any).validateAndConstructImageUrl('st', '123456');
      }).toThrow(BadRequestException);
      expect(() => {
        (service as any).validateAndConstructImageUrl('st', '123456');
      }).toThrow('Unable to construct valid image URL');

      // Restore original URL constructor
      global.URL = originalURL;
    });
  });

  describe('getImageMetadata', () => {
    it('should return valid metadata for successful HEAD requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockImplementation((header: string) => {
            switch (header) {
              case 'content-type':
                return 'image/jpeg';
              case 'content-length':
                return '150000';
              case 'last-modified':
                return 'Wed, 15 Aug 2023 10:30:00 GMT';
              default:
                return null;
            }
          }),
        },
      } as any);

      const metadata = await (service as any).getImageMetadata(
        'https://example.com/image.jpg',
      );

      expect(metadata.isValid).toBe(true);
      expect(metadata.statusCode).toBe(200);
      expect(metadata.contentType).toBe('image/jpeg');
      expect(metadata.contentLength).toBe(150000);
      expect(metadata.lastModified).toBe('Wed, 15 Aug 2023 10:30:00 GMT');
      expect(metadata.errors).toBeUndefined();
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as any);

      const metadata = await (service as any).getImageMetadata(
        'https://example.com/missing.jpg',
      );

      expect(metadata.isValid).toBe(false);
      expect(metadata.statusCode).toBe(404);
      expect(metadata.errors).toContain('HTTP 404: Not Found');
    });

    it('should detect invalid content types', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockImplementation((header: string) => {
            if (header === 'content-type') return 'text/html';
            return null;
          }),
        },
      } as any);

      const metadata = await (service as any).getImageMetadata(
        'https://example.com/notimage.html',
      );

      expect(metadata.isValid).toBe(true); // HTTP request succeeded
      expect(metadata.errors).toContain('Invalid content type: text/html');
    });

    it('should detect empty files', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockImplementation((header: string) => {
            if (header === 'content-length') return '0';
            if (header === 'content-type') return 'image/jpeg';
            return null;
          }),
        },
      } as any);

      const metadata = await (service as any).getImageMetadata(
        'https://example.com/empty.jpg',
      );

      expect(metadata.contentLength).toBe(0);
      expect(metadata.errors).toBeDefined();
      expect(metadata.errors).toContain('Image file appears to be empty');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const metadata = await (service as any).getImageMetadata(
        'https://unreachable.com/image.jpg',
      );

      expect(metadata.isValid).toBe(false);
      expect(metadata.errors).toContain('Network error: Network timeout');
    });

    it('should handle request timeout', async () => {
      // Mock a slow response that gets aborted
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100),
          ),
      );

      const metadata = await (service as any).getImageMetadata(
        'https://slow.com/image.jpg',
      );

      expect(metadata.isValid).toBe(false);
      expect(metadata.errors?.[0]).toMatch(/Network error/);
    }, 10000);
  });

  describe('validateImageUrls', () => {
    it('should validate multiple URLs in batches', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockImplementation((header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          }),
        },
      } as any);

      const results = await service.validateImageUrls(urls);

      expect(Object.keys(results)).toHaveLength(3);
      urls.forEach((url) => {
        expect(results[url].isValid).toBe(true);
        expect(results[url].contentType).toBe('image/jpeg');
      });
    });

    it('should handle mixed success and failure results', async () => {
      const urls = [
        'https://example.com/valid.jpg',
        'https://example.com/invalid.jpg',
      ];

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: { get: () => 'image/jpeg' },
          } as any);
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            headers: { get: () => null },
          } as any);
        }
      });

      const results = await service.validateImageUrls(urls);

      expect(results[urls[0]].isValid).toBe(true);
      expect(results[urls[1]].isValid).toBe(false);
      expect(results[urls[1]].errors).toContain('HTTP 404: Not Found');
    });

    it('should handle promise rejections in batch processing', async () => {
      const urls = ['https://example.com/image.jpg'];

      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await service.validateImageUrls(urls);

      expect(results[urls[0]].isValid).toBe(false);
      expect(results[urls[0]].errors?.[0]).toMatch(/Network error/);
    });
  });
});
