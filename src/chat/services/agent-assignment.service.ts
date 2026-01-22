import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Agent, AgentStatus } from '../../database/mysql/agent.entity';
import { Group, RoutingStrategy } from '../../database/mysql/group.entity';
import {
  Conversation,
  ConversationStatus,
} from '../../database/mysql/conversation.entity';
import { Thread, ThreadStatus } from '../../database/mysql/thread.entity';
import { Event, EventType, EventAuthorType } from '../../database/mysql/event.entity';
import {
  AssignmentLog,
  AssignmentLogLevel,
  AssignmentLogType,
} from '../../database/mysql/assignment-log.entity';
import { FirebaseService } from '../../firebase/firebase.service';

interface AssignmentResult {
  success: boolean;
  assignedAgent?: Agent;
  conversation?: Conversation;
  message?: string;
}

@Injectable()
export class AgentAssignmentService {
  private readonly logger = new Logger(AgentAssignmentService.name);

  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Thread)
    private threadRepository: Repository<Thread>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(AssignmentLog)
    private assignmentLogRepository: Repository<AssignmentLog>,
    private firebaseService: FirebaseService,
    private dataSource: DataSource,
  ) {}

  /**
   * Main assignment function - can be called directly or from BullMQ later
   * Validates: agent is in group, agent is accepting chats, agent limit not exceeded
   */
  async assignAgentToConversation(
    conversationId: string,
    groupId?: string,
  ): Promise<AssignmentResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find conversation with visitor details
      const conversation = await queryRunner.manager.findOne(Conversation, {
        where: { id: conversationId },
        relations: ['visitor', 'group'],
      });

      if (!conversation) {
        this.logger.error(`Conversation ${conversationId} not found`);
        await this.logAssignment({
          conversationId,
          visitorId: 'unknown',
          type: AssignmentLogType.ASSIGNMENT_FAILED,
          level: AssignmentLogLevel.ERROR,
          message: 'Conversation not found in database',
          metadata: { conversationId },
        });
        return { success: false, message: 'Conversation not found' };
      }

      // Log assignment start
      await this.logAssignment({
        conversationId: conversation.id,
        visitorId: conversation.visitorId,
        groupId: conversation.groupId,
        type: AssignmentLogType.ASSIGNMENT_STARTED,
        level: AssignmentLogLevel.INFO,
        message: `Starting agent assignment for visitor ${conversation.visitor?.name || conversation.visitorId}`,
        metadata: {
          visitorName: conversation.visitor?.name,
          visitorEmail: conversation.visitor?.email,
        },
      });

      if (conversation.status !== ConversationStatus.PENDING) {
        this.logger.warn(
          `Conversation ${conversationId} is not pending, current status: ${conversation.status}`,
        );
        await this.logAssignment({
          conversationId: conversation.id,
          visitorId: conversation.visitorId,
          groupId: conversation.groupId,
          type: AssignmentLogType.ASSIGNMENT_FAILED,
          level: AssignmentLogLevel.WARNING,
          message: `Conversation is not in PENDING status, current status: ${conversation.status}`,
          metadata: { currentStatus: conversation.status },
        });
        return { success: false, message: 'Conversation is not pending' };
      }

      // 2. Determine target group
      const targetGroupId = groupId || conversation.groupId;
      if (!targetGroupId) {
        this.logger.error('No group specified for assignment');
        await this.logAssignment({
          conversationId: conversation.id,
          visitorId: conversation.visitorId,
          type: AssignmentLogType.NO_GROUP_FOUND,
          level: AssignmentLogLevel.ERROR,
          message: 'No group specified for assignment',
          metadata: {},
        });
        return { success: false, message: 'No group specified' };
      }

      const group = await queryRunner.manager.findOne(Group, {
        where: { id: targetGroupId, isDeleted: false },
        relations: ['agents'],
      });

      if (!group) {
        this.logger.error(`Group ${targetGroupId} not found`);
        await this.logAssignment({
          conversationId: conversation.id,
          visitorId: conversation.visitorId,
          groupId: targetGroupId,
          type: AssignmentLogType.NO_GROUP_FOUND,
          level: AssignmentLogLevel.ERROR,
          message: `Group ${targetGroupId} not found or deleted`,
          metadata: { requestedGroupId: targetGroupId },
        });
        return { success: false, message: 'Group not found' };
      }

      // 3. Find available agent with all validations
      const availableAgent = await this.findAvailableAgent(
        group,
        conversation.visitor?.id,
        queryRunner,
        conversation.id,
        conversation.visitorId,
      );

      if (!availableAgent) {
        this.logger.warn(`No available agent found for conversation ${conversationId}`);
        return { success: false, message: 'No available agent at the moment' };
      }

      // 4. Close current active thread if exists
      if (conversation.activeThreadId) {
        const activeThread = await queryRunner.manager.findOne(Thread, {
          where: { id: conversation.activeThreadId },
          relations: ['conversation'],
        });

        if (activeThread && activeThread.status === ThreadStatus.ACTIVE) {
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
            content: `Thread closed - Agent ${availableAgent.name} assigned`,
          });
          await queryRunner.manager.save(closedEvent);
        }
      }

      // 5. Create new thread for agent
      const newThread = this.threadRepository.create({
        conversation: conversation,
        conversationId: conversation.id,
        status: ThreadStatus.ACTIVE,
      });
      await queryRunner.manager.save(newThread);

      // 6. Create system event for agent assignment
      const assignmentEvent = this.eventRepository.create({
        threadId: newThread.id,
        type: EventType.SYSTEM,
        authorType: EventAuthorType.SYSTEM,
        agentId: availableAgent.id,
        content: `Agent ${availableAgent.name} has been assigned to this conversation`,
        metadata: {
          assignmentType: 'auto',
          groupId: group.id,
          groupName: group.name,
        },
      });
      await queryRunner.manager.save(assignmentEvent);

      // 7. Update conversation
      conversation.assignedAgentId = availableAgent.id;
      conversation.status = ConversationStatus.ACTIVE;
      conversation.activeThreadId = newThread.id;
      await queryRunner.manager.save(conversation);

      await queryRunner.commitTransaction();

      // 8. Sync to Firebase for real-time updates
      await this.syncToFirebase(conversation, availableAgent, assignmentEvent);

      // 9. Log successful assignment
      await this.logAssignment({
        conversationId: conversation.id,
        visitorId: conversation.visitorId,
        groupId: group.id,
        groupName: group.name,
        agentId: availableAgent.id,
        agentName: availableAgent.name,
        type: AssignmentLogType.ASSIGNMENT_SUCCESS,
        level: AssignmentLogLevel.SUCCESS,
        message: `Successfully assigned agent ${availableAgent.name} to visitor ${conversation.visitor?.name || conversation.visitorId}`,
        metadata: {
          routingStrategy: group.routingStrategy,
          agentEmail: availableAgent.email,
          agentRole: availableAgent.role,
          assignmentTime: new Date().toISOString(),
        },
      });

      this.logger.log(
        `✅ Conversation ${conversationId} assigned to agent ${availableAgent.name} (${availableAgent.id})`,
      );

      return {
        success: true,
        assignedAgent: availableAgent,
        conversation,
        message: 'Agent assigned successfully',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to assign conversation ${conversationId}:`,
        error,
      );
      
      await this.logAssignment({
        conversationId,
        visitorId: 'unknown',
        type: AssignmentLogType.ASSIGNMENT_FAILED,
        level: AssignmentLogLevel.ERROR,
        message: `Assignment failed with error: ${error.message}`,
        metadata: {
          errorDetails: error.message,
          errorStack: error.stack,
        },
      });
      
      return {
        success: false,
        message: error.message || 'Assignment failed',
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find available agent based on routing strategy
   * Validates: agent is in group, agent is online, accepting chats, limit not exceeded
   */
  private async findAvailableAgent(
    group: Group,
    visitorId: string,
    queryRunner: any,
    conversationId: string,
    visitorDbId: string,
  ): Promise<Agent | null> {
    // Get agent IDs from the group
    const agentIds = group.agents.map((a) => a.id);

    if (agentIds.length === 0) {
      this.logger.warn(`No agents found in group ${group.name}`);
      await this.logAssignment({
        conversationId,
        visitorId: visitorDbId,
        groupId: group.id,
        groupName: group.name,
        type: AssignmentLogType.NO_AGENTS_IN_GROUP,
        level: AssignmentLogLevel.WARNING,
        message: `No agents configured in group "${group.name}"`,
        metadata: {
          groupId: group.id,
          agentCount: 0,
        },
      });
      return null;
    }

    // Find eligible agents with all required validations
    const eligibleAgentsQuery = await this.agentRepository
      .createQueryBuilder('agent')
      .leftJoin('agent.conversations', 'conversation', 'conversation.assignedAgentId = agent.id AND conversation.status = :activeStatus')
      .innerJoin('agent.groups', 'group', 'group.id = :groupId')
      .where('agent.id IN (:...agentIds)', { agentIds })
      .andWhere('agent.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('agent.status = :status', { status: AgentStatus.ONLINE })
      .andWhere('agent.acceptingChats = :accepting', { accepting: true })
      .setParameter('activeStatus', ConversationStatus.ACTIVE)
      .setParameter('groupId', group.id)
      .groupBy('agent.id')
      .addGroupBy('agent.name')
      .addGroupBy('agent.email')
      .addGroupBy('agent.role')
      .addGroupBy('agent.status')
      .addGroupBy('agent.acceptingChats')
      .addGroupBy('agent.maxConcurrentChats')
      .addGroupBy('agent.avatar')
      .addGroupBy('agent.createdAt')
      .addGroupBy('agent.updatedAt')
      .addGroupBy('agent.deletedAt')
      .addGroupBy('agent.isDeleted')
      .select('agent')
      .addSelect(
        'COUNT(conversation.id)',
        'activeChats',
      )
      .addSelect(
        'agent.maxConcurrentChats - COUNT(conversation.id)',
        'availableSlots',
      )
      .having('COUNT(conversation.id) < agent.maxConcurrentChats')
      .getRawAndEntities();

    const eligibleAgents = eligibleAgentsQuery.entities;
    const rawData = eligibleAgentsQuery.raw;

    // Get detailed statistics for logging
    const totalAgents = group.agents.length;
    const onlineAgents = await this.agentRepository
      .createQueryBuilder('agent')
      .where('agent.id IN (:...agentIds)', { agentIds })
      .andWhere('agent.status = :status', { status: AgentStatus.ONLINE })
      .andWhere('agent.isDeleted = :isDeleted', { isDeleted: false })
      .getCount();
    
    const acceptingAgents = await this.agentRepository
      .createQueryBuilder('agent')
      .where('agent.id IN (:...agentIds)', { agentIds })
      .andWhere('agent.status = :status', { status: AgentStatus.ONLINE })
      .andWhere('agent.acceptingChats = :accepting', { accepting: true })
      .andWhere('agent.isDeleted = :isDeleted', { isDeleted: false })
      .getCount();

    if (eligibleAgents.length === 0) {
      this.logger.warn(
        `No eligible agents found. Criteria: online, accepting chats, in group ${group.name}, with available slots`,
      );
      
      // Determine specific reason why no agents available
      let logType = AssignmentLogType.NO_ACCEPTING_AGENTS;
      let message = '';
      
      if (onlineAgents === 0) {
        logType = AssignmentLogType.NO_ONLINE_AGENTS;
        message = `No online agents in group "${group.name}". Total agents: ${totalAgents}, Online: 0`;
      } else if (acceptingAgents === 0) {
        logType = AssignmentLogType.NO_ACCEPTING_AGENTS;
        message = `No agents accepting chats in group "${group.name}". Online: ${onlineAgents}, Accepting: 0`;
      } else {
        logType = AssignmentLogType.ALL_AGENTS_AT_CAPACITY;
        message = `All agents in group "${group.name}" are at maximum capacity. Online: ${onlineAgents}, Accepting: ${acceptingAgents}`;
      }
      
      await this.logAssignment({
        conversationId,
        visitorId: visitorDbId,
        groupId: group.id,
        groupName: group.name,
        type: logType,
        level: AssignmentLogLevel.WARNING,
        message,
        metadata: {
          totalAgents,
          onlineAgents,
          acceptingAgents,
          eligibleAgents: 0,
          routingStrategy: group.routingStrategy,
        },
      });
      
      return null;
    }

    this.logger.log(
      `Found ${eligibleAgents.length} eligible agent(s) in group ${group.name}`,
    );
    
    await this.logAssignment({
      conversationId,
      visitorId: visitorDbId,
      groupId: group.id,
      groupName: group.name,
      type: AssignmentLogType.AGENT_SELECTED,
      level: AssignmentLogLevel.INFO,
      message: `Found ${eligibleAgents.length} eligible agent(s) in group "${group.name}"`,
      metadata: {
        totalAgents,
        onlineAgents,
        acceptingAgents,
        eligibleAgents: eligibleAgents.length,
        routingStrategy: group.routingStrategy,
      },
    });

    // Apply routing strategy
    let selectedAgent: Agent | null = null;

    switch (group.routingStrategy) {
      case RoutingStrategy.ROUND_ROBIN:
        selectedAgent = this.roundRobinSelection(eligibleAgents);
        break;

      case RoutingStrategy.LEAST_LOADED:
        selectedAgent = this.leastLoadedSelection(eligibleAgents, rawData);
        break;

      case RoutingStrategy.STICKY:
        selectedAgent = await this.stickySelection(
          eligibleAgents,
          visitorId,
          rawData,
          queryRunner,
        );
        break;

      default:
        selectedAgent = this.roundRobinSelection(eligibleAgents);
    }

    return selectedAgent;
  }

  /**
   * Round Robin: Random selection from eligible agents
   */
  private roundRobinSelection(agents: Agent[]): Agent | null {
    if (agents.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * agents.length);
    return agents[randomIndex];
  }

  /**
   * Least Loaded: Select agent with most available slots
   */
  private leastLoadedSelection(agents: Agent[], rawData: any[]): Agent | null {
    if (agents.length === 0) return null;

    // Find agent with maximum available slots
    let maxSlots = -1;
    let selectedAgent: Agent | null = null;

    rawData.forEach((raw, index) => {
      const availableSlots = parseInt(raw.availableSlots || '0', 10);
      if (availableSlots > maxSlots) {
        maxSlots = availableSlots;
        selectedAgent = agents[index];
      }
    });

    return selectedAgent;
  }

  /**
   * Sticky: Prefer agent who previously chatted with this visitor
   */
  private async stickySelection(
    agents: Agent[],
    visitorId: string,
    rawData: any[],
    queryRunner: any,
  ): Promise<Agent | null> {
    if (agents.length === 0) return null;

    // Try to find previous agent for this visitor
    const previousConversation = await queryRunner.manager.findOne(
      Conversation,
      {
        where: {
          visitorId,
          assignedAgentId: agents.map((a) => a.id) as any,
        },
        order: { createdAt: 'DESC' },
      },
    );

    if (previousConversation) {
      const previousAgent = agents.find(
        (a) => a.id === previousConversation.assignedAgentId,
      );
      if (previousAgent) {
        this.logger.log(
          `Sticky assignment: Returning visitor to agent ${previousAgent.name}`,
        );
        return previousAgent;
      }
    }

    // Fallback to least loaded
    return this.leastLoadedSelection(agents, rawData);
  }

  /**
   * Sync assignment to Firebase for real-time updates
   */
  private async syncToFirebase(
    conversation: Conversation,
    agent: Agent,
    assignmentEvent: Event,
  ): Promise<void> {
    try {
      // Update conversation in Firebase
      await this.firebaseService.updateConversation(conversation.id, {
        status: conversation.status,
        assignedAgentId: agent.id,
        assignedAgentName: agent.name,
        assignedAgent: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          avatar: agent.avatar,
        },
        assignedAt: new Date().toISOString(),
        activeThreadId: conversation.activeThreadId,
      });

      // Add system event to Firebase
      await this.firebaseService.addSystemEvent(conversation.id, {
        id: assignmentEvent.id,
        type: 'agent_assigned',
        message: assignmentEvent.content,
        metadata: assignmentEvent.metadata,
        createdAt: assignmentEvent.createdAt.toISOString(),
      });

      this.logger.log(
        `Firebase synced for conversation ${conversation.id}`,
      );
    } catch (error) {
      this.logger.error('Failed to sync to Firebase:', error);
      // Don't throw - assignment already succeeded in MySQL
    }
  }

  /**
   * Helper method to log assignment events to database
   */
  private async logAssignment(logData: {
    conversationId: string;
    visitorId: string;
    groupId?: string;
    groupName?: string;
    agentId?: string;
    agentName?: string;
    type: AssignmentLogType;
    level: AssignmentLogLevel;
    message: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const log = this.assignmentLogRepository.create({
        conversationId: logData.conversationId,
        visitorId: logData.visitorId,
        groupId: logData.groupId,
        groupName: logData.groupName,
        agentId: logData.agentId,
        agentName: logData.agentName,
        type: logData.type,
        level: logData.level,
        message: logData.message,
        metadata: logData.metadata || {},
      });
      
      await this.assignmentLogRepository.save(log);
    } catch (error) {
      // Don't throw - logging should not break assignment
      this.logger.error('Failed to write assignment log:', error);
    }
  }
}
