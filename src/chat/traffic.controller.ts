import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrafficService } from './services/traffic.service';

@Controller('v1/traffic')
@UseGuards(JwtAuthGuard)
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  /**
   * Get all visitors/customers with filters
   * Supports: activity, assignedAgent, country, city, etc.
   */
  @Get('visitors')
  async getVisitors(
    @Query('activity') activity?: string,
    @Query('assignedAgentId') assignedAgentId?: string,
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trafficService.getVisitors({
      activity,
      assignedAgentId,
      country,
      city,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  /**
   * Get visitor statistics by activity
   */
  @Get('stats')
  async getStats() {
    return this.trafficService.getStats();
  }
}
