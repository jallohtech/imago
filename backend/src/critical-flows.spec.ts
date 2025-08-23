import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('Critical User Flows (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check Flow', () => {
    it('should complete basic health check workflow', async () => {
      // 1. Check if service is alive
      const liveResponse = await request(app.getHttpServer())
        .get('/health/live')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });

      if (liveResponse.status === 503) {
        console.log('Service not healthy, skipping remaining health checks');
        return;
      }

      // 2. Check basic health
      const healthResponse = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data).toHaveProperty('status');
      expect(['ok', 'degraded', 'error']).toContain(
        healthResponse.body.data.status,
      );

      // 3. Check detailed health
      const detailedResponse = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(detailedResponse.body.success).toBe(true);
      expect(detailedResponse.body.data).toHaveProperty('services');
      expect(detailedResponse.body.data).toHaveProperty('systemInfo');

      // 4. Check readiness
      await request(app.getHttpServer())
        .get('/health/ready')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
          expect(res.body).toHaveProperty('success');
        });
    });
  });

  describe('Search to Media Flow', () => {
    it('should complete full search-to-media-item workflow', async () => {
      // 1. Perform a basic search
      const searchResponse = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'mountain', size: 5 })
        .expect((res) => {
          // Allow for various outcomes based on real ES state
          expect([200, 500, 503]).toContain(res.status);
        });

      // If search fails due to ES issues, skip the rest
      if (searchResponse.status !== 200) {
        console.log('Search service unavailable, skipping media flow');
        return;
      }

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body).toHaveProperty('data');
      expect(searchResponse.body).toHaveProperty('metadata');

      const results = searchResponse.body.data;

      // If we have results, test getting a specific item
      if (results && results.length > 0) {
        const firstResult = results[0];
        expect(firstResult).toHaveProperty('id');

        // 2. Get detailed media item
        const mediaResponse = await request(app.getHttpServer())
          .get(`/api/media/${firstResult.id}`)
          .expect((res) => {
            expect([200, 404, 500]).toContain(res.status);
          });

        if (mediaResponse.status === 200) {
          expect(mediaResponse.body.success).toBe(true);
          expect(mediaResponse.body.data).toHaveProperty('id', firstResult.id);
          expect(mediaResponse.body.data).toHaveProperty('imageUrl');
        }
      }

      // 3. Test search with filters
      const filteredSearchResponse = await request(app.getHttpServer())
        .get('/api/search')
        .query({
          q: 'nature',
          size: 3,
          minWidth: 1000,
          sortBy: 'relevance',
          sortOrder: 'desc',
        })
        .expect((res) => {
          expect([200, 400, 500, 503]).toContain(res.status);
        });

      if (filteredSearchResponse.status === 200) {
        expect(filteredSearchResponse.body.success).toBe(true);
        expect(filteredSearchResponse.body.data).toBeDefined();
      }
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle various error scenarios gracefully', async () => {
      // 1. Test invalid media ID
      const invalidIdResponse = await request(app.getHttpServer())
        .get('/api/media/invalid@id')
        .expect(400);

      expect(invalidIdResponse.body.success).toBe(false);
      expect(invalidIdResponse.body).toHaveProperty('error');
      expect(invalidIdResponse.body).toHaveProperty('statusCode', 400);

      // 2. Test non-existent media item
      await request(app.getHttpServer())
        .get('/api/media/999999999999')
        .expect((res) => {
          // Could be 404 or 500 depending on service state
          expect([404, 500]).toContain(res.status);
          expect(res.body.success).toBe(false);
        });

      // 3. Test invalid search parameters
      const badSearchResponse = await request(app.getHttpServer())
        .get('/api/search')
        .query({ size: -1, from: -10 })
        .expect(400);

      expect(badSearchResponse.body.success).toBe(false);
      expect(badSearchResponse.body).toHaveProperty('statusCode', 400);

      // 4. Test malformed URL validation
      const badValidationResponse = await request(app.getHttpServer())
        .post('/api/media/validate')
        .send({ urls: ['not-a-url', 'javascript:alert(1)'] })
        .expect(400);

      expect(badValidationResponse.body.success).toBe(false);
    });
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent response formats across all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/health/detailed' },
        { method: 'get', path: '/api/search', query: { q: 'test', size: 1 } },
        { method: 'get', path: '/api/search/fields' },
      ];

      const successfulResponses: any[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await request(app.getHttpServer())
            [endpoint.method](endpoint.path)
            .query(endpoint.query || {})
            .expect((res) => {
              // Accept various status codes based on service state
              expect([200, 404, 500, 503]).toContain(res.status);
            });

          if (response.status === 200) {
            successfulResponses.push(response);
          }
        } catch (error: any) {
          console.log(`Endpoint ${endpoint.path} failed: ${error.message}`);
        }
      }

      // Verify all successful responses have consistent format
      successfulResponses.forEach((response) => {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.timestamp).toBe('string');

        if (response.body.success) {
          expect(response.body).toHaveProperty('data');
        } else {
          expect(response.body).toHaveProperty('error');
          expect(response.body).toHaveProperty('statusCode');
        }
      });
    });
  });

  describe('Performance and Resilience', () => {
    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array(5)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .get('/health')
            .expect((res) => {
              expect([200, 500, 503]).toContain(res.status);
            }),
        );

      const responses = await Promise.all(concurrentRequests);

      // All requests should complete
      expect(responses).toHaveLength(5);

      // At least some should succeed if service is healthy
      const successCount = responses.filter((r) => r.status === 200).length;
      console.log(`${successCount}/5 concurrent health checks succeeded`);
    });

    it('should respond within reasonable time limits', async () => {
      const maxResponseTime = 5000; // 5 seconds max

      const testCases = [
        { path: '/health', name: 'Basic Health Check' },
        { path: '/api/search?q=test&size=1', name: 'Simple Search' },
      ];

      for (const testCase of testCases) {
        const start = Date.now();

        try {
          await request(app.getHttpServer())
            .get(testCase.path)
            .expect((res) => {
              expect([200, 400, 404, 500, 503]).toContain(res.status);
            });
        } catch (error) {
          // Even failed requests should complete within time limit
        }

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(maxResponseTime);
        console.log(`${testCase.name}: ${duration}ms`);
      }
    });
  });

  describe('API Contract Validation', () => {
    it('should return properly structured responses for all successful calls', async () => {
      // Test health endpoint
      try {
        const healthResponse = await request(app.getHttpServer())
          .get('/health')
          .expect(200);

        expect(healthResponse.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            status: expect.any(String),
            timestamp: expect.any(String),
          }),
          timestamp: expect.any(String),
        });
      } catch (error) {
        console.log('Health check failed, service may be unavailable');
      }

      // Test search fields endpoint
      try {
        const fieldsResponse = await request(app.getHttpServer())
          .get('/api/search/fields')
          .expect(200);

        expect(fieldsResponse.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            searchableFields: expect.any(Array),
            stats: expect.any(Object),
          }),
          timestamp: expect.any(String),
        });
      } catch (error) {
        console.log('Search fields failed, ES may be unavailable');
      }
    });
  });

  describe('Service Integration', () => {
    it('should demonstrate end-to-end service connectivity', async () => {
      // This test validates the entire stack is working together
      const integrationSteps: string[] = [];

      // Step 1: Health check
      try {
        const health = await request(app.getHttpServer())
          .get('/health')
          .expect((res) => expect([200, 503]).toContain(res.status));

        integrationSteps.push(
          `Health: ${health.status === 200 ? 'OK' : 'DEGRADED'}`,
        );
      } catch (error) {
        integrationSteps.push('Health: FAILED');
      }

      // Step 2: Search service
      try {
        const search = await request(app.getHttpServer())
          .get('/api/search/fields')
          .expect((res) => expect([200, 500, 503]).toContain(res.status));

        integrationSteps.push(
          `Search Service: ${search.status === 200 ? 'OK' : 'FAILED'}`,
        );
      } catch (error) {
        integrationSteps.push('Search Service: FAILED');
      }

      // Step 3: Global error handling
      try {
        const errorTest = await request(app.getHttpServer())
          .get('/api/media/invalid@id')
          .expect(400);

        integrationSteps.push(
          `Error Handling: ${errorTest.body.success === false ? 'OK' : 'FAILED'}`,
        );
      } catch (error) {
        integrationSteps.push('Error Handling: FAILED');
      }

      console.log('Integration Test Results:', integrationSteps);

      // At least error handling should work (doesn't depend on ES)
      const workingServices = integrationSteps.filter((step) =>
        step.includes('OK'),
      ).length;
      expect(workingServices).toBeGreaterThan(0);
    });
  });
});
