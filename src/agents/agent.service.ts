import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentStatus } from '../database/mysql/agent.entity';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
  ) {}

  async getAllAgents() {
    const agents = await this.agentRepository.find({
      select: ['id', 'name', 'email', 'role', 'status'],
      order: { name: 'ASC' },
    });

    return {
      success: true,
      data: agents,
    };
  }

  async getAgent(id: string) {
    const agent = await this.agentRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'role', 'status'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return {
      success: true,
      data: agent,
    };
  }

  async updateAgentStatus(id: string, status: string) {
    const agent = await this.agentRepository.findOne({ where: { id } });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Validate status is a valid AgentStatus enum value
    if (!Object.values(AgentStatus).includes(status as AgentStatus)) {
      throw new Error('Invalid agent status');
    }

    agent.status = status as AgentStatus;
    await this.agentRepository.save(agent);

    return {
      success: true,
      message: 'Agent status updated successfully',
    };
  }
}
