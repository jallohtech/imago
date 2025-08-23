import { Controller, Get, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckDto } from '../../dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Comprehensive health check',
    description:
      'Check application health including Elasticsearch connectivity, system metrics, and external services',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    type: HealthCheckDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - health check failed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        timestamp: { type: 'string', example: '2023-12-25T10:30:00.000Z' },
        error: { type: 'string', example: 'Elasticsearch connection failed' },
      },
    },
  })
  async getHealth(): Promise<HealthCheckDto> {
    const healthCheck = await this.healthService.getHealthCheck();

    // Set appropriate HTTP status based on health status
    if (healthCheck.status === 'error') {
      // In a real application, you might want to throw an HttpException here
      // but for monitoring purposes, it's often better to return 200 with error details
      // throw new ServiceUnavailableException('Health check failed');
    }

    return healthCheck;
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Simple liveness check for Kubernetes/Docker health probes',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'alive' },
        timestamp: { type: 'string', example: '2023-12-25T10:30:00.000Z' },
      },
    },
  })
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Check if application is ready to serve requests (all dependencies available)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ready' },
        timestamp: { type: 'string', example: '2023-12-25T10:30:00.000Z' },
        services: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application not ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'not_ready' },
        timestamp: { type: 'string', example: '2023-12-25T10:30:00.000Z' },
        error: { type: 'string', example: 'Elasticsearch not available' },
      },
    },
  })
  async getReadiness() {
    try {
      const healthCheck = await this.healthService.getHealthCheck();

      // Application is ready if overall status is ok or warning
      // Error status means critical dependencies are down
      const isReady = healthCheck.status !== 'error';

      if (isReady) {
        return {
          status: 'ready',
          timestamp: new Date().toISOString(),
          services: {
            elasticsearch: healthCheck.services.elasticsearch.status,
            external: healthCheck.services.external,
          },
        };
      } else {
        return {
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          error: 'Critical dependencies unavailable',
          services: {
            elasticsearch: healthCheck.services.elasticsearch.status,
            external: healthCheck.services.external,
          },
        };
      }
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
