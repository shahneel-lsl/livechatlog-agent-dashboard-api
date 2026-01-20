import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GroupDocumentService } from './group-document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/groups')
@UseGuards(JwtAuthGuard)
export class GroupDocumentController {
  constructor(private readonly groupDocumentService: GroupDocumentService) {}

  /**
   * Upload a document for a group
   * Single file upload only
   */
  @Post(':groupId/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        // Validate file type at interceptor level
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
          'image/jpeg',
          'image/png',
          'image/gif',
          'video/mp4',
          'video/quicktime', // MOV
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `File type '${file.mimetype}' not allowed. Supported types: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG, GIF, MP4, MOV`,
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadDocument(
    @Param('groupId') groupId: string,
    @UploadedFile() file: any,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please select a file to upload.');
    }

    try {
      return await this.groupDocumentService.uploadDocument(groupId, file, req.user);
    } catch (error) {
      // Re-throw with detailed error message
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to upload document',
      );
    }
  }

  /**
   * Get all documents for a group
   */
  @Get(':groupId/documents')
  async getGroupDocuments(@Param('groupId') groupId: string) {
    return this.groupDocumentService.getGroupDocuments(groupId);
  }

  /**
   * Get a single document by ID
   */
  @Get('documents/:documentId')
  async getDocument(@Param('documentId') documentId: string) {
    return this.groupDocumentService.getDocument(documentId);
  }

  /**
   * Delete a document
   */
  @Delete('documents/:documentId')
  @HttpCode(HttpStatus.OK)
  async deleteDocument(@Param('documentId') documentId: string, @Request() req) {
    return this.groupDocumentService.deleteDocument(documentId, req.user);
  }

  /**
   * Get document statistics for a group
   */
  @Get(':groupId/documents/stats')
  async getDocumentStats(@Param('groupId') groupId: string) {
    return this.groupDocumentService.getDocumentStats(groupId);
  }
}
