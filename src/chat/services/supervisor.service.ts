import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Conversation, ConversationStatus } from '../../database/mysql/conversation.entity';
import { Agent, AgentStatus } from '../../database/mysql/agent.entity';
import { Event, EventType, EventAuthorType } from '../../database/mysql/event.entity';
import { FirebaseService } from '../../firebase/firebase.service';

export interface SupervisorAction {
  supervisorId: string;
  conversationId: string;
  action: 'monitor_start' | 'monitor_stop' | 'takeover' | 'tag_add';
  timestamp: Date;
  metadata?: any;
}

@Injectable()
export class SupervisorService {
  private readonly logger = new Logger(SupervisorService.name);
  private monitoringSessions: Map<string, Set<string>> = new Map(); // conversationId -> Set of supervisorIds
  private auditLog: SupervisorAction[] = [];

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private firebaseService: FirebaseService,
  ) {}

  /**
   * Get all active conversations for supervisor monitoring
   */
  async getActiveConversations() {
    const conversations = await this.conversationRepository.find({
      where: { status: In([ConversationStatus.ACTIVE, ConversationStatus.PENDING]) },
      relations: ['visitor', 'assignedAgent', 'group'],
      order: { createdAt: 'DESC' },
    });

    return conversations.map((conv) => ({
      id: conv.id,
      status: conv.status,
      visitorName: conv.visitor?.name || 'Unknown',
      visitorEmail: conv.visitor?.email,
      assignedAgent: conv.assignedAgent
        ? {
            id: conv.assignedAgent.id,
            name: conv.assignedAgent.name,
            email: conv.assignedAgent.email,
          }
        : null,
      groupName: conv.group?.name,
      createdAt: conv.createdAt,
      activeThreadId: conv.activeThreadId,
      isMonitored: this.isBeingMonitored(conv.id),
    }));
  }

  /**
   * Start monitoring a conversation (silent - no notification to agent/visitor)
   */
  async startMonitoring(conversationId: string, supervisorId: string): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Add to monitoring sessions
    if (!this.monitoringSessions.has(conversationId)) {
      this.monitoringSessions.set(conversationId, new Set());
    }
    this.monitoringSessions.get(conversationId)!.add(supervisorId);

    // Log for audit
    this.logAction({
      supervisorId,
      conversationId,
      action: 'monitor_start',
      timestamp: new Date(),
    });

    // Update Firebase (for supervisor UI only - not visible to agent/visitor)
    await this.firebaseService.getDatabase()
      .ref(`supervisor/monitoring/${conversationId}/${supervisorId}`)
      .set({
        startedAt: new Date().toISOString(),
        active: true,
      });

    this.logger.log(`Supervisor ${supervisorId} started monitoring conversation ${conversationId}`);
  }

  /**
   * Stop monitoring a conversation
   */
  async stopMonitoring(conversationId: string, supervisorId: string): Promise<void> {
    if (this.monitoringSessions.has(conversationId)) {
      this.monitoringSessions.get(conversationId)!.delete(supervisorId);
      if (this.monitoringSessions.get(conversationId)!.size === 0) {
        this.monitoringSessions.delete(conversationId);
      }
    }

    // Log for audit
    this.logAction({
      supervisorId,
      conversationId,
      action: 'monitor_stop',
      timestamp: new Date(),
    });

    // Remove from Firebase
    await this.firebaseService.getDatabase()
      .ref(`supervisor/monitoring/${conversationId}/${supervisorId}`)
      .remove();

    this.logger.log(`Supervisor ${supervisorId} stopped monitoring conversation ${conversationId}`);
  }

  /**
   * Supervisor takeover - transfer conversation from agent to supervisor
   */
  async takeoverConversation(
    conversationId: string,
    supervisorId: string,
    reason?: string,
  ): Promise<any> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['assignedAgent', 'visitor'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const supervisor = await this.agentRepository.findOne({
      where: { id: supervisorId },
    });

    if (!supervisor) {
      throw new NotFoundException('Supervisor not found');
    }

    const previousAgent = conversation.assignedAgent;

    // Transfer ownership
    conversation.assignedAgentId = supervisorId;
    await this.conversationRepository.save(conversation);

    // Create system event
    const event = this.eventRepository.create({
      threadId: conversation.activeThreadId,
      type: EventType.SYSTEM,
      authorType: EventAuthorType.SYSTEM,
      content: `Supervisor ${supervisor.name} took over the conversation${reason ? `: ${reason}` : ''}${previousAgent ? ` (from ${previousAgent.name})` : ''}`,
    });
    await this.eventRepository.save(event);

    // Log for audit
    this.logAction({
      supervisorId,
      conversationId,
      action: 'takeover',
      timestamp: new Date(),
      metadata: {
        previousAgentId: previousAgent?.id,
        previousAgentName: previousAgent?.name,
        reason,
      },
    });

    // Update Firebase
    await this.firebaseService.updateConversation(conversationId, {
      assignedAgentId: supervisorId,
      assignedAgentName: supervisor.name,
      takenOverBy: supervisorId,
      takenOverAt: new Date().toISOString(),
      takeoverReason: reason,
    });

    // Add system event to Firebase
    await this.firebaseService.addSystemEvent(conversationId, {
      id: event.id,
      type: 'supervisor_takeover',
      message: event.content,
      createdAt: event.createdAt.toISOString(),
    });

    this.logger.log(
      `Supervisor ${supervisorId} took over conversation ${conversationId} from ${previousAgent?.name || 'unassigned'}`,
    );

    return {
      success: true,
      message: 'Conversation taken over successfully',
      previousAgent: previousAgent
        ? {
            id: previousAgent.id,
            name: previousAgent.name,
          }
        : null,
      newAgent: {
        id: supervisor.id,
        name: supervisor.name,
      },
    };
  }

  /**
   * Get agent availability overview
   */
  async getAgentAvailability() {
    const agents = await this.agentRepository.find({
      where: { deletedAt: null as any },
    });

    const statusCounts = {
      online: agents.filter((a) => a.status === AgentStatus.ONLINE).length,
      offline: agents.filter((a) => a.status === AgentStatus.OFFLINE).length,
      away: agents.filter((a) => a.status === AgentStatus.AWAY).length,
      busy: agents.filter((a) => a.status === AgentStatus.BUSY).length,
    };

    return {
      total: agents.length,
      statusCounts,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        status: a.status,
        acceptingChats: a.acceptingChats,
        lastActivityAt: a.lastActivityAt,
      })),
    };
  }

  /**
   * Get agent workload overview
   */
  async getAgentWorkload() {
    const agents = await this.agentRepository.find({
      where: { deletedAt: null as any },
      relations: ['conversations'],
    });

    const workload = await Promise.all(
      agents.map(async (agent) => {
        const activeChats = await this.conversationRepository.count({
          where: {
            assignedAgentId: agent.id,
            status: ConversationStatus.ACTIVE,
          },
        });

        return {
          agentId: agent.id,
          agentName: agent.name,
          status: agent.status,
          activeChats,
          maxConcurrentChats: agent.maxConcurrentChats,
          utilization: agent.maxConcurrentChats > 0
            ? Math.round((activeChats / agent.maxConcurrentChats) * 100)
            : 0,
          acceptingChats: agent.acceptingChats,
        };
      }),
    );

    return workload.sort((a, b) => b.activeChats - a.activeChats);
  }

  /**
   * Get supervisor audit log
   */
  getAuditLog(): SupervisorAction[] {
    // Return last 100 actions
    return this.auditLog.slice(-100).reverse();
  }

  /**
   * Check if conversation is being monitored
   */
  private isBeingMonitored(conversationId: string): boolean {
    return this.monitoringSessions.has(conversationId) && 
           this.monitoringSessions.get(conversationId)!.size > 0;
  }

  /**
   * Log supervisor action for audit
   */
  private logAction(action: SupervisorAction): void {
    this.auditLog.push(action);
    // Keep only last 1000 actions in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }
}
