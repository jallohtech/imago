import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // Base URL for IMAGO images
  baseImageUrl: process.env.BASE_IMAGE_URL || 'https://www.imago-images.de',

  // Default pagination settings
  pagination: {
    defaultSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },

  // Search configuration
  search: {
    maxQueryLength: parseInt(process.env.MAX_QUERY_LENGTH || '500', 10),
    maxImageIds: parseInt(process.env.MAX_IMAGE_IDS || '50', 10),
    highlightEnabled: process.env.SEARCH_HIGHLIGHT_ENABLED !== 'false',
    facetsEnabled: process.env.SEARCH_FACETS_ENABLED !== 'false',
    suggestionsEnabled: process.env.SEARCH_SUGGESTIONS_ENABLED !== 'false',
  },

  // Cache configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '60', 10), // seconds
    max: parseInt(process.env.CACHE_MAX || '1000', 10), // items
    searchTtl: parseInt(process.env.SEARCH_CACHE_TTL || '30', 10), // seconds
    mediaTtl: parseInt(process.env.MEDIA_CACHE_TTL || '300', 10), // seconds
    fieldsTtl: parseInt(process.env.FIELDS_CACHE_TTL || '3600', 10), // seconds
  },

  // Data quality settings
  dataQuality: {
    enableTextCleaning: process.env.ENABLE_TEXT_CLEANING !== 'false',
    enableTitleGeneration: process.env.ENABLE_TITLE_GENERATION !== 'false',
    enableDescriptionGeneration:
      process.env.ENABLE_DESCRIPTION_GENERATION !== 'false',
    enableLanguageDetection: process.env.ENABLE_LANGUAGE_DETECTION !== 'false',
    warnOnQualityIssues: process.env.WARN_ON_QUALITY_ISSUES !== 'false',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableSearchLogging: process.env.ENABLE_SEARCH_LOGGING !== 'false',
    enablePerformanceLogging:
      process.env.ENABLE_PERFORMANCE_LOGGING !== 'false',
  },
}));
