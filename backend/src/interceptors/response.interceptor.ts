import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { StandardResponseDto } from '../dto/common/api-response.dto';
import { SearchResponseDto } from '../dto/search-response.dto';

// Decorator to skip response wrapping for specific endpoints
export const SKIP_RESPONSE_WRAPPING = 'skipResponseWrapping';
export const SkipResponseWrapping = () =>
  Reflector.createDecorator<boolean>({ key: SKIP_RESPONSE_WRAPPING });

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponseDto<T> | T>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponseDto<T> | T> {
    // Check if response wrapping should be skipped
    const skipWrapping = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_WRAPPING,
      [context.getHandler(), context.getClass()],
    );

    if (skipWrapping) {
      return next.handle() as Observable<T>;
    }

    return next.handle().pipe(
      map((data: T): StandardResponseDto<T> => {
        // If data is already in standard format, return as-is
        if (this.isStandardResponse(data)) {
          return data as StandardResponseDto<T>;
        }

        // Extract metadata from search responses
        let metadata: Record<string, unknown> | undefined;
        let responseData: T = data;

        if (this.isSearchResponse(data)) {
          const searchData = data as SearchResponseDto;
          metadata = {
            pagination: {
              page: searchData.metadata.page,
              size: searchData.metadata.size,
              total: searchData.metadata.total,
              totalPages: searchData.metadata.totalPages,
              hasMore: searchData.metadata.hasMore,
            },
            timing: {
              took: searchData.metadata.took,
            },
          };

          // Include additional search metadata
          if (searchData.facets) {
            metadata.facets = searchData.facets;
          }
          if (searchData.stats) {
            metadata.stats = searchData.stats;
          }
          if (searchData.suggestions) {
            metadata.suggestions = searchData.suggestions;
          }
          if (searchData.warnings) {
            metadata.warnings = searchData.warnings;
          }

          // Keep the full search response structure for frontend compatibility
          responseData = {
            results: searchData.results,
            total: searchData.metadata.total,
            facets: searchData.facets,
            stats: searchData.stats,
            suggestions: searchData.suggestions,
            warnings: searchData.warnings,
          } as T;
        }

        // Wrap in standard response format
        return {
          success: true,
          data: responseData,
          timestamp: new Date().toISOString(),
          ...(metadata && { metadata }),
        };
      }),
    );
  }

  private isStandardResponse(
    data: unknown,
  ): data is StandardResponseDto<unknown> {
    return (
      data !== null &&
      typeof data === 'object' &&
      'success' in data &&
      typeof (data as Record<string, unknown>).success === 'boolean' &&
      'timestamp' in data &&
      typeof (data as Record<string, unknown>).timestamp === 'string'
    );
  }

  private isSearchResponse(data: unknown): data is SearchResponseDto {
    return (
      data !== null &&
      typeof data === 'object' &&
      'results' in data &&
      Array.isArray((data as Record<string, unknown>).results) &&
      'metadata' in data &&
      typeof (data as Record<string, unknown>).metadata === 'object' &&
      (data as Record<string, unknown>).metadata !== null &&
      'total' in
        ((data as Record<string, unknown>).metadata as Record<
          string,
          unknown
        >) &&
      typeof (
        (data as Record<string, unknown>).metadata as Record<string, unknown>
      ).total === 'number'
    );
  }
}
