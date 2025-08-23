import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    // Import Elasticsearch module for search functionality
    ElasticsearchModule,

    // Import Config module for accessing configuration
    ConfigModule,

    // Configure caching for search results to improve performance
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // Cache TTL in milliseconds (default: 60 seconds)
        ttl: configService.get<number>('app.cache.ttl', 60) * 1000,

        // Maximum number of items in cache (default: 1000)
        max: configService.get<number>('app.cache.max', 1000),
      }),
      inject: [ConfigService],
    }),
  ],

  controllers: [SearchController],
  providers: [SearchService],

  // Export SearchService so other modules can use it
  exports: [SearchService],
})
export class SearchModule {}
