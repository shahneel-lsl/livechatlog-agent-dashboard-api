import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Get all active sessions for current agent
   * GET /v1/sessions
   */
  @Get()
  async getActiveSessions(@Request() req) {
    return this.sessionService.getActiveSessions(req.user.id);
  }

  /**
   * Check if re-authentication is required
   * GET /v1/sessions/check-auth
   */
  @Get('check-auth')
  async checkReauth(@Request() req, @Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    return this.sessionService.checkReauthRequired(req.user.id, token);
  }

  /**
   * Get session statistics (admin)
   * GET /v1/sessions/stats
   */
  @Get('stats')
  async getSessionStats() {
    return this.sessionService.getSessionStats();
  }

  /**
   * Logout from current session
   * POST /v1/sessions/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Request() req,
    @Headers('authorization') auth: string,
    @Body('reason') reason?: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    await this.sessionService.logout(req.user, token, reason);
  }

  /**
   * Logout from all sessions
   * POST /v1/sessions/logout-all
   */
  @Post('logout-all')
  async logoutAll(@Request() req, @Body('reason') reason?: string) {
    const count = await this.sessionService.logoutAll(req.user, reason);
    return { message: `Logged out from ${count} sessions`, count };
  }

  /**
   * Terminate a specific session
   * DELETE /v1/sessions/:sessionId
   */
  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async terminateSession(
    @Request() req,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.terminateSession(req.user, sessionId);
  }
}
