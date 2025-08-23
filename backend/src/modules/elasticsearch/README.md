# Elasticsearch Module

This module provides a secure and robust integration with Elasticsearch for the IMAGO media search application.

## Features

- **Secure Configuration**: Uses environment variables to avoid hardcoded credentials
- **SSL/TLS Support**: Configurable certificate validation for production/development
- **Connection Pooling**: Built-in connection management and health checks
- **Error Handling**: Comprehensive error handling with proper logging
- **Query Sanitization**: Protects against query injection attacks
- **Rate Limiting Support**: Configurable rate limiting for API protection

## Configuration

Configure the Elasticsearch connection using environment variables:

```bash
# Basic connection
ELASTICSEARCH_NODE=https://localhost:9200

# Authentication (choose one method)
# Method 1: Username/Password
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_secure_password

# Method 2: API Key
ELASTICSEARCH_API_KEY=your_api_key_here

# SSL/TLS settings
NODE_ENV=production  # Set to 'production' to enforce certificate validation
ELASTICSEARCH_CA_CERT=/path/to/ca.crt  # Optional: CA certificate path

# Performance tuning
ELASTICSEARCH_MAX_RETRIES=3
ELASTICSEARCH_REQUEST_TIMEOUT=30000
ELASTICSEARCH_COMPRESSION=true
```

## Usage

### Injecting the Service

```typescript
import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

@Injectable()
export class MediaService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}
}
```

### Search Operations

```typescript
// Simple search
const results = await this.elasticsearchService.search({
  index: 'media',
  query: {
    match: {
      description: 'landscape photography'
    }
  },
  size: 20,
  from: 0
});

// Search with aggregations
const results = await this.elasticsearchService.search({
  index: 'media',
  query: {
    bool: {
      must: [
        { match: { mediaType: 'image' } }
      ]
    }
  },
  aggregations: {
    photographers: {
      terms: {
        field: 'photographer.keyword',
        size: 10
      }
    }
  }
});

// Search with highlighting
const results = await this.elasticsearchService.search({
  index: 'media',
  query: {
    match: {
      searchText: 'sunset beach'
    }
  },
  highlight: {
    fields: {
      searchText: {}
    }
  }
});
```

### Document Operations

```typescript
// Get document by ID
const document = await this.elasticsearchService.get('media', 'doc-id');

// Get multiple documents
const documents = await this.elasticsearchService.mget('media', ['id1', 'id2', 'id3']);

// Count documents
const count = await this.elasticsearchService.count('media', {
  term: { mediaType: 'image' }
});
```

### Aggregations

```typescript
// Get aggregations without documents
const aggregations = await this.elasticsearchService.aggregate('media', {
  total_images: {
    filter: {
      term: { mediaType: 'image' }
    }
  },
  avg_file_size: {
    avg: {
      field: 'fileSize'
    }
  }
});
```

### Index Operations

```typescript
// Check if index exists
const exists = await this.elasticsearchService.indexExists('media');

// Get index mapping
const mapping = await this.elasticsearchService.getMapping('media');

// Get index statistics
const stats = await this.elasticsearchService.getIndexStats('media');
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files with real credentials
2. **SSL Certificates**: In production, always validate SSL certificates
3. **API Keys**: Use API keys instead of username/password when possible
4. **Query Sanitization**: The service automatically sanitizes queries to prevent injection
5. **Rate Limiting**: Enable rate limiting to prevent abuse

## Error Handling

The service provides detailed error handling:

- **ConnectionError**: Network/connection issues
- **ResponseError**: Invalid queries or server errors
- **RequestAbortedError**: Timeout or cancelled requests

All errors are logged with appropriate context for debugging.

## Health Monitoring

The service includes automatic health monitoring:

- Periodic health checks (configurable interval)
- Automatic reconnection on failure
- Cluster health status logging

## Best Practices

1. Always use typed queries instead of raw string queries
2. Implement proper pagination for large result sets
3. Use source filtering to retrieve only needed fields
4. Monitor cluster health and performance metrics
5. Set appropriate timeouts based on your use case