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
    try {
      const { page, limit, activity, assignedAgentId, country, city, search } = filters;
      const skip = (page - 1) * limit;

      // OPTIMIZED: Only load necessary relations, no threads/events
      // This prevents loading thousands of events per conversation which causes timeouts
      const queryBuilder = this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.visitor', 'visitor')
        .leftJoinAndSelect('conversation.assignedAgent', 'assignedAgent')
        .leftJoinAndSelect('conversation.group', 'group')
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

    // SIMPLIFIED: Skip loading messages for now to avoid timeout
    // The traffic page doesn't strictly need the last message
    // Can be added later with proper indexing or caching
    
    // Map to visitor format
    const visitors = conversations.map((conv) => {

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
        lastMessage: '', // Removed for performance
        lastMessageTime: conv.createdAt,
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
  } catch (error) {
    this.logger.error('Error fetching visitors:', error);
    return {
      success: false,
      data: [],
      total: 0,
      page: filters.page,
      limit: filters.limit,
      totalPages: 0,
      error: 'Failed to fetch visitors',
    };
  }
}

  private statsCache: { data: any; timestamp: number } | null = null;
  private readonly STATS_CACHE_TTL = 30000; // 30 seconds cache
  private isQueryInProgress = false; // Prevent concurrent queries

  /**
   * Get visitor statistics
   * OPTIMIZED: Use simple counts without joins + caching + circuit breaker
   */
  async getStats() {
    try {
      // Return cached data if available and fresh
      if (this.statsCache && Date.now() - this.statsCache.timestamp < this.STATS_CACHE_TTL) {
        this.logger.debug('Returning cached stats');
        return this.statsCache.data;
      }

      // If query is already in progress, return cached data to prevent duplicate queries
      if (this.isQueryInProgress) {
        this.logger.warn('Query already in progress, returning cached or default data');
        if (this.statsCache) {
          return this.statsCache.data;
        }
        return this.getDefaultStats();
      }

      this.isQueryInProgress = true;
      this.logger.debug('Fetching fresh stats from database');

      // Use aggressive timeout to prevent hanging
      const queryTimeout = 5000; // 5 seconds timeout (reduced from 10)
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 5s')), queryTimeout);
      });

      // Try to use COUNT(*) with LIMIT for faster query on empty tables
      const queryPromise = this.conversationRepository.query(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'active' AND assignedAgentId IS NOT NULL THEN 1 ELSE 0 END), 0) as chatting,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as queued,
          COALESCE(SUM(CASE WHEN status = 'active' AND assignedAgentId IS NULL THEN 1 ELSE 0 END), 0) as browsing
        FROM conversations
        WHERE status IN ('active', 'pending')
      `).catch(err => {
        this.logger.error('Database query failed:', err.message);
        throw err;
      });

      const result = await Promise.race([queryPromise, timeoutPromise]) as any[];
      this.isQueryInProgress = false;

      const stats = result && result[0] ? result[0] : { total: 0, chatting: 0, queued: 0, browsing: 0 };
      const response = {
        success: true,
        data: {
          total: parseInt(stats.total) || 0,
          chatting: parseInt(stats.chatting) || 0,
          queued: parseInt(stats.queued) || 0,
          supervised: 0,
          waiting: 0,
          invited: 0,
          browsing: parseInt(stats.browsing) || 0,
        },
      };

      // Cache the result
      this.statsCache = {
        data: response,
        timestamp: Date.now(),
      };

      this.logger.debug('Stats fetched successfully:', response.data);
      return response;
    } catch (error) {
      this.isQueryInProgress = false;
      this.logger.error('Error fetching stats:', error.message || error);
      
      // Return cached data if available, even if stale
      if (this.statsCache) {
        this.logger.warn('Returning stale cached stats due to error');
        return this.statsCache.data;
      }
      
      // Return zeros if no cache available
      return this.getDefaultStats();
    }
  }

  private getDefaultStats() {
    return {
      success: true,
      data: {
        total: 0,
        chatting: 0,
        queued: 0,
        supervised: 0,
        waiting: 0,
        invited: 0,
        browsing: 0,
      },
    };
  }
}
