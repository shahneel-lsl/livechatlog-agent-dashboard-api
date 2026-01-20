import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupDocument } from '../database/mysql/group-document.entity';
import { Group } from '../database/mysql/group.entity';
import { Agent } from '../database/mysql/agent.entity';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class GroupDocumentService {
  private readonly logger = new Logger(GroupDocumentService.name);

  constructor(
    @InjectRepository(GroupDocument)
    private groupDocumentRepository: Repository<GroupDocument>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Upload a document for a group
   */
  async uploadDocument(
    groupId: string,
    file: any,
    agent: Agent,
  ): Promise<GroupDocument> {
    // Validate group exists
    const group = await this.groupRepository.findOne({
      where: { id: groupId, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Validate file type
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
      throw new BadRequestException(
        'Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG, GIF, MP4, MOV',
      );
    }

    try {
      // Upload to Firebase Storage
      const uploadResult = await this.firebaseService.uploadFile(
        file,
        `groups/${groupId}/documents`,
      );

      // Save document metadata to database
      const document = this.groupDocumentRepository.create({
        groupId,
        fileName: uploadResult.fileName,
        originalFileName: file.originalname,
        fileUrl: uploadResult.fileUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath: uploadResult.storagePath,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        uploadedBy: agent.id,
      });

      const savedDocument = await this.groupDocumentRepository.save(document);

      this.logger.log(
        `Document uploaded for group ${groupId}: ${file.originalname}`,
      );

      return savedDocument;
    } catch (error) {
      this.logger.error('Failed to upload document:', error);
      
      // Throw specific error message
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // Provide detailed error message for other errors
      const errorMessage = error?.message || 'Failed to upload document';
      throw new BadRequestException(`Failed to upload document: ${errorMessage}`);
    }
  }

  /**
   * Get all documents for a group
   */
  async getGroupDocuments(groupId: string): Promise<GroupDocument[]> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.groupDocumentRepository.find({
      where: { groupId, isDeleted: false },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single document by ID
   */
  async getDocument(documentId: string): Promise<GroupDocument> {
    const document = await this.groupDocumentRepository.findOne({
      where: { id: documentId, isDeleted: false },
      relations: ['group', 'uploader'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    documentId: string,
    agent: Agent,
  ): Promise<{ success: boolean; message: string }> {
    const document = await this.groupDocumentRepository.findOne({
      where: { id: documentId, isDeleted: false },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    try {
      // Delete from Firebase Storage
      if (document.storagePath) {
        await this.firebaseService.deleteFile(document.storagePath);
      }

      // Soft delete from database
      document.isDeleted = true;
      document.deletedAt = new Date();
      await this.groupDocumentRepository.save(document);

      this.logger.log(
        `Document ${documentId} deleted by agent ${agent.id}`,
      );

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to delete document:', error);
      throw new BadRequestException('Failed to delete document');
    }
  }

  /**
   * Get document statistics for a group
   */
  async getDocumentStats(groupId: string): Promise<{
    totalDocuments: number;
    totalSize: number;
    documentsByType: Record<string, number>;
  }> {
    const documents = await this.groupDocumentRepository.find({
      where: { groupId, isDeleted: false },
    });

    const totalSize = documents.reduce((sum, doc) => sum + Number(doc.fileSize), 0);

    const documentsByType = documents.reduce((acc, doc) => {
      const type = doc.mimeType.split('/')[1] || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalDocuments: documents.length,
      totalSize,
      documentsByType,
    };
  }
}
