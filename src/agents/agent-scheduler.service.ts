import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentStatusService } from './agent-status.service';
import { SessionService } from './session.service';

@Injectable()
export class AgentSchedulerService {
  private readonly logger = new Logger(AgentSchedulerService.name);

  constructor(
    private readonly agentStatusService: AgentStatusService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Check for auto-away every minute
   * Switches agents to "away" after inactivity
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoAway() {
    this.logger.debug('Running auto-away check...');
    try {
      const result = await this.agentStatusService.processAutoAway();
      if (result.awayCount > 0) {
        this.logger.log(
          `Auto-away: ${result.awayCount} agents switched to away`,
        );
      }
    } catch (error) {
      this.logger.error('Auto-away check failed:', error);
    }
  }

  /**
   * Check for session timeouts every 5 minutes
   * Logs out inactive users automatically
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSessionTimeouts() {
    this.logger.debug('Running session timeout check...');
    try {
      const result = await this.agentStatusService.processSessionTimeouts();
      if (result.timedOut > 0) {
        this.logger.log(
          `Session timeout: ${result.timedOut} agents logged out`,
        );
      }
    } catch (error) {
      this.logger.error('Session timeout check failed:', error);
    }
  }

  /**
   * Check schedule-based availability every minute
   * Syncs agent status with business hour automation
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduleAvailability() {
    this.logger.debug('Running schedule availability check...');
    try {
      const result = await this.agentStatusService.processScheduleAvailability();
      if (result.updated > 0) {
        this.logger.log(
          `Schedule: ${result.updated} agents status updated based on schedule`,
        );
      }
    } catch (error) {
      this.logger.error('Schedule availability check failed:', error);
    }
  }

  /**
   * Check for overloaded agents every 30 seconds
   * Switches to "busy" when at max capacity
   */
  @Cron('*/30 * * * * *')
  async handleOverloadCheck() {
    this.logger.debug('Running overload check...');
    try {
      const result = await this.agentStatusService.processOverloadCheck();
      if (result.busy > 0) {
        this.logger.log(
          `Overload: ${result.busy} agents switched to busy`,
        );
      }
    } catch (error) {
      this.logger.error('Overload check failed:', error);
    }
  }

  /**
   * Cleanup expired sessions every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleSessionCleanup() {
    this.logger.debug('Running session cleanup...');
    try {
      const count = await this.sessionService.cleanupExpiredSessions();
      if (count > 0) {
        this.logger.log(`Session cleanup: ${count} expired sessions cleaned`);
      }
    } catch (error) {
      this.logger.error('Session cleanup failed:', error);
    }
  }

  /**
   * Manual trigger for auto-away (for testing)
   */
  async triggerAutoAway(): Promise<any> {
    return this.agentStatusService.processAutoAway();
  }

  /**
   * Manual trigger for session timeout (for testing)
   */
  async triggerSessionTimeout(): Promise<any> {
    return this.agentStatusService.processSessionTimeouts();
  }

  /**
   * Manual trigger for schedule check (for testing)
   */
  async triggerScheduleCheck(): Promise<any> {
    return this.agentStatusService.processScheduleAvailability();
  }

  /**
   * Manual trigger for overload check (for testing)
   */
  async triggerOverloadCheck(): Promise<any> {
    return this.agentStatusService.processOverloadCheck();
  }
}
