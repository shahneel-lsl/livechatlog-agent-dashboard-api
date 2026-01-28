import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AgentRole } from '../database/mysql/agent.entity';
import { SupervisorService, SupervisorAction } from './services/supervisor.service';

@Controller('v1/supervisor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AgentRole.SUPERVISOR, AgentRole.ADMIN)
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  /**
   * Get list of active conversations for monitoring
   */
  @Get('conversations/active')
  async getActiveConversations() {
    const conversations = await this.supervisorService.getActiveConversations();
    return {
      success: true,
      data: conversations,
      total: conversations.length,
    };
  }

  /**
   * Start monitoring a specific conversation (silent)
   */
  @Post('conversations/:conversationId/monitor')
  @HttpCode(HttpStatus.OK)
  async startMonitoring(
    @Param('conversationId') conversationId: string,
    @Request() req,
  ) {
    await this.supervisorService.startMonitoring(conversationId, req.user.id);
    return {
      success: true,
      message: 'Monitoring started',
    };
  }

  /**
   * Stop monitoring a conversation
   */
  @Post('conversations/:conversationId/unmonitor')
  @HttpCode(HttpStatus.OK)
  async stopMonitoring(
    @Param('conversationId') conversationId: string,
    @Request() req,
  ) {
    await this.supervisorService.stopMonitoring(conversationId, req.user.id);
    return {
      success: true,
      message: 'Monitoring stopped',
    };
  }

  /**
   * Takeover a conversation from an agent
   */
  @Post('conversations/:conversationId/takeover')
  async takeoverConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    const result = await this.supervisorService.takeoverConversation(
      conversationId,
      req.user.id,
      body.reason,
    );
    return result;
  }

  /**
   * Get agent availability overview
   */
  @Get('agents/availability')
  async getAgentAvailability() {
    const availability = await this.supervisorService.getAgentAvailability();
    return {
      success: true,
      data: availability,
    };
  }

  /**
   * Get agent workload overview
   */
  @Get('agents/workload')
  async getAgentWorkload() {
    const workload = await this.supervisorService.getAgentWorkload();
    return {
      success: true,
      data: workload,
    };
  }

  /**
   * Get supervisor audit log
   */
  @Get('audit-log')
  async getAuditLog(): Promise<{ success: boolean; data: SupervisorAction[]; total: number }> {
    const logs = await this.supervisorService.getAuditLog();
    return {
      success: true,
      data: logs,
      total: logs.length,
    };
  }
}
