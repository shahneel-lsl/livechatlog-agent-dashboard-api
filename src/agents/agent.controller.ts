import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentService } from './agent.service';

@Controller('v1/agents')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  async getAllAgents() {
    return this.agentService.getAllAgents();
  }

  @Get(':id')
  async getAgent(@Param('id') id: string) {
    return this.agentService.getAgent(id);
  }

  @Patch(':id/status')
  async updateAgentStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.agentService.updateAgentStatus(id, status);
  }
}
