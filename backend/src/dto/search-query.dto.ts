import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortField {
  RELEVANCE = '_score',
  DATE = 'datum',
  IMAGE_ID = 'bildnummer',
  WIDTH = 'breite',
  HEIGHT = 'hoehe',
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query string for keyword-based search',
    example: 'nature landscape mountain',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  q?: string;

  @ApiPropertyOptional({
    description: 'Number of results to return per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number = 20;

  @ApiPropertyOptional({
    description: 'Number of results to skip (for pagination)',
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  from: number = 0;

  @ApiPropertyOptional({
    description: 'Field to sort results by',
    enum: SortField,
    default: SortField.RELEVANCE,
    example: SortField.DATE,
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy: SortField = SortField.RELEVANCE;

  @ApiPropertyOptional({
    description: 'Sort order (ascending or descending)',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Filter by photographer name',
    example: 'ABACAPRESS',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  photographer?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range start (ISO 8601 format)',
    example: '2023-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range end (ISO 8601 format)',
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum image width',
    minimum: 1,
    example: 1920,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minWidth?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum image width',
    minimum: 1,
    example: 7680,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxWidth?: number;

  @ApiPropertyOptional({
    description: 'Filter by minimum image height',
    minimum: 1,
    example: 1080,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minHeight?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum image height',
    minimum: 1,
    example: 4320,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxHeight?: number;

  @ApiPropertyOptional({
    description: 'Database type filter (st for stock, sp for sport)',
    example: 'st',
    enum: ['st', 'sp'],
  })
  @IsOptional()
  @IsString()
  db?: string;

  @ApiPropertyOptional({
    description: 'Specific image IDs to search for',
    type: [String],
    example: ['258999077', '123456789'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return Array.isArray(value) ? value : undefined;
  })
  imageIds?: string[];

  @ApiPropertyOptional({
    description: 'Enable search result highlighting',
    default: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  highlight: boolean = false;
}
