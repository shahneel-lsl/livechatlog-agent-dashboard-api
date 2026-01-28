import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueueSchedulerService } from './queue-scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AgentRole } from '../database/mysql/agent.entity';

@Controller('v1/queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueSchedulerService: QueueSchedulerService) {}

  /**
   * Get real-time queue statistics
   * Available to all authenticated agents
   */
  @Get('stats')
  async getQueueStats(): Promise<any> {
    const stats = await this.queueSchedulerService.getQueueStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get list of pending conversations in queue
   * Supervisor and Admin only
   */
  @Get('conversations')
  @Roles(AgentRole.SUPERVISOR, AgentRole.ADMIN)
  async getPendingConversations() {
    const conversations = await this.queueSchedulerService.getPendingConversations();
    return {
      success: true,
      data: conversations,
      total: conversations.length,
    };
  }
}
