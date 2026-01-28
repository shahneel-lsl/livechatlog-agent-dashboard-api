import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Conversation, ConversationStatus } from '../../database/mysql/conversation.entity';
import { Agent } from '../../database/mysql/agent.entity';

interface TrafficFilters {
  activity?: string;
  assignedAgentId?: string;
  country?: string;
  city?: string;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class TrafficService {
  private readonly logger = new Logger(TrafficService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
  ) {}

  /**
   * Get visitors/customers with LiveChat Inc style filtering
   */
  async getVisitors(filters: TrafficFilters) {
    const { page, limit, activity, assignedAgentId, country, city, search } = filters;
    const skip = (page - 1) * limit;

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.visitor', 'visitor')
      .leftJoinAndSelect('conversation.assignedAgent', 'assignedAgent')
      .leftJoinAndSelect('conversation.group', 'group')
      .leftJoinAndSelect('conversation.threads', 'threads')
      .leftJoinAndSelect('threads.events', 'events')
      .where('conversation.status != :closedStatus', { closedStatus: ConversationStatus.CLOSED });

    // Activity filter (maps to conversation status)
    if (activity) {
      switch (activity.toLowerCase()) {
        case 'chatting':
          queryBuilder.andWhere('conversation.status = :activeStatus', { activeStatus: ConversationStatus.ACTIVE });
          queryBuilder.andWhere('conversation.assignedAgentId IS NOT NULL');
          break;
        case 'queued':
        case 'queue':
          queryBuilder.andWhere('conversation.status = :pendingStatus', { pendingStatus: ConversationStatus.PENDING });
          break;
        case 'supervised':
          // Conversations that are being supervised (you can add a supervisor field or check Firebase)
          queryBuilder.andWhere('conversation.status = :activeStatus', { activeStatus: ConversationStatus.ACTIVE });
          // Add supervisor logic here
          break;
        case 'waiting':
        case 'waiting for reply':
          queryBuilder.andWhere('conversation.status = :activeStatus', { activeStatus: ConversationStatus.ACTIVE });
          // Add logic to check if last message was from visitor
          break;
        case 'invited':
          // Add invited logic (you may need a separate field)
          queryBuilder.andWhere('1=0'); // Placeholder
          break;
        case 'browsing':
          queryBuilder.andWhere('conversation.status = :activeStatus OR conversation.status = :pendingStatus', {
            activeStatus: ConversationStatus.ACTIVE,
            pendingStatus: ConversationStatus.PENDING,
          });
          queryBuilder.andWhere('conversation.assignedAgentId IS NULL');
          break;
      }
    }

    // Assigned agent filter
    if (assignedAgentId) {
      queryBuilder.andWhere('conversation.assignedAgentId = :assignedAgentId', { assignedAgentId });
    }

    // Search filter (name, email)
    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('visitor.name LIKE :search', { search: `%${search}%` })
            .orWhere('visitor.email LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and sorting
    queryBuilder
      .orderBy('conversation.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const conversations = await queryBuilder.getMany();

    // Map to visitor format
    const visitors = conversations.map((conv) => {
      const lastMessage = conv.threads?.[0]?.events?.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )?.[0];

      // Determine activity status
      let activity = 'Browsing';
      if (conv.status === ConversationStatus.PENDING) {
        activity = 'Queued';
      } else if (conv.status === ConversationStatus.ACTIVE && conv.assignedAgentId) {
        activity = 'Chatting';
      }

      return {
        id: conv.id,
        name: conv.visitor?.name || 'Unknown Visitor',
        email: conv.visitor?.email || '',
        country: 'Unknown', // Add to visitor entity if needed
        countryCode: 'US',
        state: '',
        city: '',
        visits: 1, // Can be tracked in visitor entity
        chattingWith: conv.assignedAgent ? conv.assignedAgent.name : null,
        priority: 'medium', // Add to conversation entity if needed
        activity,
        ip: conv.visitor?.ipAddress || '',
        cameFrom: conv.visitor?.referrer || 'Direct',
        device: 'Desktop', // Can be parsed from userAgent
        os: 'Unknown',
        status: conv.status,
        createdAt: conv.createdAt,
        lastMessage: lastMessage?.content || '',
        lastMessageTime: lastMessage?.createdAt || conv.createdAt,
      };
    });

    return {
      success: true,
      data: visitors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get visitor statistics
   */
  async getStats() {
    const [total, chatting, queued, browsing] = await Promise.all([
      this.conversationRepository.count({
        where: { status: ConversationStatus.ACTIVE },
      }),
      this.conversationRepository.count({
        where: {
          status: ConversationStatus.ACTIVE,
        },
      }),
      this.conversationRepository.count({
        where: { status: ConversationStatus.PENDING },
      }),
      this.conversationRepository.count({
        where: {
          status: ConversationStatus.ACTIVE,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        total,
        chatting,
        queued,
        supervised: 0, // Implement based on your logic
        waiting: 0, // Implement based on message tracking
        invited: 0, // Implement if you have invite feature
        browsing,
      },
    };
  }
}
