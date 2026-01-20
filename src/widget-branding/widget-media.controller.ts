import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WidgetMediaService } from './widget-media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/widget-media')
@UseGuards(JwtAuthGuard)
export class WidgetMediaController {
  constructor(private readonly widgetMediaService: WidgetMediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @UploadedFile() file: any,
    @Body('mediaType') mediaType?: 'logo' | 'icon' | 'image',
    @Body('fileName') fileName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.widgetMediaService.uploadMedia(
      file,
      mediaType || 'image',
      fileName,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(@Body('storagePath') storagePath: string) {
    if (!storagePath) {
      throw new BadRequestException('Storage path is required');
    }

    return this.widgetMediaService.deleteMedia(storagePath);
  }
}
