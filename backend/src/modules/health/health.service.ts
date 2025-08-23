import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import {
  HealthCheckDto,
  ServiceHealthDto,
  ElasticsearchHealthDto,
  ElasticsearchClusterDto,
  PerformanceMetricsDto,
  MemoryMetricsDto,
  CpuMetricsDto,
  ExternalServiceHealthDto,
} from '../../dto';
import * as os from 'os';
import * as process from 'process';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private gcMetrics = { collections: 0, time: 0 };

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {
    this.initializeGCMetrics();
  }

  /**
   * Get comprehensive health check
   */
  async getHealthCheck(): Promise<HealthCheckDto> {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    try {
      // Run all health checks in parallel
      const [services, metrics] = await Promise.all([
        this.checkServices(),
        this.getPerformanceMetrics(),
      ]);

      // Determine overall status
      const overallStatus = this.determineOverallStatus(services);

      return {
        status: overallStatus,
        timestamp,
        uptime,
        version: this.getApplicationVersion(),
        environment: this.getEnvironment(),
        services,
        metrics,
        details: {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          pid: process.pid,
        },
      };
    } catch (error) {
      this.logger.error('Health check failed', error);

      return {
        status: 'error',
        timestamp,
        uptime,
        version: this.getApplicationVersion(),
        environment: this.getEnvironment(),
        services: this.getFailedServicesStatus(),
        metrics: await this.getPerformanceMetrics(),
        details: {
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  }

  /**
   * Check all services health
   */
  private async checkServices(): Promise<ServiceHealthDto> {
    const [elasticsearch, external] = await Promise.all([
      this.checkElasticsearch(),
      this.checkExternalServices(),
    ]);

    return {
      elasticsearch,
      external,
    };
  }

  /**
   * Check Elasticsearch health
   */
  private async checkElasticsearch(): Promise<ElasticsearchHealthDto> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      const client = this.elasticsearchService.getClient();
      const pingPromise = client.ping();

      // Get cluster info
      const [, clusterHealth, clusterInfo] = await Promise.all([
        pingPromise,
        client.cluster.health().catch(() => null),
        client.info().catch(() => null),
      ]);

      const responseTime = Date.now() - startTime;

      // Build cluster information
      const cluster: ElasticsearchClusterDto = {
        name: clusterInfo?.cluster_name || 'unknown',
        health:
          (clusterHealth?.status?.toLowerCase() as
            | 'green'
            | 'yellow'
            | 'red') || 'red',
        numberOfNodes: clusterHealth?.number_of_nodes || 0,
        numberOfDataNodes: clusterHealth?.number_of_data_nodes || 0,
        activePrimaryShards: clusterHealth?.active_primary_shards || 0,
        activeShards: clusterHealth?.active_shards || 0,
        version: clusterInfo?.version?.number || 'unknown',
      };

      return {
        status: 'connected',
        responseTime,
        cluster,
        lastConnected: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Elasticsearch health check failed', error);

      return {
        status: 'error',
        responseTime,
        cluster: {
          name: 'unknown',
          health: 'red',
          numberOfNodes: 0,
          numberOfDataNodes: 0,
          activePrimaryShards: 0,
          activeShards: 0,
          version: 'unknown',
        },
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check external services (e.g., IMAGO image service)
   */
  private async checkExternalServices(): Promise<
    Record<string, ExternalServiceHealthDto>
  > {
    const services: Record<string, ExternalServiceHealthDto> = {};

    // Check IMAGO image service
    services.imagoImages = await this.checkImagoImageService();

    return services;
  }

  /**
   * Check IMAGO image service availability
   */
  private async checkImagoImageService(): Promise<ExternalServiceHealthDto> {
    const baseUrl = this.configService.get<string>(
      'app.baseImageUrl',
      'https://www.imago-images.de',
    );
    const testUrl = `${baseUrl}/favicon.ico`; // Test with a lightweight resource

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'ok',
          responseTime,
        };
      } else {
        return {
          status: 'degraded',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'down',
        responseTime,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<PerformanceMetricsDto> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const memory: MemoryMetricsDto = {
      used: usedMemory,
      total: totalMemory,
      percentage: (usedMemory / totalMemory) * 100,
      heap: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
    };

    const loadAverages = os.loadavg();
    const cpu: CpuMetricsDto = {
      usage: await this.getCpuUsage(),
      loadAverage: loadAverages,
    };

    const eventLoopLag = await this.measureEventLoopLag();

    return {
      memory,
      cpu,
      eventLoopLag,
      gc: this.gcMetrics,
    };
  }

  /**
   * Measure CPU usage
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = Date.now();

        const elapsedTime = currentTime - startTime;
        const cpuPercent =
          (currentUsage.user + currentUsage.system) / (elapsedTime * 1000);

        resolve(Math.round(cpuPercent * 100 * 100) / 100); // Round to 2 decimal places
      }, 100);
    });
  }

  /**
   * Measure event loop lag
   */
  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();

      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(Math.round(lag * 100) / 100); // Round to 2 decimal places
      });
    });
  }

  /**
   * Initialize garbage collection metrics tracking
   */
  private initializeGCMetrics(): void {
    try {
      // Try to access performance hooks if available
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const perf_hooks = require('perf_hooks') as {
        PerformanceObserver?: new (
          callback: (list: {
            getEntries(): Array<{ entryType: string; duration: number }>;
          }) => void,
        ) => {
          observe(options: { entryTypes: string[] }): void;
        };
      };

      if (perf_hooks?.PerformanceObserver) {
        const obs = new perf_hooks.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'gc') {
              this.gcMetrics.collections++;
              this.gcMetrics.time += entry.duration;
            }
          }
        });

        obs.observe({ entryTypes: ['gc'] });
      }
    } catch {
      // GC metrics not available, keep default values
      this.logger.debug('GC metrics not available');
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    services: ServiceHealthDto,
  ): 'ok' | 'warning' | 'error' {
    // Check Elasticsearch status
    if (services.elasticsearch.status === 'error') {
      return 'error';
    }

    if (services.elasticsearch.status === 'disconnected') {
      return 'warning';
    }

    // Check cluster health
    if (services.elasticsearch.cluster.health === 'red') {
      return 'error';
    }

    if (services.elasticsearch.cluster.health === 'yellow') {
      return 'warning';
    }

    // Check external services
    if (services.external) {
      const externalStatuses = Object.values(services.external);

      if (externalStatuses.some((service) => service.status === 'down')) {
        return 'warning'; // External services down is warning, not error
      }

      if (externalStatuses.some((service) => service.status === 'degraded')) {
        return 'warning';
      }
    }

    return 'ok';
  }

  /**
   * Get the application version
   */
  private getApplicationVersion(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageJson = require('../../../package.json') as {
        version?: string;
      };
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Get environment name
   */
  private getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Get failed services status when main health check fails
   */
  private getFailedServicesStatus(): ServiceHealthDto {
    return {
      elasticsearch: {
        status: 'error',
        responseTime: 0,
        cluster: {
          name: 'unknown',
          health: 'red',
          numberOfNodes: 0,
          numberOfDataNodes: 0,
          activePrimaryShards: 0,
          activeShards: 0,
          version: 'unknown',
        },
        error: 'Health check failed',
      },
    };
  }
}
