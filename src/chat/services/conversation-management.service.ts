import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, ConversationStatus } from '../../database/mysql/conversation.entity';
import { Thread, ThreadStatus } from '../../database/mysql/thread.entity';
import { Event, EventType, EventAuthorType } from '../../database/mysql/event.entity';
import { Agent } from '../../database/mysql/agent.entity';
import { Tag } from '../../database/mysql/tag.entity';
import { FirebaseService } from '../../firebase/firebase.service';
import { CloseConversationDto, CloseReason } from '../dto/close-conversation.dto';
import { ReopenConversationDto } from '../dto/reopen-conversation.dto';
import { BulkActionDto, BulkActionType } from '../dto/bulk-action.dto';
import { GetConversationsDto, SortBy } from '../dto/get-conversations.dto';

/**
 * ConversationManagementService
 * 
 * This service follows the LiveChat Inc threading model:
 * - A Conversation represents the ongoing relationship with a visitor
 * - A Thread represents a single chat session within a conversation
 * - When a conversation is closed, the active thread is closed
 * - When a conversation is reopened, a new thread is created
 * - This allows maintaining complete history while separating sessions
 */
@Injectable()
export class ConversationManagementService {
  private readonly logger = new Logger(ConversationManagementService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Thread)
    private threadRepository: Repository<Thread>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    private firebaseService: FirebaseService,
    private dataSource: DataSource,
  ) {}

  /**
   * Close a conversation (LiveChat Inc style)
   * 
   * Following LiveChat Inc's approach:
   * 1. Close the active thread (not delete it)
   * 2. Update conversation status to CLOSED
   * 3. Add a system event to mark the closure
   * 4. Sync to Firebase for real-time updates
   * 
   * The thread closure model allows:
   * - Complete history preservation
   * - Clear session boundaries
   * - Ability to reopen with a new thread
   */
  async closeConversation(
    conversationId: string,
    closeDto: CloseConversationDto,
    agent: Agent,
  ): Promise<{ success: boolean; message: string; conversation: Conversation }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find conversation with active thread
      const conversation = await queryRunner.manager.findOne(Conversation, {
        where: { id: conversationId },
        relations: ['threads', 'visitor', 'assignedAgent'],
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      if (conversation.status === ConversationStatus.CLOSED) {
        throw new BadRequestException('Conversation is already closed');
      }

      // 2. Close the active thread
      const activeThread = await queryRunner.manager.findOne(Thread, {
        where: { 
          conversationId: conversation.id, 
          status: ThreadStatus.ACTIVE 
        },
      });

      if (activeThread) {
        activeThread.status = ThreadStatus.CLOSED;
        activeThread.closedBy = 'agent';
        activeThread.closedReason = this.mapCloseReasonToThreadReason(closeDto.reason);
        activeThread.closedAt = new Date();
        await queryRunner.manager.save(activeThread);

        // 3. Add system event to thread for closure
        const closeEvent = this.eventRepository.create({
          id: uuidv4(),
          threadId: activeThread.id,
          type: EventType.SYSTEM,
          authorType: EventAuthorType.SYSTEM,
          content: `Chat closed by ${agent.name}. Reason: ${closeDto.reason}${closeDto.notes ? `. Notes: ${closeDto.notes}` : ''}`,
          agentId: agent.id,
        });
        await queryRunner.manager.save(closeEvent);
      }

      // 4. Update conversation status
      conversation.status = ConversationStatus.CLOSED;
      conversation.activeThreadId = undefined as any; // No active thread when closed
      if (closeDto.notes) {
        conversation.notes = (conversation.notes || '') + `\n[${new Date().toISOString()}] Closed: ${closeDto.notes}`;
      }
      await queryRunner.manager.save(conversation);

      await queryRunner.commitTransaction();

      // 5. Sync to Firebase
      await this.syncConversationStatusToFirebase(conversationId, 'closed', {
        closedBy: agent.name,
        closedAt: new Date().toISOString(),
        reason: closeDto.reason,
      });

      this.logger.log(`Conversation ${conversationId} closed by agent ${agent.name}`);

      return {
        success: true,
        message: 'Conversation closed successfully',
        conversation,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reopen a closed conversation (LiveChat Inc style)
   * 
   * Following LiveChat Inc's approach:
   * 1. Create a new thread (not reopen old one)
   * 2. Update conversation status to ACTIVE
   * 3. Add system event for the reopening
   * 4. Optionally reassign to an agent
   * 
   * This maintains clean session boundaries while
   * keeping all historical data intact.
   */
  async reopenConversation(
    conversationId: string,
    reopenDto: ReopenConversationDto,
    agent: Agent,
  ): Promise<{ success: boolean; message: string; conversation: Conversation; newThreadId: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find conversation
      const conversation = await queryRunner.manager.findOne(Conversation, {
        where: { id: conversationId },
        relations: ['visitor', 'assignedAgent'],
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      if (conversation.status !== ConversationStatus.CLOSED && 
          conversation.status !== ConversationStatus.RESOLVED) {
        throw new BadRequestException('Conversation is not closed. Cannot reopen an active conversation.');
      }

      // 2. Create a new thread (LiveChat Inc pattern)
      const newThread = this.threadRepository.create({
        id: uuidv4(),
        conversation: conversation,
        conversationId: conversation.id,
        status: ThreadStatus.ACTIVE,
      });
      await queryRunner.manager.save(newThread);

      // 3. Add system event for reopening
      const reopenEvent = this.eventRepository.create({
        id: uuidv4(),
        threadId: newThread.id,
        type: EventType.SYSTEM,
        authorType: EventAuthorType.SYSTEM,
        content: `Conversation reopened by ${agent.name}${reopenDto.reason ? `. Reason: ${reopenDto.reason}` : ''}`,
        agentId: agent.id,
      });
      await queryRunner.manager.save(reopenEvent);

      // 4. Update conversation
      conversation.status = ConversationStatus.ACTIVE;
      conversation.activeThreadId = newThread.id;
      conversation.assignedAgentId = agent.id;
      if (reopenDto.notes) {
        conversation.notes = (conversation.notes || '') + `\n[${new Date().toISOString()}] Reopened: ${reopenDto.notes}`;
      }
      await queryRunner.manager.save(conversation);

      await queryRunner.commitTransaction();

      // 5. Sync to Firebase
      await this.syncConversationStatusToFirebase(conversationId, 'active', {
        reopenedBy: agent.name,
        reopenedAt: new Date().toISOString(),
        newThreadId: newThread.id,
      });

      // Also sync the system event to Firebase
      await this.firebaseService.addMessage(conversationId, {
        id: reopenEvent.id,
        threadId: newThread.id,
        content: reopenEvent.content,
        authorType: 'system',
        type: 'system',
        createdAt: new Date().toISOString(),
      });

      this.logger.log(`Conversation ${conversationId} reopened by agent ${agent.name}, new thread: ${newThread.id}`);

      return {
        success: true,
        message: 'Conversation reopened successfully',
        conversation,
        newThreadId: newThread.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Add tags to a conversation
   */
  async addTagsToConversation(
    conversationId: string,
    tagIds: string[],
  ): Promise<{ success: boolean; tags: Tag[] }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['tags'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const tags = await this.tagRepository.findBy({ id: In(tagIds), isDeleted: false });
    
    if (tags.length !== tagIds.length) {
      throw new BadRequestException('One or more tags not found');
    }

    // Add new tags (avoid duplicates)
    const existingTagIds = new Set(conversation.tags.map(t => t.id));
    const newTags = tags.filter(t => !existingTagIds.has(t.id));
    
    conversation.tags = [...conversation.tags, ...newTags];
    await this.conversationRepository.save(conversation);

    // Sync to Firebase
    await this.syncConversationTagsToFirebase(conversationId, conversation.tags);

    return {
      success: true,
      tags: conversation.tags,
    };
  }

  /**
   * Remove a tag from a conversation
   */
  async removeTagFromConversation(
    conversationId: string,
    tagId: string,
  ): Promise<{ success: boolean; tags: Tag[] }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['tags'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.tags = conversation.tags.filter(t => t.id !== tagId);
    await this.conversationRepository.save(conversation);

    // Sync to Firebase
    await this.syncConversationTagsToFirebase(conversationId, conversation.tags);

    return {
      success: true,
      tags: conversation.tags,
    };
  }

  /**
   * Get conversations with filters, sorting, and pagination
   */
  async getConversations(filters: GetConversationsDto): Promise<{
    conversations: Conversation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Debug logging
    this.logger.debug(`getConversations called with filters: ${JSON.stringify(filters)}`);
    this.logger.debug(`Status filter type: ${typeof filters.status}, isArray: ${Array.isArray(filters.status)}`);
    if (filters.status) {
      this.logger.debug(`Status values: ${filters.status}`);
    }

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.visitor', 'visitor')
      .leftJoinAndSelect('conversation.assignedAgent', 'assignedAgent')
      .leftJoinAndSelect('conversation.group', 'group')
      .leftJoinAndSelect('conversation.tags', 'tags')
      .leftJoinAndSelect('conversation.threads', 'threads')
      .distinct(true); // Ensure we get distinct conversations despite multiple threads

    // Apply status filter - only match exact conversation status
    if (filters.status && filters.status.length > 0) {
      this.logger.log(`Filtering conversations by status: ${JSON.stringify(filters.status)}`);
      queryBuilder.andWhere('conversation.status IN (:...statuses)', {
        statuses: filters.status,
      });
    }

    // Apply agent filter
    if (filters.agentId) {
      queryBuilder.andWhere('conversation.assignedAgentId = :agentId', {
        agentId: filters.agentId,
      });
    }

    // Apply group filter
    if (filters.groupId) {
      queryBuilder.andWhere('conversation.groupId = :groupId', {
        groupId: filters.groupId,
      });
    }

    // Apply tag filter
    if (filters.tagIds && filters.tagIds.length > 0) {
      queryBuilder.andWhere('tags.id IN (:...tagIds)', {
        tagIds: filters.tagIds,
      });
    }

    // Apply search filter (search in visitor name, email, or conversation ID)
    if (filters.search) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where('conversation.id LIKE :search', { search: `%${filters.search}%` })
            .orWhere('visitor.name LIKE :search', { search: `%${filters.search}%` })
            .orWhere('visitor.email LIKE :search', { search: `%${filters.search}%` });
        }),
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case SortBy.OLDEST:
        queryBuilder.orderBy('conversation.createdAt', 'ASC');
        break;
      case SortBy.NEWEST:
      default:
        queryBuilder.orderBy('conversation.createdAt', 'DESC');
        break;
    }

    // Get total count
    const total = await queryBuilder.getCount();
    this.logger.debug(`Total conversations matching filter: ${total}`);

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const conversations = await queryBuilder.getMany();
    
    // Log result summary
    this.logger.debug(`Returning ${conversations.length} conversations out of ${total} total`);
    if (conversations.length > 0) {
      const statusCounts = conversations.reduce((acc, conv) => {
        acc[conv.status] = (acc[conv.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      this.logger.debug(`Returned conversation status breakdown: ${JSON.stringify(statusCounts)}`);
    }

    return {
      conversations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Perform bulk actions on multiple conversations
   */
  async performBulkAction(
    bulkActionDto: BulkActionDto,
    agent: Agent,
  ): Promise<{
    success: boolean;
    message: string;
    results: { conversationId: string; success: boolean; error?: string }[];
  }> {
    const results: { conversationId: string; success: boolean; error?: string }[] = [];

    for (const conversationId of bulkActionDto.conversationIds) {
      try {
        switch (bulkActionDto.action) {
          case BulkActionType.CLOSE:
            await this.closeConversation(
              conversationId,
              { reason: CloseReason.OTHER, notes: bulkActionDto.reason },
              agent,
            );
            results.push({ conversationId, success: true });
            break;

          case BulkActionType.ASSIGN:
            if (!bulkActionDto.agentId) {
              results.push({ conversationId, success: false, error: 'Agent ID required for assign action' });
              continue;
            }
            await this.assignConversationToAgent(conversationId, bulkActionDto.agentId);
            results.push({ conversationId, success: true });
            break;

          case BulkActionType.ADD_TAG:
            if (!bulkActionDto.tagId) {
              results.push({ conversationId, success: false, error: 'Tag ID required for add_tag action' });
              continue;
            }
            await this.addTagsToConversation(conversationId, [bulkActionDto.tagId]);
            results.push({ conversationId, success: true });
            break;

          case BulkActionType.REMOVE_TAG:
            if (!bulkActionDto.tagId) {
              results.push({ conversationId, success: false, error: 'Tag ID required for remove_tag action' });
              continue;
            }
            await this.removeTagFromConversation(conversationId, bulkActionDto.tagId);
            results.push({ conversationId, success: true });
            break;

          default:
            results.push({ conversationId, success: false, error: 'Unknown action' });
        }
      } catch (error) {
        results.push({
          conversationId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: failCount === 0,
      message: `Bulk action completed: ${successCount} succeeded, ${failCount} failed`,
      results,
    };
  }

  /**
   * Assign a conversation to a specific agent
   */
  private async assignConversationToAgent(
    conversationId: string,
    agentId: string,
  ): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const agent = await this.agentRepository.findOne({
      where: { id: agentId, isDeleted: false },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    conversation.assignedAgentId = agentId;
    if (conversation.status === ConversationStatus.PENDING) {
      conversation.status = ConversationStatus.ACTIVE;
    }
    await this.conversationRepository.save(conversation);

    // Sync to Firebase
    await this.firebaseService.updateConversation(conversationId, {
      assignedAgentId: agentId,
      assignedAgentName: agent.name,
      status: conversation.status,
    });
  }

  /**
   * Map close reason to thread close reason
   */
  private mapCloseReasonToThreadReason(reason: CloseReason): string {
    switch (reason) {
      case CloseReason.RESOLVED:
        return 'resolved';
      case CloseReason.SPAM:
        return 'spam';
      case CloseReason.ABANDONED:
        return 'abandoned';
      case CloseReason.TRANSFERRED:
        return 'transferred';
      default:
        return 'other';
    }
  }

  /**
   * Sync conversation status to Firebase
   */
  private async syncConversationStatusToFirebase(
    conversationId: string,
    status: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      await this.firebaseService.updateConversation(conversationId, {
        status,
        ...metadata,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to sync conversation status to Firebase: ${error}`);
    }
  }

  /**
   * Sync conversation tags to Firebase
   */
  private async syncConversationTagsToFirebase(
    conversationId: string,
    tags: Tag[],
  ): Promise<void> {
    try {
      await this.firebaseService.updateConversation(conversationId, {
        tags: tags.map(t => ({ id: t.id, name: t.name, color: t.color })),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to sync conversation tags to Firebase: ${error}`);
    }
  }

  /**
   * Sync all active conversations to Firebase
   * This is useful for bulk sync or recovery when Firebase data is incomplete
   */
  async syncAllActiveConversationsToFirebase(agentId?: string): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    message: string;
  }> {
    this.logger.log(`Starting bulk sync of active conversations to Firebase${agentId ? ` for agent ${agentId}` : ''}`);
    
    try {
      // Query all active conversations
      const queryBuilder = this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.visitor', 'visitor')
        .leftJoinAndSelect('conversation.assignedAgent', 'assignedAgent')
        .leftJoinAndSelect('conversation.group', 'group')
        .leftJoinAndSelect('conversation.tags', 'tags')
        .where('conversation.status = :status', { status: ConversationStatus.ACTIVE });

      // Filter by agent if specified
      if (agentId) {
        queryBuilder.andWhere('conversation.assignedAgentId = :agentId', { agentId });
      }

      const conversations = await queryBuilder.getMany();
      
      this.logger.log(`Found ${conversations.length} active conversations to sync`);

      let synced = 0;
      let failed = 0;

      // Sync each conversation to Firebase
      for (const conversation of conversations) {
        try {
          await this.firebaseService.createConversation(conversation.id, {
            visitorId: conversation.visitorId,
            visitorName: conversation.visitor?.name || 'Unknown Visitor',
            visitorEmail: conversation.visitor?.email,
            groupId: conversation.groupId,
            status: conversation.status,
            createdAt: conversation.createdAt.toISOString(),
            assignedAgentId: conversation.assignedAgentId,
            assignedAgentName: conversation.assignedAgent?.name,
          });

          // Also sync tags if present
          if (conversation.tags && conversation.tags.length > 0) {
            await this.syncConversationTagsToFirebase(conversation.id, conversation.tags);
          }

          synced++;
          this.logger.debug(`✓ Synced conversation ${conversation.id}`);
        } catch (error) {
          failed++;
          this.logger.error(`✗ Failed to sync conversation ${conversation.id}:`, error);
        }
      }

      const message = `Synced ${synced} conversations, ${failed} failed`;
      this.logger.log(message);

      return {
        success: true,
        synced,
        failed,
        message,
      };
    } catch (error) {
      this.logger.error('Bulk sync failed:', error);
      return {
        success: false,
        synced: 0,
        failed: 0,
        message: `Bulk sync failed: ${error.message}`,
      };
    }
  }
}
