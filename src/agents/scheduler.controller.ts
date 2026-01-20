import {
  Controller,
  Post,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AgentSchedulerService } from './agent-scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/admin/scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: AgentSchedulerService) {}

  private checkAdmin(req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  /**
   * Manually trigger auto-away check
   * POST /v1/admin/scheduler/trigger-auto-away
   */
  @Post('trigger-auto-away')
  async triggerAutoAway(@Request() req) {
    this.checkAdmin(req);
    return this.schedulerService.triggerAutoAway();
  }

  /**
   * Manually trigger session timeout check
   * POST /v1/admin/scheduler/trigger-session-timeout
   */
  @Post('trigger-session-timeout')
  async triggerSessionTimeout(@Request() req) {
    this.checkAdmin(req);
    return this.schedulerService.triggerSessionTimeout();
  }

  /**
   * Manually trigger schedule check
   * POST /v1/admin/scheduler/trigger-schedule-check
   */
  @Post('trigger-schedule-check')
  async triggerScheduleCheck(@Request() req) {
    this.checkAdmin(req);
    return this.schedulerService.triggerScheduleCheck();
  }

  /**
   * Manually trigger overload check
   * POST /v1/admin/scheduler/trigger-overload-check
   */
  @Post('trigger-overload-check')
  async triggerOverloadCheck(@Request() req) {
    this.checkAdmin(req);
    return this.schedulerService.triggerOverloadCheck();
  }
}
