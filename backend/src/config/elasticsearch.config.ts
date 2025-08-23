import { registerAs } from '@nestjs/config';

export default registerAs('elasticsearch', () => ({
  node: process.env.ELASTICSEARCH_NODE || 'https://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
    apiKey: process.env.ELASTICSEARCH_API_KEY,
  },
  tls: {
    // Allow self-signed certificates in development
    rejectUnauthorized: process.env.ELASTICSEARCH_REJECT_UNAUTHORIZED === 'true' || false,
    // Optional: Path to CA certificate file
    ca: process.env.ELASTICSEARCH_CA_CERT,
  },
  maxRetries: parseInt(process.env.ELASTICSEARCH_MAX_RETRIES || '3', 10),
  requestTimeout: parseInt(
    process.env.ELASTICSEARCH_REQUEST_TIMEOUT || '30000',
    10,
  ),
  sniffOnStart: process.env.ELASTICSEARCH_SNIFF_ON_START === 'true',
  sniffInterval: parseInt(
    process.env.ELASTICSEARCH_SNIFF_INTERVAL || '60000',
    10,
  ),
  sniffOnConnectionFault:
    process.env.ELASTICSEARCH_SNIFF_ON_CONNECTION_FAULT !== 'false',
  resurrectStrategy: 'ping' as const,
  compression: process.env.ELASTICSEARCH_COMPRESSION === 'true',
  // Connection pool configuration
  pool: {
    maxRetries: parseInt(process.env.ELASTICSEARCH_POOL_MAX_RETRIES || '3', 10),
    requestTimeout: parseInt(
      process.env.ELASTICSEARCH_POOL_REQUEST_TIMEOUT || '30000',
      10,
    ),
    sniffInterval: parseInt(
      process.env.ELASTICSEARCH_POOL_SNIFF_INTERVAL || '60000',
      10,
    ),
  },
  // Index configuration
  index: process.env.ELASTICSEARCH_INDEX || 'imago',
  indices: {
    media: process.env.ELASTICSEARCH_MEDIA_INDEX || 'media',
    imago: process.env.ELASTICSEARCH_INDEX || 'imago',
  },
  // Security headers for API responses
  security: {
    enableApiKeyAuth: process.env.ELASTICSEARCH_ENABLE_API_KEY_AUTH === 'true',
    enableRateLimiting:
      process.env.ELASTICSEARCH_ENABLE_RATE_LIMITING !== 'false',
    rateLimit: {
      windowMs: parseInt(
        process.env.ELASTICSEARCH_RATE_LIMIT_WINDOW_MS || '60000',
        10,
      ),
      max: parseInt(process.env.ELASTICSEARCH_RATE_LIMIT_MAX || '100', 10),
    },
  },
}));
