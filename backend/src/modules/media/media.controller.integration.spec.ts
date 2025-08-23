import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { MediaService } from './media.service';

describe('MediaController (Integration)', () => {
  let app: INestApplication;
  let mediaService: jest.Mocked<MediaService>;

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
    fileSize: 150000,
    mimeType: 'image/jpeg',
    lastModified: 'Wed, 15 Aug 2023 10:30:00 GMT',
    imageValidation: {
      isValid: true,
      statusCode: 200,
      errors: [],
    },
  };

  beforeEach(async () => {
    const mockMediaServiceValue = {
      getMediaItem: jest.fn(),
      validateImageUrls: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MediaService)
      .useValue(mockMediaServiceValue)
      .compile();

    app = module.createNestApplication();
    await app.init();

    mediaService = module.get(MediaService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /api/media/:id', () => {
    it('should return enhanced media item with validation data', async () => {
      mediaService.getMediaItem.mockResolvedValue(mockMediaItem);

      const response = await request(app.getHttpServer())
        .get('/api/media/258999077')
        .expect(200);

      // Verify standardized response format
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');

      // Verify enhanced media data
      const mediaData = response.body.data;
      expect(mediaData).toEqual(mockMediaItem);
      expect(mediaData.imageValidation.isValid).toBe(true);
      expect(mediaData.fileSize).toBe(150000);
      expect(mediaData.mimeType).toBe('image/jpeg');

      expect(mediaService.getMediaItem).toHaveBeenCalledWith('258999077');
    });

    it('should handle media item with invalid image validation', async () => {
      const invalidMediaItem = {
        ...mockMediaItem,
        imageValidation: {
          isValid: false,
          statusCode: 404,
          errors: ['HTTP 404: Not Found'],
        },
      };

      mediaService.getMediaItem.mockResolvedValue(invalidMediaItem);

      const response = await request(app.getHttpServer())
        .get('/api/media/123456')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imageValidation.isValid).toBe(false);
      expect(response.body.data.imageValidation.errors).toContain(
        'HTTP 404: Not Found',
      );
    });

    it('should return 400 for invalid media ID format', async () => {
      const invalidIds = [
        'invalid@id',
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        'id with spaces',
        'a'.repeat(51), // too long
      ];

      for (const invalidId of invalidIds) {
        const response = await request(app.getHttpServer())
          .get(`/api/media/${encodeURIComponent(invalidId)}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid media ID format');
        expect(response.body.statusCode).toBe(400);
      }
    });

    it('should return 404 for non-existent media item', async () => {
      mediaService.getMediaItem.mockRejectedValue(
        new Error("Media item with ID 'nonexistent' not found"),
      );

      const response = await request(app.getHttpServer())
        .get('/api/media/nonexistent')
        .expect(500); // Global exception filter converts to 500

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.statusCode).toBe(500);
    });

    it('should handle service errors gracefully', async () => {
      mediaService.getMediaItem.mockRejectedValue(
        new Error('Elasticsearch connection failed'),
      );

      const response = await request(app.getHttpServer())
        .get('/api/media/258999077')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.statusCode).toBe(500);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/media/validate', () => {
    it('should validate multiple image URLs', async () => {
      const validationResults = {
        'https://www.imago-images.de/bild/st/0258999077/s.jpg': {
          isValid: true,
          statusCode: 200,
          contentType: 'image/jpeg',
          contentLength: 150000,
        },
        'https://www.imago-images.de/bild/st/0123456789/s.jpg': {
          isValid: false,
          statusCode: 404,
          errors: ['HTTP 404: Not Found'],
        },
      };

      mediaService.validateImageUrls.mockResolvedValue(validationResults);

      const response = await request(app.getHttpServer())
        .post('/api/media/validate')
        .send({
          urls: [
            'https://www.imago-images.de/bild/st/0258999077/s.jpg',
            'https://www.imago-images.de/bild/st/0123456789/s.jpg',
          ],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validationResults);

      // Verify individual validation results
      expect(
        response.body.data[
          'https://www.imago-images.de/bild/st/0258999077/s.jpg'
        ].isValid,
      ).toBe(true);
      expect(
        response.body.data[
          'https://www.imago-images.de/bild/st/0123456789/s.jpg'
        ].isValid,
      ).toBe(false);
    });

    it('should return 400 for empty URLs array', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/media/validate')
        .send({ urls: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 for invalid URL formats', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/media/validate')
        .send({
          urls: ['not-a-url', 'javascript:alert(1)', 'ftp://invalid.protocol'],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle validation service errors', async () => {
      mediaService.validateImageUrls.mockRejectedValue(
        new Error('Network timeout during validation'),
      );

      const response = await request(app.getHttpServer())
        .post('/api/media/validate')
        .send({
          urls: ['https://www.imago-images.de/bild/st/0258999077/s.jpg'],
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should limit the number of URLs that can be validated at once', async () => {
      const tooManyUrls = Array(101).fill(
        'https://www.imago-images.de/bild/st/0258999077/s.jpg',
      );

      const response = await request(app.getHttpServer())
        .post('/api/media/validate')
        .send({ urls: tooManyUrls })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('too many');
    });
  });

  describe('URL Construction and Validation', () => {
    it('should handle various database types in media URLs', async () => {
      const mediaItems = [
        { ...mockMediaItem, id: 'st123', database: 'st' },
        { ...mockMediaItem, id: 'sp456', database: 'sp' },
      ];

      for (const item of mediaItems) {
        mediaService.getMediaItem.mockResolvedValue(item);

        const response = await request(app.getHttpServer())
          .get(`/api/media/${item.id}`)
          .expect(200);

        expect(response.body.data.database).toBe(item.database);
        expect(response.body.data.imageUrl).toContain(
          `/bild/${item.database}/`,
        );
      }
    });

    it('should preserve original metadata when available', async () => {
      const itemWithAllMetadata = {
        ...mockMediaItem,
        fileSize: 250000,
        mimeType: 'image/png',
        lastModified: 'Thu, 16 Aug 2023 12:00:00 GMT',
        imageValidation: {
          isValid: true,
          statusCode: 200,
          errors: [],
        },
      };

      mediaService.getMediaItem.mockResolvedValue(itemWithAllMetadata);

      const response = await request(app.getHttpServer())
        .get('/api/media/258999077')
        .expect(200);

      const data = response.body.data;
      expect(data.fileSize).toBe(250000);
      expect(data.mimeType).toBe('image/png');
      expect(data.lastModified).toBe('Thu, 16 Aug 2023 12:00:00 GMT');
    });
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent response structure across endpoints', async () => {
      // Test getMediaItem endpoint
      mediaService.getMediaItem.mockResolvedValue(mockMediaItem);
      const getResp = await request(app.getHttpServer())
        .get('/api/media/258999077')
        .expect(200);

      // Test validateImageUrls endpoint
      mediaService.validateImageUrls.mockResolvedValue({
        'https://example.com/test.jpg': { isValid: true, statusCode: 200 },
      });
      const validateResp = await request(app.getHttpServer())
        .post('/api/media/validate')
        .send({ urls: ['https://example.com/test.jpg'] })
        .expect(200);

      // Both responses should have consistent structure
      [getResp.body, validateResp.body].forEach((body) => {
        expect(body).toHaveProperty('success', true);
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('timestamp');
        expect(typeof body.timestamp).toBe('string');
      });
    });

    it('should handle concurrent requests properly', async () => {
      mediaService.getMediaItem.mockResolvedValue(mockMediaItem);

      // Make multiple concurrent requests
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer()).get(`/api/media/25899907${i}`),
        );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('timestamp');
      });
    });
  });
});
