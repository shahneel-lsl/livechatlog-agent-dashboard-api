import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { Agent, AgentStatus } from '../database/mysql/agent.entity';
import { Group, RoutingStrategy } from '../database/mysql/group.entity';
import { Conversation, ConversationStatus } from '../database/mysql/conversation.entity';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class AssignmentQueueService implements OnModuleInit {
  private assignmentQueue: Queue;
  private assignmentWorker: Worker;
  private connection: Redis;

  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private chatService: ChatService,
  ) {
    this.connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });

    this.assignmentQueue = new Queue('agent-assignment', {
      connection: this.connection,
    });
  }

  onModuleInit() {
    this.startWorker();
  }

  private startWorker() {
    this.assignmentWorker = new Worker(
      'agent-assignment',
      async (job) => {
        const { conversationId, groupId } = job.data;

        try {
          await this.processAssignment(conversationId, groupId);
        } catch (error) {
          console.error(
            `Failed to assign conversation ${conversationId}:`,
            error,
          );
          throw error;
        }
      },
      {
        connection: this.connection,
        concurrency: 5,
      },
    );

    this.assignmentWorker.on('completed', (job) => {
      console.log(`Assignment job ${job.id} completed`);
    });

    this.assignmentWorker.on('failed', (job, err) => {
      console.error(`Assignment job ${job?.id} failed:`, err);
    });
  }

  async addAssignmentJob(
    conversationId: string,
    groupId?: string,
  ): Promise<void> {
    await this.assignmentQueue.add(
      'assign-agent',
      { conversationId, groupId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  }

  private async processAssignment(
    conversationId: string,
    groupId?: string,
  ): Promise<void> {
    // Find conversation
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['visitor', 'group'],
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.status !== ConversationStatus.PENDING) {
      console.log(`Conversation ${conversationId} is not pending, skipping`);
      return;
    }

    // Find group
    const targetGroupId = groupId || conversation.groupId;
    if (!targetGroupId) {
      console.log('No group specified for assignment');
      return;
    }

    const group = await this.groupRepository.findOne({
      where: { id: targetGroupId, isDeleted: false },
      relations: ['agents'],
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // Find available agent based on routing strategy
    const availableAgent = await this.findAvailableAgent(
      group,
      conversation.visitor?.id,
    );

    if (!availableAgent) {
      console.log('No available agent found, will retry');
      throw new Error('No available agent');
    }

    // Assign conversation
    await this.chatService.assignConversation(conversationId, {
      agentId: availableAgent.id,
      reason: 'auto_assignment',
    });

    console.log(
      `Conversation ${conversationId} assigned to agent ${availableAgent.id}`,
    );
  }

  private async findAvailableAgent(
    group: Group,
    visitorId?: string,
  ): Promise<Agent | null> {
    // Get agents in the group
    const agentIds = group.agents.map((a) => a.id);

    if (agentIds.length === 0) {
      return null;
    }

    // Find eligible agents
    const eligibleAgents = await this.agentRepository
      .createQueryBuilder('agent')
      .leftJoin('agent.conversations', 'conversation')
      .where('agent.id IN (:...agentIds)', { agentIds })
      .andWhere('agent.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('agent.status = :status', { status: AgentStatus.ONLINE })
      .andWhere('agent.acceptingChats = :accepting', { accepting: true })
      .groupBy('agent.id')
      .select([
        'agent',
        'COUNT(CASE WHEN conversation.status = :activeStatus THEN 1 END) as activeChats',
      ])
      .addSelect(
        'agent.maxConcurrentChats - COUNT(CASE WHEN conversation.status = :activeStatus THEN 1 END)',
        'availableSlots',
      )
      .setParameter('activeStatus', ConversationStatus.ACTIVE)
      .having('activeChats < agent.maxConcurrentChats')
      .getRawAndEntities();

    if (!eligibleAgents.entities.length) {
      return null;
    }

    // Apply routing strategy
    switch (group.routingStrategy) {
      case RoutingStrategy.ROUND_ROBIN:
        return this.roundRobinSelection(eligibleAgents.entities);

      case RoutingStrategy.LEAST_LOADED:
        return this.leastLoadedSelection(
          eligibleAgents.entities,
          eligibleAgents.raw,
        );

      case RoutingStrategy.STICKY:
        return this.stickySelection(
          eligibleAgents.entities,
          visitorId,
          eligibleAgents.raw,
        );

      default:
        return eligibleAgents.entities[0];
    }
  }

  private roundRobinSelection(agents: Agent[]): Agent {
    // Simple round-robin - can be enhanced with Redis to track last assigned
    const randomIndex = Math.floor(Math.random() * agents.length);
    return agents[randomIndex];
  }

  private leastLoadedSelection(agents: Agent[], rawData: any[]): Agent {
    // Find agent with most available slots
    let selectedAgent = agents[0];
    let maxSlots = 0;

    rawData.forEach((data, index) => {
      const slots = parseInt(data.availableSlots) || 0;
      if (slots > maxSlots) {
        maxSlots = slots;
        selectedAgent = agents[index];
      }
    });

    return selectedAgent;
  }

  private async stickySelection(
    agents: Agent[],
    visitorId?: string,
    rawData: any[] = [],
  ): Promise<Agent> {
    if (!visitorId) {
      return this.leastLoadedSelection(agents, rawData);
    }

    // Try to find the agent who previously handled this visitor
    const previousConversation = await this.conversationRepository.findOne({
      where: { visitorId },
      relations: ['assignedAgent'],
      order: { createdAt: 'DESC' },
    });

    if (
      previousConversation?.assignedAgent &&
      agents.some((a) => a.id === previousConversation.assignedAgent.id)
    ) {
      return previousConversation.assignedAgent;
    }

    // Fallback to least loaded
    return this.leastLoadedSelection(agents, rawData);
  }

  async onModuleDestroy() {
    await this.assignmentWorker?.close();
    await this.assignmentQueue.close();
    await this.connection.quit();
  }
}
