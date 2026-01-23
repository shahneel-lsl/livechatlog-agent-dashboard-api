import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Patch,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { ConversationManagementService } from './services/conversation-management.service';
import { ChatMediaService } from './services/chat-media.service';
import { CreateWidgetSessionDto } from './dto/create-widget-session.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { UpdateTypingDto } from './dto/update-typing.dto';
import { UpdateMessageStatusDto, BulkUpdateMessageStatusDto } from './dto/update-message-status.dto';
import { CloseConversationDto } from './dto/close-conversation.dto';
import { ReopenConversationDto } from './dto/reopen-conversation.dto';
import { AddTagsDto } from './dto/add-tag.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { GetConversationsDto } from './dto/get-conversations.dto';
import { SendMediaMessageDto } from './dto/send-media-message.dto';
import { EventAuthorType } from '../database/mysql/event.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('v1')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly conversationManagementService: ConversationManagementService,
    private readonly chatMediaService: ChatMediaService,
  ) {}

  // Public endpoint - no auth required
  @Post('widget/session')
  @HttpCode(HttpStatus.CREATED)
  createSession(
    @Body() createWidgetSessionDto: CreateWidgetSessionDto,
    @Request() req,
  ) {
    return this.chatService.createWidgetSession(createWidgetSessionDto, req);
  }

  // Protected endpoints
  @Post('conversations/:conversationId/events')
  @Throttle({ short: { limit: 5, ttl: 1000 } }) // 5 messages per second per conversation
  createEvent(
    @Param('conversationId') conversationId: string,
    @Body() createEventDto: CreateEventDto,
    @Request() req,
  ) {
    return this.chatService.createConversationEvent(
      conversationId,
      createEventDto,
      req.user,
    );
  }

  @Post('conversations/:conversationId/assign')
  @UseGuards(JwtAuthGuard)
  assignConversation(
    @Param('conversationId') conversationId: string,
    @Body() assignConversationDto: AssignConversationDto,
  ) {
    return this.chatService.assignConversation(
      conversationId,
      assignConversationDto,
    );
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  getConversation(@Param('id') id: string) {
    return this.chatService.getConversation(id);
  }

  @Get('threads/:threadId/events')
  @UseGuards(JwtAuthGuard)
  getThreadEvents(@Param('threadId') threadId: string) {
    return this.chatService.getThreadEvents(threadId);
  }

  // Typing indicators
  @Post('conversations/:conversationId/typing/agent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  updateAgentTyping(
    @Param('conversationId') conversationId: string,
    @Body() updateTypingDto: UpdateTypingDto,
    @Request() req,
  ) {
    return this.chatService.updateAgentTyping(
      conversationId,
      req.user.id,
      updateTypingDto.isTyping,
    );
  }

  @Post('conversations/:conversationId/typing/visitor')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateVisitorTyping(
    @Param('conversationId') conversationId: string,
    @Body() updateTypingDto: UpdateTypingDto,
  ) {
    return this.chatService.updateVisitorTyping(
      conversationId,
      updateTypingDto.isTyping,
      updateTypingDto.preview,
    );
  }

  // Message status updates
  @Patch('conversations/:conversationId/messages/:messageId/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateMessageStatus(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() updateStatusDto: UpdateMessageStatusDto,
  ) {
    return this.chatService.updateMessageStatus(
      conversationId,
      messageId,
      updateStatusDto.status,
    );
  }

  @Patch('conversations/:conversationId/messages/bulk-status')
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkUpdateMessageStatus(
    @Param('conversationId') conversationId: string,
    @Body() bulkUpdateDto: BulkUpdateMessageStatusDto,
  ) {
    return this.chatService.bulkUpdateMessageStatus(
      conversationId,
      bulkUpdateDto.messageIds,
      bulkUpdateDto.status,
    );
  }

  // ==========================================
  // CONVERSATION MANAGEMENT ENDPOINTS
  // ==========================================

  /**
   * Get all conversations with filters, sorting, and pagination
   * Supports: status, channel, tags, priority, search, sorting
   */
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  getConversations(@Query() filters: GetConversationsDto) {
    this.logger.log(`GET /v1/conversations called with query params: ${JSON.stringify(filters)}`);
    this.logger.log(`Status filter received: ${JSON.stringify(filters.status)}, type: ${typeof filters.status}, isArray: ${Array.isArray(filters.status)}`);
    return this.conversationManagementService.getConversations(filters);
  }

  /**
   * Close a conversation (LiveChat Inc style - closes active thread)
   * Public endpoint - can be called by agents (authenticated) or visitors
   */
  @Post('conversations/:conversationId/close')
  closeConversation(
    @Param('conversationId') conversationId: string,
    @Body() closeDto: CloseConversationDto,
    @Request() req,
  ) {
    return this.conversationManagementService.closeConversation(
      conversationId,
      closeDto,
      req.user, // Will be undefined for visitors
    );
  }

  /**
   * Reopen a closed conversation (creates new thread)
   */
  @Post('conversations/:conversationId/reopen')
  @UseGuards(JwtAuthGuard)
  reopenConversation(
    @Param('conversationId') conversationId: string,
    @Body() reopenDto: ReopenConversationDto,
    @Request() req,
  ) {
    return this.conversationManagementService.reopenConversation(
      conversationId,
      reopenDto,
      req.user,
    );
  }

  /**
   * Add tags to a conversation
   */
  @Post('conversations/:conversationId/tags')
  @UseGuards(JwtAuthGuard)
  addTagsToConversation(
    @Param('conversationId') conversationId: string,
    @Body() addTagsDto: AddTagsDto,
  ) {
    return this.conversationManagementService.addTagsToConversation(
      conversationId,
      addTagsDto.tagIds,
    );
  }

  /**
   * Remove a tag from a conversation
   */
  @Delete('conversations/:conversationId/tags/:tagId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  removeTagFromConversation(
    @Param('conversationId') conversationId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.conversationManagementService.removeTagFromConversation(
      conversationId,
      tagId,
    );
  }

  /**
   * Perform bulk actions on multiple conversations
   */
  @Post('conversations/bulk')
  @UseGuards(JwtAuthGuard)
  performBulkAction(@Body() bulkActionDto: BulkActionDto, @Request() req) {
    return this.conversationManagementService.performBulkAction(
      bulkActionDto,
      req.user,
    );
  }

  // ============================================
  // MEDIA ENDPOINTS
  // ============================================

  /**
   * Upload and send media (image, video, document, GIF) in a conversation
   */
  @Post('conversations/:conversationId/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          // Videos
          'video/mp4',
          'video/quicktime', // MOV
          'video/x-msvideo', // AVI
          'video/webm',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `File type '${file.mimetype}' not allowed. Supported: Images (JPG, PNG, GIF, WEBP), Videos (MP4, MOV, AVI, WEBM), Documents (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV)`,
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async sendMediaToConversation(
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: any,
    @Body() body: { caption?: string; authorType?: string },
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please select a file.');
    }

    const authorType = (body.authorType as EventAuthorType) || EventAuthorType.AGENT;
    const caption = body.caption || '';

    return this.chatMediaService.sendMediaToConversation(
      conversationId,
      file,
      caption,
      authorType,
      req.user,
    );
  }

  /**
   * Upload and send media in a specific thread
   */
  @Post('threads/:threadId/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/quicktime',
          'video/x-msvideo',
          'video/webm',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `File type '${file.mimetype}' not allowed.`,
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async sendMediaToThread(
    @Param('threadId') threadId: string,
    @Query('conversationId') conversationId: string,
    @UploadedFile() file: any,
    @Body() body: { caption?: string; authorType?: string },
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    if (!conversationId) {
      throw new BadRequestException('conversationId query parameter is required');
    }

    const authorType = (body.authorType as EventAuthorType) || EventAuthorType.AGENT;
    const caption = body.caption || '';

    return this.chatMediaService.sendMediaToThread(
      threadId,
      conversationId,
      file,
      caption,
      authorType,
      req.user,
    );
  }

  /**
   * Get all media from a conversation
   */
  @Get('conversations/:conversationId/media')
  @UseGuards(JwtAuthGuard)
  getConversationMedia(@Param('conversationId') conversationId: string) {
    return this.chatMediaService.getConversationMedia(conversationId);
  }

  /**
   * Delete a media attachment
   */
  @Delete('events/:eventId/media/:attachmentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  deleteMedia(
    @Param('eventId') eventId: string,
    @Param('attachmentId') attachmentId: string,
    @Request() req,
  ) {
    return this.chatMediaService.deleteMedia(eventId, attachmentId, req.user);
  }

  /**
   * Sync all active conversations to Firebase
   * Useful for recovering missing conversations in Firebase
   */
  @Post('conversations/sync-to-firebase')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  syncConversationsToFirebase(@Query('agentId') agentId?: string) {
    this.logger.log(`POST /v1/conversations/sync-to-firebase called${agentId ? ` for agent ${agentId}` : ''}`);
    return this.conversationManagementService.syncAllActiveConversationsToFirebase(agentId);
  }
}
