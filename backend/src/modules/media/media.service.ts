import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchService } from '../search/search.service';
import { MediaItemDto } from '../../dto';

interface ImageMetadata {
  isValid: boolean;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
  lastModified?: string;
  errors?: string[];
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly baseImageUrl: string;

  constructor(
    private readonly searchService: SearchService,
    private readonly configService: ConfigService,
  ) {
    this.baseImageUrl = this.configService.get<string>(
      'app.baseImageUrl',
      'https://www.imago-images.de',
    );
  }

  async getMediaItem(id: string): Promise<MediaItemDto> {
    // Validate ID format
    if (!this.isValidMediaId(id)) {
      throw new BadRequestException('Invalid media ID format');
    }

    const mediaItem = await this.searchService.getMediaItem(id);

    if (!mediaItem) {
      throw new NotFoundException(`Media item with ID '${id}' not found`);
    }

    // Enhance media item with validated URL and metadata
    const enhancedMediaItem = await this.enhanceMediaItem(mediaItem);

    return enhancedMediaItem;
  }

  /**
   * Validate media ID format
   */
  private isValidMediaId(id: string): boolean {
    // Check if ID is a valid string (numeric or alphanumeric)
    const idPattern = /^[a-zA-Z0-9_-]+$/;
    return !!(id && id.length > 0 && id.length <= 50 && idPattern.test(id));
  }

  /**
   * Validate and construct image URL
   */
  private validateAndConstructImageUrl(db: string, bildnummer: string): string {
    // Validate database type
    const validDatabases = ['st', 'sp']; // stock, sport
    if (!validDatabases.includes(db)) {
      this.logger.warn(`Invalid database type: ${db}`);
      // Still construct URL but log warning
    }

    // Validate bildnummer format
    if (!/^\d+$/.test(bildnummer)) {
      this.logger.warn(`Invalid bildnummer format: ${bildnummer}`);
    }

    // Ensure bildnummer is 10 characters, zero-padded if shorter
    const paddedId = bildnummer.padStart(10, '0');

    // Construct URL with proper encoding
    const imageUrl = `${this.baseImageUrl}/bild/${encodeURIComponent(db)}/${encodeURIComponent(paddedId)}/s.jpg`;

    // Validate URL format
    try {
      new URL(imageUrl);
      return imageUrl;
    } catch (error) {
      this.logger.error(`Invalid URL constructed: ${imageUrl}`, error);
      throw new BadRequestException('Unable to construct valid image URL');
    }
  }

  /**
   * Get image metadata by making a HEAD request
   */
  private async getImageMetadata(imageUrl: string): Promise<ImageMetadata> {
    try {
      // Use a lightweight HEAD request to get metadata without downloading the image
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(imageUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const metadata: ImageMetadata = {
        isValid: response.ok,
        statusCode: response.status,
        contentType: response.headers.get('content-type') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
      };

      // Parse content length if available
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        metadata.contentLength = parseInt(contentLengthHeader, 10);
      }

      // Add validation errors if any
      const errors: string[] = [];

      if (!response.ok) {
        errors.push(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (metadata.contentType && !metadata.contentType.startsWith('image/')) {
        errors.push(`Invalid content type: ${metadata.contentType}`);
      }

      if (metadata.contentLength && metadata.contentLength === 0) {
        errors.push('Image file appears to be empty');
      }

      if (errors.length > 0) {
        metadata.errors = errors;
      }

      return metadata;
    } catch (error) {
      this.logger.warn(`Failed to get image metadata for ${imageUrl}`, error);

      return {
        isValid: false,
        errors: [
          `Network error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        ],
      };
    }
  }

  /**
   * Enhance media item with validated URLs and metadata
   */
  private async enhanceMediaItem(
    mediaItem: MediaItemDto,
  ): Promise<MediaItemDto> {
    try {
      // Validate and construct proper image URL
      const validatedImageUrl = this.validateAndConstructImageUrl(
        mediaItem.database,
        mediaItem.bildnummer,
      );

      // Get image metadata
      const metadata = await this.getImageMetadata(validatedImageUrl);

      // Create an enhanced media item with optional properties
      const enhancedItem = {
        ...mediaItem,
        imageUrl: validatedImageUrl,
        thumbnailUrl: validatedImageUrl, // For now, the same URL. Could be different size in future
        // Add optional metadata properties
        ...(metadata.contentLength !== undefined && {
          fileSize: metadata.contentLength,
        }),
        ...(metadata.lastModified !== undefined && {
          lastModified: metadata.lastModified,
        }),
        ...(metadata.contentType !== undefined && {
          mimeType: metadata.contentType,
        }),
        imageValidation: {
          isValid: metadata.isValid,
          statusCode: metadata.statusCode ?? 0,
          errors: metadata.errors ?? [],
        },
      } as MediaItemDto;

      return enhancedItem;
    } catch (error) {
      this.logger.error(`Failed to enhance media item ${mediaItem.id}`, error);
      // Return original item if enhancement fails
      return mediaItem;
    }
  }

  /**
   * Validate multiple image URLs in batch
   */
  async validateImageUrls(
    imageUrls: string[],
  ): Promise<Record<string, ImageMetadata>> {
    const results: Record<string, ImageMetadata> = {};

    // Process in batches to avoid overwhelming the server
    const batchSize = 5;
    const batches: string[][] = [];

    for (let i = 0; i < imageUrls.length; i += batchSize) {
      batches.push(imageUrls.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (url) => {
        const metadata = await this.getImageMetadata(url);
        return { url, metadata };
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        const url = batch[index];
        if (result.status === 'fulfilled') {
          results[url] = result.value.metadata;
        } else {
          results[url] = {
            isValid: false,
            errors: [`Failed to validate: ${result.reason}`],
          };
        }
      });
    }

    return results;
  }
}
