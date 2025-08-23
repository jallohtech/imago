import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MediaItemDto {
  @ApiProperty({
    description: 'Unique image identifier',
    example: '258999077',
  })
  id!: string;

  @ApiProperty({
    description: 'Image number from the database',
    example: '258999077',
  })
  bildnummer!: string;

  @ApiProperty({
    description: 'Generated or extracted title for the image',
    example: 'Mountain Landscape at Sunset',
  })
  title!: string;

  @ApiProperty({
    description: 'Generated or extracted description for the image',
    example:
      'A breathtaking view of mountain peaks during golden hour with dramatic clouds.',
  })
  description!: string;

  @ApiProperty({
    description: 'Original search text from the database',
    example: 'Berg Landschaft Sonnenuntergang Natur Himmel Wolken',
  })
  searchText!: string;

  @ApiProperty({
    description: 'Photographer or agency name',
    example: 'ABACAPRESS',
  })
  photographer!: string;

  @ApiProperty({
    description: 'Image creation or upload date (ISO 8601 format)',
    example: '2023-08-15T10:30:00.000Z',
  })
  date!: string;

  @ApiProperty({
    description: 'Image width in pixels',
    example: 1920,
  })
  width!: number;

  @ApiProperty({
    description: 'Image height in pixels',
    example: 1080,
  })
  height!: number;

  @ApiProperty({
    description: 'Database type (st for stock, sp for sport)',
    example: 'st',
    enum: ['st', 'sp'],
  })
  database!: string;

  @ApiProperty({
    description: 'Full URL to the image',
    example: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
  })
  imageUrl!: string;

  @ApiProperty({
    description: 'URL to the thumbnail version of the image',
    example: 'https://www.imago-images.de/bild/st/0258999077/s.jpg',
  })
  thumbnailUrl!: string;

  @ApiPropertyOptional({
    description: 'Search result relevance score',
    example: 1.2345,
  })
  score?: number;

  @ApiPropertyOptional({
    description: 'Highlighted search matches',
    example: {
      searchText: ['Mountain <em>landscape</em> at sunset'],
      title: ['<em>Mountain</em> Landscape at Sunset'],
    },
  })
  highlights?: Record<string, string[]>;

  @ApiPropertyOptional({
    description: 'Image aspect ratio (width/height)',
    example: 1.777,
  })
  aspectRatio?: number;

  @ApiPropertyOptional({
    description: 'Orientation based on aspect ratio',
    example: 'landscape',
    enum: ['landscape', 'portrait', 'square'],
  })
  orientation?: 'landscape' | 'portrait' | 'square';

  @ApiPropertyOptional({
    description: 'Detected language of the content',
    example: 'de',
    enum: ['de', 'en', 'mixed'],
  })
  language?: string;

  @ApiPropertyOptional({
    description: 'Cleaned and normalized text without encoding issues',
    example: 'Berg Landschaft Sonnenuntergang Natur Himmel Wolken',
  })
  cleanedText?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes (if available)',
    example: 2048576,
  })
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Last modified date of the image file',
    example: '2023-08-15T10:30:00.000Z',
  })
  lastModified?: string;

  @ApiPropertyOptional({
    description: 'MIME type of the image',
    example: 'image/jpeg',
  })
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Image validation status',
    example: {
      isValid: true,
      statusCode: 200,
      errors: [],
    },
  })
  imageValidation?: {
    isValid: boolean;
    statusCode: number;
    errors: string[];
  };
}
