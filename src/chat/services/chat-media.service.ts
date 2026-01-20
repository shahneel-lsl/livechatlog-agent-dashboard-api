import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventType, EventAuthorType } from '../../database/mysql/event.entity';
import { Conversation, ConversationStatus } from '../../database/mysql/conversation.entity';
import { Thread, ThreadStatus } from '../../database/mysql/thread.entity';
import { Agent } from '../../database/mysql/agent.entity';
import { FirebaseService } from '../../firebase/firebase.service';

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'gif';
  name: string;
  url: string;
  size: number;
  mimeType: string;
  storagePath: string;
  thumbnailUrl?: string;
}

@Injectable()
export class ChatMediaService {
  private readonly logger = new Logger(ChatMediaService.name);

  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Thread)
    private threadRepository: Repository<Thread>,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Upload media and send as message in conversation
   */
  async sendMediaToConversation(
    conversationId: string,
    file: any,
    caption: string,
    authorType: EventAuthorType,
    agent?: Agent,
  ): Promise<Event> {
    // Find conversation with active thread
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }

    // Get active thread
    const activeThread = await this.threadRepository.findOne({
      where: {
        conversationId: conversation.id,
        status: ThreadStatus.ACTIVE,
      },
    });

    if (!activeThread) {
      throw new BadRequestException(
        'No active thread found. Conversation may be closed.',
      );
    }

    return this.sendMediaToThread(
      activeThread.id,
      conversationId,
      file,
      caption,
      authorType,
      agent,
    );
  }

  /**
   * Upload media and send as message in thread
   */
  async sendMediaToThread(
    threadId: string,
    conversationId: string,
    file: any,
    caption: string,
    authorType: EventAuthorType,
    agent?: Agent,
  ): Promise<Event> {
    // Validate thread
    const thread = await this.threadRepository.findOne({
      where: { id: threadId, status: ThreadStatus.ACTIVE },
    });

    if (!thread) {
      throw new BadRequestException('Thread not found or already closed');
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Upload to Firebase Storage
    const uploadResult = await this.firebaseService.uploadFile(
      file,
      `conversations/${conversationId}/media`,
    );

    // Determine media type
    const mediaType = this.getMediaType(file.mimetype);

    // Create attachment object
    const attachment: MediaAttachment = {
      id: uploadResult.fileName,
      type: mediaType,
      name: file.originalname,
      url: uploadResult.fileUrl,
      size: file.size,
      mimeType: file.mimetype,
      storagePath: uploadResult.storagePath,
    };

    // Create event with attachment
    const event = this.eventRepository.create({
      threadId: thread.id,
      type: EventType.MESSAGE,
      authorType: authorType,
      content: caption || '', // Empty string if no caption
      metadata: {
        attachments: [attachment],
        hasMedia: true,
        mediaType: mediaType,
      },
      agentId: agent?.id,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Sync to Firebase for real-time delivery
    await this.syncMediaEventToFirebase(conversationId, savedEvent, agent);

    this.logger.log(
      `Media uploaded to conversation ${conversationId}: ${file.originalname}`,
    );

    return savedEvent;
  }

  /**
   * Get media type from MIME type
   */
  private getMediaType(
    mimeType: string,
  ): 'image' | 'video' | 'document' | 'gif' {
    if (mimeType.startsWith('image/')) {
      return mimeType === 'image/gif' ? 'gif' : 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    return 'document';
  }

  /**
   * Sync media event to Firebase
   */
  private async syncMediaEventToFirebase(
    conversationId: string,
    event: Event,
    agent?: Agent,
  ): Promise<void> {
    try {
      const messageData: any = {
        id: event.id,
        threadId: event.threadId,
        content: event.content || '',
        authorType: event.authorType,
        type: event.type,
        createdAt: new Date().toISOString(),
        metadata: event.metadata,
      };

      if (agent?.id || event.agentId) {
        messageData.agentId = agent?.id || event.agentId;
      }
      if (agent?.name) {
        messageData.agentName = agent.name;
      }

      await this.firebaseService.addMessage(conversationId, messageData);
    } catch (error) {
      this.logger.error('Failed to sync media event to Firebase:', error);
    }
  }

  /**
   * Get all media from a conversation
   */
  async getConversationMedia(conversationId: string): Promise<Event[]> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['threads'],
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }

    const threadIds = conversation.threads.map((t) => t.id);

    // Get all events with media attachments
    const events = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.threadId IN (:...threadIds)', { threadIds })
      .andWhere("JSON_EXTRACT(event.metadata, '$.hasMedia') = true")
      .orderBy('event.createdAt', 'DESC')
      .getMany();

    return events;
  }

  /**
   * Delete media and update event
   */
  async deleteMedia(
    eventId: string,
    attachmentId: string,
    agent?: Agent,
  ): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event || !event.metadata?.attachments) {
      throw new BadRequestException('Event or attachment not found');
    }

    const attachments = event.metadata.attachments as MediaAttachment[];
    const attachment = attachments.find((a) => a.id === attachmentId);

    if (!attachment) {
      throw new BadRequestException('Attachment not found');
    }

    // Delete from Firebase Storage
    await this.firebaseService.deleteFile(attachment.storagePath);

    // Remove from attachments array
    event.metadata.attachments = attachments.filter(
      (a) => a.id !== attachmentId,
    );

    if (event.metadata.attachments.length === 0) {
      event.metadata.hasMedia = false;
    }

    await this.eventRepository.save(event);

    this.logger.log(`Media deleted: ${attachment.name}`);
  }
}
