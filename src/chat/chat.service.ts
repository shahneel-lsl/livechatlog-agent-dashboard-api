import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Visitor } from '../database/mysql/visitor.entity';
import { Conversation, ConversationStatus } from '../database/mysql/conversation.entity';
import { Thread, ThreadStatus } from '../database/mysql/thread.entity';
import { Event, EventType, EventAuthorType } from '../database/mysql/event.entity';
import { Agent } from '../database/mysql/agent.entity';
import { Group } from '../database/mysql/group.entity';
import { CreateWidgetSessionDto } from './dto/create-widget-session.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { AgentAssignmentService } from './services/agent-assignment.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Visitor)
    private visitorRepository: Repository<Visitor>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Thread)
    private threadRepository: Repository<Thread>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    private firebaseService: FirebaseService,
    private agentAssignmentService: AgentAssignmentService,
    private dataSource: DataSource,
  ) {}

  async createWidgetSession(
    createWidgetSessionDto: CreateWidgetSessionDto,
    request: any,
  ): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create Visitor
      const sessionToken = uuidv4();
      const visitor = this.visitorRepository.create({
        id: uuidv4(), // Pre-generate UUID
        name: createWidgetSessionDto.name,
        email: createWidgetSessionDto.email,
        phone: createWidgetSessionDto.phone,
        sessionToken,
        userAgent: request?.headers?.['user-agent'],
        ipAddress: request?.ip || request?.connection?.remoteAddress,
        referrer: request?.headers?.referer,
        metadata: createWidgetSessionDto.metadata,
      });

      await queryRunner.manager.save(visitor, { reload: false });

      // 2. Find group (default or specified)
      let group: Group | null = null;
      if (createWidgetSessionDto.groupId) {
        group = await queryRunner.manager.findOne(Group, {
          where: { id: createWidgetSessionDto.groupId, isDeleted: false },
        });
      } else {
        group = await queryRunner.manager.findOne(Group, {
          where: { isDefault: true, isDeleted: false },
        });
      }

      // 3. Create Conversation
      const conversation = this.conversationRepository.create({
        id: uuidv4(), // Pre-generate UUID
        visitorId: visitor.id,
        groupId: group?.id,
        status: ConversationStatus.PENDING,
      });

      await queryRunner.manager.save(conversation, { reload: false });

      // 4. Create initial Thread
      const thread = this.threadRepository.create({
        id: uuidv4(), // Pre-generate UUID
        conversation: conversation,
        conversationId: conversation.id,
        status: ThreadStatus.ACTIVE,
      });

      await queryRunner.manager.save(thread, { reload: false });

      // 5. Create initial message Event
      const event = this.eventRepository.create({
        id: uuidv4(), // Pre-generate UUID
        threadId: thread.id,
        type: EventType.MESSAGE,
        authorType: EventAuthorType.VISITOR,
        content: createWidgetSessionDto.initialMessage,
      });

      await queryRunner.manager.save(event, { reload: false });

      // 6. Update conversation's active thread
      conversation.activeThreadId = thread.id;
      await queryRunner.manager.save(conversation, { reload: false });

      await queryRunner.commitTransaction();

      // 7. Sync to Firebase for real-time chat
      await this.syncConversationToFirebase(conversation, visitor, group ?? undefined);
      await this.syncEventToFirebase(conversation.id, event);

      // 8. Schedule agent assignment after 3 seconds
      this.scheduleAgentAssignment(conversation.id, group?.id);

      // 9. Return session information
      return {
        sessionToken,
        visitorId: visitor.id,
        conversationId: conversation.id,
        threadId: thread.id,
        status: conversation.status,
        firebase: {
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          conversationPath: `/conversations/${conversation.id}`,
          messagesPath: `/conversations/${conversation.id}/messages`,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createConversationEvent(
    conversationId: string,
    createEventDto: CreateEventDto,
    agent?: Agent,
  ): Promise<Event> {
    // Find conversation with active thread
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['threads', 'visitor'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Get active thread from conversation
    let activeThread = await this.threadRepository.findOne({
      where: { 
        conversationId: conversation.id, 
        status: ThreadStatus.ACTIVE 
      },
    });

    // If no active thread and visitor is sending a message, auto-reopen the conversation
    if (!activeThread && createEventDto.authorType === EventAuthorType.VISITOR) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Create new thread
        activeThread = this.threadRepository.create({
          id: uuidv4(),
          conversation: conversation,
          conversationId: conversation.id,
          status: ThreadStatus.ACTIVE,
        });
        await queryRunner.manager.save(activeThread);

        // Add system event for auto-reopening
        const reopenEvent = this.eventRepository.create({
          id: uuidv4(),
          threadId: activeThread.id,
          type: EventType.SYSTEM,
          authorType: EventAuthorType.SYSTEM,
          content: `Conversation automatically reopened by visitor ${conversation.visitor.name || 'message'}`,
        });
        await queryRunner.manager.save(reopenEvent);

        // Update conversation status to ACTIVE
        conversation.status = ConversationStatus.ACTIVE;
        conversation.activeThreadId = activeThread.id;
        await queryRunner.manager.save(conversation);

        await queryRunner.commitTransaction();

        // Sync to Firebase
        await this.firebaseService.updateConversation(conversationId, {
          status: 'active',
          activeThreadId: activeThread.id,
          reopenedBy: 'visitor',
          reopenedAt: new Date().toISOString(),
        });

        // Sync system event to Firebase
        await this.firebaseService.addSystemEvent(conversationId, {
          id: reopenEvent.id,
          type: 'conversation_reopened',
          message: reopenEvent.content,
          createdAt: reopenEvent.createdAt.toISOString(),
        });

        this.logger.log(`Conversation ${conversationId} automatically reopened by visitor message`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else if (!activeThread) {
      throw new NotFoundException(
        'No active thread found for this conversation. The conversation may be closed.',
      );
    }

    const event = this.eventRepository.create({
      threadId: activeThread.id,
      type: createEventDto.type || EventType.MESSAGE,
      authorType: createEventDto.authorType,
      content: createEventDto.content,
      metadata: createEventDto.metadata,
      agentId: agent?.id,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Sync to Firebase for real-time delivery
    await this.syncEventToFirebase(conversation.id, savedEvent, agent);

    return savedEvent;
  }

  async createThreadEvent(
    threadId: string,
    createEventDto: CreateEventDto,
    agent?: Agent,
  ): Promise<Event> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId, status: ThreadStatus.ACTIVE },
      relations: ['conversation'],
    });

    if (!thread) {
      throw new NotFoundException(
        'Thread not found or already closed',
      );
    }

    const event = this.eventRepository.create({
      threadId: thread.id,
      type: createEventDto.type || EventType.MESSAGE,
      authorType: createEventDto.authorType,
      content: createEventDto.content,
      metadata: createEventDto.metadata,
      agentId: agent?.id,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Sync to Firebase for real-time delivery
    await this.syncEventToFirebase(thread.conversationId, savedEvent, agent);

    return savedEvent;
  }

  async assignConversation(
    conversationId: string,
    assignConversationDto: AssignConversationDto,
  ): Promise<Conversation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find conversation
      const conversation = await queryRunner.manager.findOne(Conversation, {
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // 2. Find agent
      const agent = await queryRunner.manager.findOne(Agent, {
        where: { id: assignConversationDto.agentId, isDeleted: false },
      });

      if (!agent) {
        throw new NotFoundException('Agent not found');
      }

      // 3. Close current active thread
      if (conversation.activeThreadId) {
        const activeThread = await queryRunner.manager.findOne(Thread, {
          where: { id: conversation.activeThreadId },
          relations: ['conversation'],
        });

        if (activeThread) {
          activeThread.status = ThreadStatus.CLOSED;
          activeThread.closedBy = 'system';
          activeThread.closedReason = 'agent_assigned';
          activeThread.closedAt = new Date();
          await queryRunner.manager.save(activeThread);

          // Add system event to closed thread
          const closedEvent = this.eventRepository.create({
            threadId: activeThread.id,
            type: EventType.SYSTEM,
            authorType: EventAuthorType.SYSTEM,
            content: `Thread closed - Agent ${agent.name} assigned`,
          });
          await queryRunner.manager.save(closedEvent);
        }
      }

      // 4. Create new thread
      const newThread = this.threadRepository.create({
        conversation: conversation,
        conversationId: conversation.id,
        status: ThreadStatus.ACTIVE,
      });

      await queryRunner.manager.save(newThread);

      // 5. Add system event to new thread
      const assignedEvent = this.eventRepository.create({
        threadId: newThread.id,
        type: EventType.SYSTEM,
        authorType: EventAuthorType.SYSTEM,
        content: `Agent ${agent.name} joined the conversation`,
        agentId: agent.id,
      });

      await queryRunner.manager.save(assignedEvent);

      // 6. Update conversation
      conversation.assignedAgentId = agent.id;
      conversation.activeThreadId = newThread.id;
      conversation.status = ConversationStatus.ACTIVE;
      await queryRunner.manager.save(conversation);

      await queryRunner.commitTransaction();

      // 7. Sync to Firebase for real-time updates
      try {
        await this.firebaseService.updateConversation(conversationId, {
          assignedAgentId: agent.id,
          assignedAgent: {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            avatar: agent.avatar,
          },
          activeThreadId: newThread.id,
          status: 'active',
          updatedAt: new Date().toISOString(),
        });

        // Add system event to Firebase
        await this.firebaseService.addSystemEvent(conversationId, {
          id: uuidv4(),
          type: 'agent_assigned',
          message: `Agent ${agent.name} joined the conversation`,
          metadata: {
            agentId: agent.id,
            agentName: agent.name,
          },
          createdAt: new Date().toISOString(),
        });

        this.logger.log(`Conversation ${conversationId} assignment synced to Firebase`);
      } catch (error) {
        this.logger.error(`Failed to sync assignment to Firebase: ${error.message}`);
        // Don't throw error - assignment was successful in DB
      }

      const updatedConversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
        relations: ['visitor', 'assignedAgent', 'group', 'threads'],
      });

      if (!updatedConversation) {
        throw new NotFoundException('Conversation not found after assignment');
      }

      return updatedConversation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getConversation(id: string): Promise<any> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['visitor', 'assignedAgent', 'group', 'threads', 'tags'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Load events for each thread
    const threadsWithEvents = await Promise.all(
      conversation.threads.map(async (thread) => {
        const events = await this.eventRepository.find({
          where: { threadId: thread.id },
          relations: ['agent'],
          order: { createdAt: 'ASC' },
        });
        return {
          ...thread,
          events,
        };
      }),
    );

    return {
      ...conversation,
      threads: threadsWithEvents,
    };
  }

  async getThreadEvents(threadId: string): Promise<Event[]> {
    return this.eventRepository.find({
      where: { threadId },
      relations: ['agent'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Schedule agent assignment after 3 seconds
   * This can be replaced with BullMQ queue later
   */
  private scheduleAgentAssignment(
    conversationId: string,
    groupId?: string,
  ): void {
    setTimeout(async () => {
      try {
        this.logger.log(
          `🕐 Auto-assigning agent to conversation ${conversationId} after 3 seconds`,
        );
        const result = await this.agentAssignmentService.assignAgentToConversation(
          conversationId,
          groupId,
        );

        if (result.success) {
          this.logger.log(
            `✅ Agent ${result.assignedAgent?.name} assigned to conversation ${conversationId}`,
          );
        } else {
          this.logger.warn(
            `⚠️ Agent assignment failed for conversation ${conversationId}: ${result.message}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `❌ Error during auto-assignment for conversation ${conversationId}:`,
          error,
        );
      }
    }, 3000); // 3 seconds
  }

  /**
   * Sync conversation to Firebase for real-time updates
   */
  private async syncConversationToFirebase(
    conversation: Conversation,
    visitor: Visitor,
    group?: Group,
  ): Promise<void> {
    try {
      await this.firebaseService.createConversation(conversation.id, {
        visitorId: visitor.id,
        visitorName: visitor.name,
        visitorEmail: visitor.email,
        groupId: group?.id,
        status: conversation.status,
        createdAt: new Date().toISOString(),
      });
      this.logger.log(`Firebase conversation created: ${conversation.id}`);
    } catch (error) {
      this.logger.error('Failed to sync conversation to Firebase:', error);
      // Don't throw - conversation already created in MySQL
    }
  }

  /**
   * Sync event/message to Firebase for real-time delivery
   */
  private async syncEventToFirebase(
    conversationId: string,
    event: Event,
    agent?: Agent,
  ): Promise<void> {
    try {
      const messageData: any = {
        id: event.id,
        threadId: event.threadId,
        content: event.content,
        authorType: event.authorType as 'visitor' | 'agent' | 'system',
        type: event.type as 'message' | 'system',
        createdAt: new Date().toISOString(),
      };

      // Only add agentId and agentName if they exist (not undefined)
      if (agent?.id || event.agentId) {
        messageData.agentId = agent?.id || event.agentId;
      }
      if (agent?.name) {
        messageData.agentName = agent.name;
      }
      if (event.metadata) {
        messageData.metadata = event.metadata;
      }

      await this.firebaseService.addMessage(conversationId, messageData);
    } catch (error) {
      this.logger.error('Failed to sync event to Firebase:', error);
      // Don't throw - event already saved in MySQL
    }
  }

  /**
   * Update agent typing status
   */
  async updateAgentTyping(
    conversationId: string,
    agentId: string,
    isTyping: boolean,
  ): Promise<void> {
    await this.firebaseService.updateTypingStatus(
      conversationId,
      agentId,
      isTyping,
    );
  }

  /**
   * Update visitor typing status with pre-typing preview
   */
  async updateVisitorTyping(
    conversationId: string,
    isTyping: boolean,
    preview?: string,
  ): Promise<void> {
    await this.firebaseService.updateVisitorTyping(
      conversationId,
      isTyping,
      preview,
    );
  }

  /**
   * Update message delivery or read status
   */
  async updateMessageStatus(
    conversationId: string,
    messageId: string,
    status: 'delivered' | 'read',
  ): Promise<void> {
    const now = new Date().toISOString();

    // Update in MySQL
    const event = await this.eventRepository.findOne({
      where: { id: messageId },
    });

    if (!event) {
      throw new NotFoundException('Message not found');
    }

    if (status === 'delivered' && !event.deliveredAt) {
      event.deliveredAt = new Date();
      await this.eventRepository.save(event);
      
      // Update in Firebase
      await this.firebaseService.updateMessageDeliveryStatus(
        conversationId,
        messageId,
        now,
      );
    } else if (status === 'read' && !event.readAt) {
      // When marking as read, also mark as delivered if not already
      if (!event.deliveredAt) {
        event.deliveredAt = new Date();
      }
      event.readAt = new Date();
      await this.eventRepository.save(event);
      
      // Update in Firebase
      await this.firebaseService.updateMessageReadStatus(
        conversationId,
        messageId,
        now,
      );
    }
  }

  /**
   * Bulk update message status (mark multiple messages as read)
   */
  async bulkUpdateMessageStatus(
    conversationId: string,
    messageIds: string[],
    status: 'delivered' | 'read',
  ): Promise<void> {
    const now = new Date();
    const nowISO = now.toISOString();

    // Update in MySQL
    const events = await this.eventRepository.findByIds(messageIds);

    for (const event of events) {
      if (status === 'delivered' && !event.deliveredAt) {
        event.deliveredAt = now;
      } else if (status === 'read') {
        if (!event.deliveredAt) {
          event.deliveredAt = now;
        }
        if (!event.readAt) {
          event.readAt = now;
        }
      }
    }

    await this.eventRepository.save(events);

    // Update in Firebase
    if (status === 'read') {
      await this.firebaseService.markConversationMessagesAsRead(
        conversationId,
        messageIds,
        nowISO,
      );
    }
  }
}
