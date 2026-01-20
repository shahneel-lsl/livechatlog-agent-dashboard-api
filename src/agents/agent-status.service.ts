import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Agent, AgentStatus } from '../database/mysql/agent.entity';
import { AgentSession, SessionStatus } from '../database/mysql/agent-session.entity';
import { AgentSchedule, DayOfWeek } from '../database/mysql/agent-schedule.entity';
import { AgentStatusLog, StatusChangeReason } from '../database/mysql/agent-status-log.entity';
import { Conversation, ConversationStatus } from '../database/mysql/conversation.entity';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateAutoAwayDto } from './dto/auto-away.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';

@Injectable()
export class AgentStatusService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(AgentSession)
    private sessionRepository: Repository<AgentSession>,
    @InjectRepository(AgentSchedule)
    private scheduleRepository: Repository<AgentSchedule>,
    @InjectRepository(AgentStatusLog)
    private statusLogRepository: Repository<AgentStatusLog>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  /**
   * Update agent status (online/offline/away/busy/available)
   * Uses token-based auth - agent can only update their own status
   */
  async updateStatus(
    agent: Agent,
    updateStatusDto: UpdateStatusDto,
    ipAddress?: string,
  ): Promise<Agent> {
    const previousStatus = agent.status;
    const newStatus = updateStatusDto.status;

    // Log status change
    await this.logStatusChange(
      agent.id,
      previousStatus,
      newStatus,
      StatusChangeReason.MANUAL,
      updateStatusDto.reason,
      ipAddress,
    );

    // Update agent status
    agent.status = newStatus;
    agent.lastActivityAt = new Date();

    return this.agentRepository.save(agent);
  }

  /**
   * Toggle agent online/offline status
   */
  async toggleOnlineStatus(agent: Agent, ipAddress?: string): Promise<Agent> {
    const previousStatus = agent.status;
    const newStatus =
      agent.status === AgentStatus.OFFLINE
        ? AgentStatus.ONLINE
        : AgentStatus.OFFLINE;

    await this.logStatusChange(
      agent.id,
      previousStatus,
      newStatus,
      StatusChangeReason.MANUAL,
      'Toggle online/offline',
      ipAddress,
    );

    agent.status = newStatus;
    agent.lastActivityAt = new Date();

    if (newStatus === AgentStatus.OFFLINE) {
      agent.lastLogoutAt = new Date();
    } else {
      agent.lastLoginAt = new Date();
    }

    return this.agentRepository.save(agent);
  }

  /**
   * Toggle accepting chats
   */
  async toggleAcceptingChats(
    agent: Agent,
    dto: ToggleAvailabilityDto,
  ): Promise<Agent> {
    agent.acceptingChats = dto.acceptingChats;
    agent.lastActivityAt = new Date();
    return this.agentRepository.save(agent);
  }

  /**
   * Get current agent status with details
   */
  async getStatusDetails(agent: Agent): Promise<any> {
    const activeChats = await this.conversationRepository.count({
      where: {
        assignedAgentId: agent.id,
        status: ConversationStatus.ACTIVE,
      },
    });

    const activeSession = await this.sessionRepository.findOne({
      where: {
        agentId: agent.id,
        status: SessionStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });

    const schedule = await this.scheduleRepository.find({
      where: { agentId: agent.id, isActive: true },
      order: { dayOfWeek: 'ASC' },
    });

    const isWithinSchedule = this.checkIfWithinSchedule(schedule);

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        status: agent.status,
        acceptingChats: agent.acceptingChats,
        maxConcurrentChats: agent.maxConcurrentChats,
        avatar: agent.avatar,
      },
      activity: {
        lastActivityAt: agent.lastActivityAt,
        lastLoginAt: agent.lastLoginAt,
        lastLogoutAt: agent.lastLogoutAt,
        autoAwayMinutes: agent.autoAwayMinutes,
        sessionTimeoutMinutes: agent.sessionTimeoutMinutes,
      },
      session: activeSession
        ? {
            id: activeSession.id,
            createdAt: activeSession.createdAt,
            lastActivityAt: activeSession.lastActivityAt,
            expiresAt: activeSession.expiresAt,
          }
        : null,
      workload: {
        activeChats,
        maxConcurrentChats: agent.maxConcurrentChats,
        availability:
          agent.maxConcurrentChats > 0
            ? Math.round(
                ((agent.maxConcurrentChats - activeChats) /
                  agent.maxConcurrentChats) *
                  100,
              )
            : 0,
        isOverloaded: activeChats >= agent.maxConcurrentChats,
      },
      schedule: {
        enabled: agent.scheduleEnabled,
        isWithinSchedule,
        schedules: schedule.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          dayName: DayOfWeek[s.dayOfWeek],
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive,
          timezone: s.timezone,
        })),
      },
    };
  }

  /**
   * Update auto-away settings
   */
  async updateAutoAwaySettings(
    agent: Agent,
    dto: UpdateAutoAwayDto,
  ): Promise<Agent> {
    if (dto.autoAwayMinutes !== undefined) {
      agent.autoAwayMinutes = dto.autoAwayMinutes;
    }
    if (dto.sessionTimeoutMinutes !== undefined) {
      agent.sessionTimeoutMinutes = dto.sessionTimeoutMinutes;
    }
    if (dto.scheduleEnabled !== undefined) {
      agent.scheduleEnabled = dto.scheduleEnabled;
    }

    return this.agentRepository.save(agent);
  }

  /**
   * Record activity (heartbeat) to prevent auto-away
   */
  async recordActivity(agent: Agent, sessionToken?: string): Promise<void> {
    agent.lastActivityAt = new Date();
    await this.agentRepository.save(agent);

    // Update session if exists
    if (sessionToken) {
      await this.sessionRepository.update(
        { agentId: agent.id, token: sessionToken, status: SessionStatus.ACTIVE },
        { lastActivityAt: new Date() },
      );
    }
  }

  /**
   * Create agent schedule
   */
  async createSchedule(
    agent: Agent,
    dto: CreateScheduleDto,
  ): Promise<AgentSchedule> {
    // Check for existing schedule on same day
    const existing = await this.scheduleRepository.findOne({
      where: { agentId: agent.id, dayOfWeek: dto.dayOfWeek },
    });

    if (existing) {
      throw new BadRequestException(
        `Schedule already exists for ${DayOfWeek[dto.dayOfWeek]}. Use update instead.`,
      );
    }

    const schedule = this.scheduleRepository.create({
      agentId: agent.id,
      ...dto,
    });

    return this.scheduleRepository.save(schedule);
  }

  /**
   * Update agent schedule
   */
  async updateSchedule(
    agent: Agent,
    scheduleId: string,
    dto: UpdateScheduleDto,
  ): Promise<AgentSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, agentId: agent.id },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    Object.assign(schedule, dto);
    return this.scheduleRepository.save(schedule);
  }

  /**
   * Delete agent schedule
   */
  async deleteSchedule(agent: Agent, scheduleId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, agentId: agent.id },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await this.scheduleRepository.remove(schedule);
  }

  /**
   * Get all schedules for agent
   */
  async getSchedules(agent: Agent): Promise<AgentSchedule[]> {
    return this.scheduleRepository.find({
      where: { agentId: agent.id },
      order: { dayOfWeek: 'ASC' },
    });
  }

  /**
   * Bulk create/update schedules
   */
  async setWeeklySchedule(
    agent: Agent,
    schedules: CreateScheduleDto[],
  ): Promise<AgentSchedule[]> {
    // Delete existing schedules
    await this.scheduleRepository.delete({ agentId: agent.id });

    // Create new schedules
    const newSchedules = schedules.map((dto) =>
      this.scheduleRepository.create({
        agentId: agent.id,
        ...dto,
      }),
    );

    return this.scheduleRepository.save(newSchedules);
  }

  /**
   * Get status history/logs for agent
   */
  async getStatusHistory(
    agent: Agent,
    limit = 50,
  ): Promise<AgentStatusLog[]> {
    return this.statusLogRepository.find({
      where: { agentId: agent.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Process auto-away for inactive agents
   * Called by scheduler
   */
  async processAutoAway(): Promise<{ processed: number; awayCount: number }> {
    const now = new Date();
    let processed = 0;
    let awayCount = 0;

    // Find online agents who haven't had activity
    const agents = await this.agentRepository.find({
      where: {
        status: AgentStatus.ONLINE,
        isDeleted: false,
      },
    });

    for (const agent of agents) {
      processed++;
      if (!agent.lastActivityAt) continue;

      const inactiveMinutes =
        (now.getTime() - agent.lastActivityAt.getTime()) / 1000 / 60;

      if (inactiveMinutes >= agent.autoAwayMinutes) {
        await this.logStatusChange(
          agent.id,
          AgentStatus.ONLINE,
          AgentStatus.AWAY,
          StatusChangeReason.AUTO_AWAY,
          `Inactive for ${Math.round(inactiveMinutes)} minutes`,
        );

        agent.status = AgentStatus.AWAY;
        await this.agentRepository.save(agent);
        awayCount++;
      }
    }

    return { processed, awayCount };
  }

  /**
   * Process session timeouts
   * Called by scheduler
   */
  async processSessionTimeouts(): Promise<{
    processed: number;
    timedOut: number;
  }> {
    const now = new Date();
    let processed = 0;
    let timedOut = 0;

    // Find agents with active sessions
    const agents = await this.agentRepository.find({
      where: { isDeleted: false },
    });

    for (const agent of agents) {
      processed++;
      if (!agent.lastActivityAt) continue;

      const inactiveMinutes =
        (now.getTime() - agent.lastActivityAt.getTime()) / 1000 / 60;

      if (inactiveMinutes >= agent.sessionTimeoutMinutes) {
        // Expire all active sessions
        await this.sessionRepository.update(
          { agentId: agent.id, status: SessionStatus.ACTIVE },
          {
            status: SessionStatus.EXPIRED,
            loggedOutAt: now,
            logoutReason: 'Session timeout due to inactivity',
          },
        );

        // Set agent offline
        if (agent.status !== AgentStatus.OFFLINE) {
          await this.logStatusChange(
            agent.id,
            agent.status,
            AgentStatus.OFFLINE,
            StatusChangeReason.SESSION_TIMEOUT,
            `Session timeout after ${Math.round(inactiveMinutes)} minutes of inactivity`,
          );

          agent.status = AgentStatus.OFFLINE;
          agent.lastLogoutAt = now;
          await this.agentRepository.save(agent);
        }

        timedOut++;
      }
    }

    return { processed, timedOut };
  }

  /**
   * Process schedule-based availability
   * Called by scheduler
   */
  async processScheduleAvailability(): Promise<{
    processed: number;
    updated: number;
  }> {
    let processed = 0;
    let updated = 0;

    // Find agents with schedule enabled
    const agents = await this.agentRepository.find({
      where: { scheduleEnabled: true, isDeleted: false },
    });

    for (const agent of agents) {
      processed++;

      const schedules = await this.scheduleRepository.find({
        where: { agentId: agent.id, isActive: true },
      });

      const shouldBeOnline = this.checkIfWithinSchedule(schedules);

      if (shouldBeOnline && agent.status === AgentStatus.OFFLINE) {
        await this.logStatusChange(
          agent.id,
          AgentStatus.OFFLINE,
          AgentStatus.ONLINE,
          StatusChangeReason.SCHEDULE,
          'Schedule-based auto-online',
        );
        agent.status = AgentStatus.ONLINE;
        await this.agentRepository.save(agent);
        updated++;
      } else if (!shouldBeOnline && agent.status !== AgentStatus.OFFLINE) {
        await this.logStatusChange(
          agent.id,
          agent.status,
          AgentStatus.OFFLINE,
          StatusChangeReason.SCHEDULE,
          'Schedule-based auto-offline',
        );
        agent.status = AgentStatus.OFFLINE;
        agent.lastLogoutAt = new Date();
        await this.agentRepository.save(agent);
        updated++;
      }
    }

    return { processed, updated };
  }

  /**
   * Process overload-based status change
   */
  async processOverloadCheck(): Promise<{ processed: number; busy: number }> {
    let processed = 0;
    let busy = 0;

    const agents = await this.agentRepository.find({
      where: { status: AgentStatus.ONLINE, isDeleted: false },
    });

    for (const agent of agents) {
      processed++;

      const activeChats = await this.conversationRepository.count({
        where: {
          assignedAgentId: agent.id,
          status: ConversationStatus.ACTIVE,
        },
      });

      if (activeChats >= agent.maxConcurrentChats) {
        await this.logStatusChange(
          agent.id,
          AgentStatus.ONLINE,
          AgentStatus.BUSY,
          StatusChangeReason.OVERLOAD,
          `Reached max concurrent chats (${activeChats}/${agent.maxConcurrentChats})`,
        );
        agent.status = AgentStatus.BUSY;
        await this.agentRepository.save(agent);
        busy++;
      }
    }

    // Also check busy agents that are now available
    const busyAgents = await this.agentRepository.find({
      where: { status: AgentStatus.BUSY, isDeleted: false },
    });

    for (const agent of busyAgents) {
      const activeChats = await this.conversationRepository.count({
        where: {
          assignedAgentId: agent.id,
          status: ConversationStatus.ACTIVE,
        },
      });

      if (activeChats < agent.maxConcurrentChats) {
        await this.logStatusChange(
          agent.id,
          AgentStatus.BUSY,
          AgentStatus.ONLINE,
          StatusChangeReason.SYSTEM,
          `Now available (${activeChats}/${agent.maxConcurrentChats})`,
        );
        agent.status = AgentStatus.ONLINE;
        await this.agentRepository.save(agent);
      }
    }

    return { processed, busy };
  }

  /**
   * Get all online agents
   */
  async getOnlineAgents(): Promise<Agent[]> {
    return this.agentRepository.find({
      where: [
        { status: AgentStatus.ONLINE, isDeleted: false },
        { status: AgentStatus.AVAILABLE, isDeleted: false },
        { status: AgentStatus.BUSY, isDeleted: false },
      ],
    });
  }

  /**
   * Get agent status summary (for admin/supervisor)
   */
  async getStatusSummary(): Promise<any> {
    const agents = await this.agentRepository.find({
      where: { isDeleted: false },
    });

    const summary = {
      total: agents.length,
      online: 0,
      offline: 0,
      away: 0,
      busy: 0,
      available: 0,
      acceptingChats: 0,
      notAcceptingChats: 0,
    };

    for (const agent of agents) {
      switch (agent.status) {
        case AgentStatus.ONLINE:
          summary.online++;
          break;
        case AgentStatus.OFFLINE:
          summary.offline++;
          break;
        case AgentStatus.AWAY:
          summary.away++;
          break;
        case AgentStatus.BUSY:
          summary.busy++;
          break;
        case AgentStatus.AVAILABLE:
          summary.available++;
          break;
      }

      if (agent.acceptingChats) {
        summary.acceptingChats++;
      } else {
        summary.notAcceptingChats++;
      }
    }

    return summary;
  }

  /**
   * Force logout agent (admin only)
   */
  async forceLogout(
    adminAgent: Agent,
    targetAgentId: string,
    reason?: string,
  ): Promise<Agent> {
    if (adminAgent.role !== 'admin' && adminAgent.role !== 'supervisor') {
      throw new ForbiddenException('Only admin/supervisor can force logout');
    }

    const targetAgent = await this.agentRepository.findOne({
      where: { id: targetAgentId, isDeleted: false },
    });

    if (!targetAgent) {
      throw new NotFoundException('Agent not found');
    }

    // Expire all sessions
    await this.sessionRepository.update(
      { agentId: targetAgentId, status: SessionStatus.ACTIVE },
      {
        status: SessionStatus.FORCED_LOGOUT,
        loggedOutAt: new Date(),
        logoutReason: reason || `Forced logout by ${adminAgent.name}`,
      },
    );

    // Set status to offline
    await this.logStatusChange(
      targetAgentId,
      targetAgent.status,
      AgentStatus.OFFLINE,
      StatusChangeReason.SYSTEM,
      reason || `Forced logout by ${adminAgent.name}`,
    );

    targetAgent.status = AgentStatus.OFFLINE;
    targetAgent.lastLogoutAt = new Date();

    return this.agentRepository.save(targetAgent);
  }

  /**
   * Helper: Check if current time is within schedule
   */
  private checkIfWithinSchedule(schedules: AgentSchedule[]): boolean {
    if (!schedules || schedules.length === 0) return false;

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // Convert to Monday=0
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const todaySchedule = schedules.find(
      (s) => s.dayOfWeek === currentDay && s.isActive,
    );

    if (!todaySchedule) return false;

    return (
      currentTime >= todaySchedule.startTime &&
      currentTime <= todaySchedule.endTime
    );
  }

  /**
   * Helper: Log status change
   */
  private async logStatusChange(
    agentId: string,
    previousStatus: AgentStatus,
    newStatus: AgentStatus,
    reason: StatusChangeReason,
    details?: string,
    ipAddress?: string,
  ): Promise<void> {
    const log = this.statusLogRepository.create({
      agentId,
      previousStatus,
      newStatus,
      reason,
      details,
      ipAddress,
    });
    await this.statusLogRepository.save(log);
  }
}
