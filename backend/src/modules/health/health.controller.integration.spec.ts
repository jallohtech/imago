import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { HealthService } from './health.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

describe('HealthController (Integration)', () => {
  let app: INestApplication;
  let healthService: any;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;

  const mockHealthResponse = {
    status: 'ok',
    timestamp: '2023-08-15T10:30:00.000Z',
    uptime: 3600000, // 1 hour in milliseconds
    version: '1.0.0',
    environment: 'test',
    services: {
      elasticsearch: {
        status: 'ok',
        responseTime: 45,
        clusterName: 'test-cluster',
        clusterStatus: 'green',
        nodeCount: 3,
        indexStats: {
          totalDocuments: 1000000,
          totalSize: '50GB',
          deleted: 1500,
        },
      },
    },
    systemInfo: {
      nodejs: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        used: 125000000, // ~125MB
        total: 500000000, // ~500MB
      },
    },
  };

  beforeEach(async () => {
    const mockHealthServiceValue = {
      getHealth: jest.fn(),
      getDetailedHealth: jest.fn(),
    };

    const mockElasticsearchServiceValue = {
      indexExists: jest.fn(),
      getIndexStats: jest.fn(),
      getClient: jest.fn().mockReturnValue({
        cluster: {
          health: jest.fn(),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HealthService)
      .useValue(mockHealthServiceValue)
      .overrideProvider(ElasticsearchService)
      .useValue(mockElasticsearchServiceValue)
      .compile();

    app = module.createNestApplication();
    await app.init();

    healthService = module.get(HealthService);
    elasticsearchService = module.get(ElasticsearchService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return basic health status with standardized response', async () => {
      const basicHealth = {
        status: 'ok',
        timestamp: mockHealthResponse.timestamp,
        uptime: mockHealthResponse.uptime,
      };

      healthService.getHealth.mockResolvedValue(basicHealth);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Verify standardized response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');

      // Verify health data
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.uptime).toBe(3600000);
      expect(typeof response.body.data.timestamp).toBe('string');

      expect(healthService.getHealth).toHaveBeenCalled();
    });

    it('should return degraded status when service has issues', async () => {
      const degradedHealth = {
        status: 'degraded',
        timestamp: mockHealthResponse.timestamp,
        uptime: mockHealthResponse.uptime,
        issues: ['Elasticsearch cluster status is yellow'],
      };

      healthService.getHealth.mockResolvedValue(degradedHealth);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('degraded');
      expect(response.body.data.issues).toContain(
        'Elasticsearch cluster status is yellow',
      );
    });

    it('should return error status when service is down', async () => {
      const errorHealth = {
        status: 'error',
        timestamp: mockHealthResponse.timestamp,
        uptime: mockHealthResponse.uptime,
        issues: ['Elasticsearch connection failed'],
      };

      healthService.getHealth.mockResolvedValue(errorHealth);

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('error');
      expect(response.body.data.issues).toContain(
        'Elasticsearch connection failed',
      );
    });
  });

  describe('GET /health/detailed', () => {
    it('should return comprehensive health information', async () => {
      healthService.getDetailedHealth.mockResolvedValue(mockHealthResponse);

      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHealthResponse);

      // Verify detailed health structure
      const data = response.body.data;
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('version', '1.0.0');
      expect(data).toHaveProperty('environment', 'test');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('systemInfo');

      // Verify Elasticsearch service info
      expect(data.services.elasticsearch).toHaveProperty('status', 'ok');
      expect(data.services.elasticsearch).toHaveProperty('responseTime', 45);
      expect(data.services.elasticsearch).toHaveProperty(
        'clusterName',
        'test-cluster',
      );
      expect(data.services.elasticsearch.indexStats.totalDocuments).toBe(
        1000000,
      );

      // Verify system info
      expect(data.systemInfo).toHaveProperty('nodejs');
      expect(data.systemInfo).toHaveProperty('memory');
      expect(data.systemInfo.memory.used).toBe(125000000);
    });

    it('should handle partial service failures in detailed health', async () => {
      const partiallyHealthy = {
        ...mockHealthResponse,
        status: 'degraded',
        services: {
          elasticsearch: {
            status: 'error',
            responseTime: 0,
            error: 'Connection timeout',
            clusterName: null,
            clusterStatus: 'red',
            nodeCount: 0,
            indexStats: null,
          },
        },
      };

      healthService.getDetailedHealth.mockResolvedValue(partiallyHealthy);

      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('degraded');
      expect(response.body.data.services.elasticsearch.status).toBe('error');
      expect(response.body.data.services.elasticsearch.error).toBe(
        'Connection timeout',
      );
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness probe status', async () => {
      healthService.getHealth.mockResolvedValue({
        status: 'ok',
        timestamp: mockHealthResponse.timestamp,
        uptime: mockHealthResponse.uptime,
      });

      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
    });

    it('should return 503 when service is not alive', async () => {
      healthService.getHealth.mockResolvedValue({
        status: 'error',
        timestamp: mockHealthResponse.timestamp,
        uptime: mockHealthResponse.uptime,
      });

      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(503);
      expect(response.body.error).toContain('Service is not healthy');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness probe status', async () => {
      healthService.getDetailedHealth.mockResolvedValue(mockHealthResponse);

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.services.elasticsearch.status).toBe('ok');
    });

    it('should return 503 when dependencies are not ready', async () => {
      const notReadyResponse = {
        ...mockHealthResponse,
        status: 'error',
        services: {
          elasticsearch: {
            status: 'error',
            responseTime: 0,
            error: 'Index not ready',
            clusterStatus: 'red',
          },
        },
      };

      healthService.getDetailedHealth.mockResolvedValue(notReadyResponse);

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(503);
      expect(response.body.error).toContain(
        'Service dependencies are not ready',
      );
    });

    it('should accept degraded status as ready', async () => {
      const degradedResponse = {
        ...mockHealthResponse,
        status: 'degraded',
        services: {
          elasticsearch: {
            status: 'degraded',
            responseTime: 150,
            clusterStatus: 'yellow', // degraded but functional
            nodeCount: 1, // reduced but working
          },
        },
      };

      healthService.getDetailedHealth.mockResolvedValue(degradedResponse);

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('degraded');
    });
  });

  describe('Error Handling', () => {
    it('should handle health service errors gracefully', async () => {
      healthService.getHealth.mockRejectedValue(
        new Error('Health check service unavailable'),
      );

      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.statusCode).toBe(500);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle detailed health service errors', async () => {
      healthService.getDetailedHealth.mockRejectedValue(
        new Error('Cannot gather system metrics'),
      );

      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Response Performance', () => {
    it('should respond quickly to basic health checks', async () => {
      healthService.getHealth.mockResolvedValue({
        status: 'ok',
        timestamp: mockHealthResponse.timestamp,
        uptime: mockHealthResponse.uptime,
      });

      const start = Date.now();
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should respond within 100ms
      expect(response.body.success).toBe(true);
    });

    it('should include response timing in detailed health', async () => {
      const detailedHealth = {
        ...mockHealthResponse,
        services: {
          elasticsearch: {
            ...mockHealthResponse.services.elasticsearch,
            responseTime: 25, // Fast response
          },
        },
      };

      healthService.getDetailedHealth.mockResolvedValue(detailedHealth);

      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(response.body.data.services.elasticsearch.responseTime).toBe(25);
    });
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent response format across all health endpoints', async () => {
      // Mock successful responses
      healthService.getHealth.mockResolvedValue({
        status: 'ok',
        timestamp: mockHealthResponse.timestamp,
        uptime: mockHealthResponse.uptime,
      });
      healthService.getDetailedHealth.mockResolvedValue(mockHealthResponse);

      // Test all endpoints
      const endpoints = [
        '/health',
        '/health/detailed',
        '/health/live',
        '/health/ready',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .expect(200);

        // All should have standardized format
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(typeof response.body.timestamp).toBe('string');
      }
    });
  });
});
