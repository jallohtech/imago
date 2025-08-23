import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElasticsearchService } from './elasticsearch.service';
import elasticsearchConfig from '../../config/elasticsearch.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(elasticsearchConfig)],
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class ElasticsearchModule {}
