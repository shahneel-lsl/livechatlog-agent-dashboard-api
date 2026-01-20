import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { AgentStatusService } from './agent-status.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateAutoAwayDto } from './dto/auto-away.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';

@Controller('v1/agent-status')
@UseGuards(JwtAuthGuard)
export class AgentStatusController {
  constructor(private readonly agentStatusService: AgentStatusService) {}

  /**
   * Get current agent's status details
   * GET /v1/agent-status/me
   */
  @Get('me')
  async getMyStatus(@Request() req) {
    return this.agentStatusService.getStatusDetails(req.user);
  }

  /**
   * Update current agent's status
   * PUT /v1/agent-status/me
   */
  @Put('me')
  async updateMyStatus(
    @Request() req,
    @Body() updateStatusDto: UpdateStatusDto,
    @Ip() ip: string,
  ) {
    return this.agentStatusService.updateStatus(req.user, updateStatusDto, ip);
  }

  /**
   * Toggle online/offline status
   * POST /v1/agent-status/me/toggle-online
   */
  @Post('me/toggle-online')
  @HttpCode(HttpStatus.OK)
  async toggleOnline(@Request() req, @Ip() ip: string) {
    return this.agentStatusService.toggleOnlineStatus(req.user, ip);
  }

  /**
   * Toggle accepting chats
   * POST /v1/agent-status/me/accepting-chats
   */
  @Post('me/accepting-chats')
  @HttpCode(HttpStatus.OK)
  async toggleAcceptingChats(
    @Request() req,
    @Body() dto: ToggleAvailabilityDto,
  ) {
    return this.agentStatusService.toggleAcceptingChats(req.user, dto);
  }

  /**
   * Record activity (heartbeat to prevent auto-away)
   * POST /v1/agent-status/me/heartbeat
   */
  @Post('me/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(@Request() req) {
    await this.agentStatusService.recordActivity(
      req.user,
      req.headers.authorization?.replace('Bearer ', ''),
    );
  }

  /**
   * Update auto-away settings
   * PATCH /v1/agent-status/me/settings
   */
  @Patch('me/settings')
  async updateSettings(@Request() req, @Body() dto: UpdateAutoAwayDto) {
    return this.agentStatusService.updateAutoAwaySettings(req.user, dto);
  }

  /**
   * Get status history
   * GET /v1/agent-status/me/history
   */
  @Get('me/history')
  async getStatusHistory(@Request() req, @Query('limit') limit?: number) {
    return this.agentStatusService.getStatusHistory(req.user, limit || 50);
  }

  // ==================== Schedule Management ====================

  /**
   * Get all schedules
   * GET /v1/agent-status/me/schedules
   */
  @Get('me/schedules')
  async getSchedules(@Request() req) {
    return this.agentStatusService.getSchedules(req.user);
  }

  /**
   * Create a schedule
   * POST /v1/agent-status/me/schedules
   */
  @Post('me/schedules')
  async createSchedule(@Request() req, @Body() dto: CreateScheduleDto) {
    return this.agentStatusService.createSchedule(req.user, dto);
  }

  /**
   * Set weekly schedule (bulk create/update)
   * PUT /v1/agent-status/me/schedules
   */
  @Put('me/schedules')
  async setWeeklySchedule(@Request() req, @Body() schedules: CreateScheduleDto[]) {
    return this.agentStatusService.setWeeklySchedule(req.user, schedules);
  }

  /**
   * Update a schedule
   * PATCH /v1/agent-status/me/schedules/:scheduleId
   */
  @Patch('me/schedules/:scheduleId')
  async updateSchedule(
    @Request() req,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.agentStatusService.updateSchedule(req.user, scheduleId, dto);
  }

  /**
   * Delete a schedule
   * DELETE /v1/agent-status/me/schedules/:scheduleId
   */
  @Delete('me/schedules/:scheduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(
    @Request() req,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.agentStatusService.deleteSchedule(req.user, scheduleId);
  }

  // ==================== Admin/Supervisor Endpoints ====================

  /**
   * Get all online agents
   * GET /v1/agent-status/online
   */
  @Get('online')
  async getOnlineAgents() {
    return this.agentStatusService.getOnlineAgents();
  }

  /**
   * Get agent status summary
   * GET /v1/agent-status/summary
   */
  @Get('summary')
  async getStatusSummary() {
    return this.agentStatusService.getStatusSummary();
  }

  /**
   * Force logout an agent (admin/supervisor only)
   * POST /v1/agent-status/:agentId/force-logout
   */
  @Post(':agentId/force-logout')
  @HttpCode(HttpStatus.OK)
  async forceLogout(
    @Request() req,
    @Param('agentId') agentId: string,
    @Body('reason') reason?: string,
  ) {
    return this.agentStatusService.forceLogout(req.user, agentId, reason);
  }
}
