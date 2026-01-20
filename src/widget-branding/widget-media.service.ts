import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class WidgetMediaService {
  private readonly logger = new Logger(WidgetMediaService.name);

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Upload widget media (logo, images, icons) to Firebase Storage
   */
  async uploadMedia(
    file: any,
    mediaType: 'logo' | 'icon' | 'image' = 'image',
    customFileName?: string,
  ): Promise<{
    fileName: string;
    fileUrl: string;
    storagePath: string;
    mimeType: string;
    fileSize: number;
  }> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size (max 5MB for widget media)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Validate file type - only images allowed for widget branding
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: JPEG, JPG, PNG, GIF, SVG, WEBP',
      );
    }

    try {
      // Upload to Firebase Storage in widget_media folder with custom fileName
      const uploadResult = await this.firebaseService.uploadFile(
        file,
        `widget_media/${mediaType}s`,
        customFileName,
      );

      this.logger.log(
        `Widget media uploaded: ${file.originalname} (${mediaType})`,
      );

      return {
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.fileUrl,
        storagePath: uploadResult.storagePath,
        mimeType: file.mimetype,
        fileSize: file.size,
      };
    } catch (error) {
      this.logger.error('Failed to upload widget media:', error);

      // Provide detailed error message
      const errorMessage = error?.message || 'Failed to upload widget media';
      throw new BadRequestException(`Upload failed: ${errorMessage}`);
    }
  }

  /**
   * Delete widget media from Firebase Storage
   */
  async deleteMedia(storagePath: string): Promise<void> {
    try {
      await this.firebaseService.deleteFile(storagePath);
      this.logger.log(`Widget media deleted: ${storagePath}`);
    } catch (error) {
      this.logger.error('Failed to delete widget media:', error);
      throw new BadRequestException('Failed to delete widget media');
    }
  }

  /**
   * Validate image dimensions (optional utility)
   */
  validateImageDimensions(
    width: number,
    height: number,
    maxWidth: number = 1000,
    maxHeight: number = 1000,
  ): boolean {
    return width <= maxWidth && height <= maxHeight;
  }
}
