import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { MediaItemDto } from '../../dto';

@ApiTags('Media')
@Controller('api/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get media item by ID',
    description: 'Retrieve detailed information about a specific media item',
  })
  @ApiParam({
    name: 'id',
    description: 'Media item ID',
    example: '258999077',
  })
  @ApiResponse({
    status: 200,
    description: 'Media item found',
    type: MediaItemDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Media item not found',
  })
  async getMediaItem(@Param('id') id: string): Promise<MediaItemDto> {
    return this.mediaService.getMediaItem(id);
  }
}
