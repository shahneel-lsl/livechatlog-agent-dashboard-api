import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Agent, AgentStatus } from '../database/mysql/agent.entity';
import { AgentSession, SessionStatus } from '../database/mysql/agent-session.entity';
import { AgentStatusLog, StatusChangeReason } from '../database/mysql/agent-status-log.entity';

export interface SessionInfo {
  sessionId: string;
  agentId: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(AgentSession)
    private sessionRepository: Repository<AgentSession>,
    @InjectRepository(AgentStatusLog)
    private statusLogRepository: Repository<AgentStatusLog>,
    private jwtService: JwtService,
  ) {}

  /**
   * Create a new session for agent
   */
  async createSession(
    agent: Agent,
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AgentSession> {
    // Calculate expiry based on agent's timeout settings
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + agent.sessionTimeoutMinutes);

    const session = this.sessionRepository.create({
      agentId: agent.id,
      token: this.hashToken(token),
      status: SessionStatus.ACTIVE,
      ipAddress,
      userAgent,
      lastActivityAt: new Date(),
      expiresAt,
    });

    // Update agent login time and status
    agent.lastLoginAt = new Date();
    agent.lastActivityAt = new Date();
    if (agent.status === AgentStatus.OFFLINE) {
      await this.logStatusChange(
        agent.id,
        AgentStatus.OFFLINE,
        AgentStatus.ONLINE,
        StatusChangeReason.LOGIN,
        'Session created',
        ipAddress,
      );
      agent.status = AgentStatus.ONLINE;
    }
    await this.agentRepository.save(agent);

    return this.sessionRepository.save(session);
  }

  /**
   * Validate session and extend expiry
   */
  async validateAndExtendSession(
    agentId: string,
    token: string,
  ): Promise<AgentSession | null> {
    const hashedToken = this.hashToken(token);

    const session = await this.sessionRepository.findOne({
      where: {
        agentId,
        token: hashedToken,
        status: SessionStatus.ACTIVE,
      },
    });

    if (!session) return null;

    // Check if expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      session.status = SessionStatus.EXPIRED;
      session.loggedOutAt = new Date();
      session.logoutReason = 'Session expired';
      await this.sessionRepository.save(session);
      return null;
    }

    // Extend session
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
    });

    if (agent) {
      const newExpiry = new Date();
      newExpiry.setMinutes(newExpiry.getMinutes() + agent.sessionTimeoutMinutes);
      session.expiresAt = newExpiry;
      session.lastActivityAt = new Date();
      await this.sessionRepository.save(session);
    }

    return session;
  }

  /**
   * Get active sessions for agent
   */
  async getActiveSessions(agentId: string): Promise<AgentSession[]> {
    return this.sessionRepository.find({
      where: {
        agentId,
        status: SessionStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Logout from current session
   */
  async logout(
    agent: Agent,
    token: string,
    reason?: string,
  ): Promise<void> {
    const hashedToken = this.hashToken(token);

    await this.sessionRepository.update(
      { agentId: agent.id, token: hashedToken, status: SessionStatus.ACTIVE },
      {
        status: SessionStatus.LOGGED_OUT,
        loggedOutAt: new Date(),
        logoutReason: reason || 'Manual logout',
      },
    );

    // Check if this was the last active session
    const remainingSessions = await this.sessionRepository.count({
      where: { agentId: agent.id, status: SessionStatus.ACTIVE },
    });

    if (remainingSessions === 0) {
      await this.logStatusChange(
        agent.id,
        agent.status,
        AgentStatus.OFFLINE,
        StatusChangeReason.LOGOUT,
        'All sessions ended',
      );
      agent.status = AgentStatus.OFFLINE;
      agent.lastLogoutAt = new Date();
      await this.agentRepository.save(agent);
    }
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(agent: Agent, reason?: string): Promise<number> {
    const result = await this.sessionRepository.update(
      { agentId: agent.id, status: SessionStatus.ACTIVE },
      {
        status: SessionStatus.LOGGED_OUT,
        loggedOutAt: new Date(),
        logoutReason: reason || 'Logout from all devices',
      },
    );

    // Update agent status
    await this.logStatusChange(
      agent.id,
      agent.status,
      AgentStatus.OFFLINE,
      StatusChangeReason.LOGOUT,
      reason || 'Logout from all devices',
    );
    agent.status = AgentStatus.OFFLINE;
    agent.lastLogoutAt = new Date();
    await this.agentRepository.save(agent);

    return result.affected || 0;
  }

  /**
   * Terminate specific session
   */
  async terminateSession(
    agent: Agent,
    sessionId: string,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, agentId: agent.id, status: SessionStatus.ACTIVE },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.status = SessionStatus.LOGGED_OUT;
    session.loggedOutAt = new Date();
    session.logoutReason = 'Session terminated by user';
    await this.sessionRepository.save(session);
  }

  /**
   * Check if session needs re-authentication
   */
  async checkReauthRequired(
    agentId: string,
    token: string,
  ): Promise<{ required: boolean; reason?: string }> {
    const hashedToken = this.hashToken(token);

    const session = await this.sessionRepository.findOne({
      where: { agentId, token: hashedToken },
    });

    if (!session) {
      return { required: true, reason: 'Session not found' };
    }

    if (session.status !== SessionStatus.ACTIVE) {
      return {
        required: true,
        reason: `Session ${session.status.toLowerCase()}`,
      };
    }

    if (session.expiresAt && new Date() > session.expiresAt) {
      return { required: true, reason: 'Session expired' };
    }

    // Check if session is close to expiry (within 5 minutes)
    if (session.expiresAt) {
      const fiveMinutes = 5 * 60 * 1000;
      const timeToExpiry = session.expiresAt.getTime() - new Date().getTime();
      if (timeToExpiry < fiveMinutes) {
        return {
          required: false,
          reason: 'Session expiring soon - consider refreshing',
        };
      }
    }

    return { required: false };
  }

  /**
   * Refresh session token
   */
  async refreshSession(
    agent: Agent,
    oldToken: string,
    newToken: string,
    ipAddress?: string,
  ): Promise<AgentSession> {
    const hashedOldToken = this.hashToken(oldToken);

    // Invalidate old session
    await this.sessionRepository.update(
      { agentId: agent.id, token: hashedOldToken, status: SessionStatus.ACTIVE },
      {
        status: SessionStatus.LOGGED_OUT,
        loggedOutAt: new Date(),
        logoutReason: 'Token refreshed',
      },
    );

    // Create new session
    return this.createSession(agent, newToken, ipAddress);
  }

  /**
   * Cleanup expired sessions (called by scheduler)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.update(
      {
        status: SessionStatus.ACTIVE,
        expiresAt: LessThan(new Date()),
      },
      {
        status: SessionStatus.EXPIRED,
        loggedOutAt: new Date(),
        logoutReason: 'Session expired (cleanup)',
      },
    );

    return result.affected || 0;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<any> {
    const total = await this.sessionRepository.count();
    const active = await this.sessionRepository.count({
      where: { status: SessionStatus.ACTIVE },
    });
    const expired = await this.sessionRepository.count({
      where: { status: SessionStatus.EXPIRED },
    });
    const loggedOut = await this.sessionRepository.count({
      where: { status: SessionStatus.LOGGED_OUT },
    });
    const forcedLogout = await this.sessionRepository.count({
      where: { status: SessionStatus.FORCED_LOGOUT },
    });

    return {
      total,
      active,
      expired,
      loggedOut,
      forcedLogout,
    };
  }

  /**
   * Helper: Simple hash for token storage
   */
  private hashToken(token: string): string {
    // Store last 100 chars of token for identification
    // In production, use proper hashing
    return token.length > 100 ? token.slice(-100) : token;
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
