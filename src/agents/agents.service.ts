import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Agent } from '../database/mysql/agent.entity';
import { Conversation } from '../database/mysql/conversation.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  async create(createAgentDto: CreateAgentDto): Promise<Agent> {
    // Check if email already exists
    const existingAgent = await this.agentRepository.findOne({
      where: { email: createAgentDto.email },
    });

    if (existingAgent && !existingAgent.isDeleted) {
      throw new ConflictException('Agent with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createAgentDto.password, 10);

    // Create agent
    const agent = this.agentRepository.create({
      ...createAgentDto,
      password: hashedPassword,
    });

    return this.agentRepository.save(agent);
  }

  async findAll(includeDeleted = false): Promise<Agent[]> {
    const query = this.agentRepository.createQueryBuilder('agent');

    if (!includeDeleted) {
      query.where('agent.isDeleted = :isDeleted', { isDeleted: false });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['groups'],
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  async update(id: string, updateAgentDto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);

    // If updating email, check for conflicts
    if (updateAgentDto.email && updateAgentDto.email !== agent.email) {
      const existingAgent = await this.agentRepository.findOne({
        where: { email: updateAgentDto.email, isDeleted: false },
      });

      if (existingAgent) {
        throw new ConflictException('Agent with this email already exists');
      }
    }

    // If updating password, hash it
    if (updateAgentDto.password) {
      updateAgentDto.password = await bcrypt.hash(updateAgentDto.password, 10);
    }

    Object.assign(agent, updateAgentDto);
    return this.agentRepository.save(agent);
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);

    // Soft delete
    agent.isDeleted = true;
    agent.deletedAt = new Date();
    await this.agentRepository.save(agent);
  }

  async restore(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id, isDeleted: true },
      withDeleted: true,
    });

    if (!agent) {
      throw new NotFoundException(
        `Deleted agent with ID ${id} not found`,
      );
    }

    agent.isDeleted = false;
    await this.agentRepository.restore(id);
    const restoredAgent = await this.agentRepository.findOne({ where: { id } });
    if (!restoredAgent) {
      throw new NotFoundException(`Agent with ID ${id} not found after restore`);
    }
    return restoredAgent;
  }

  async getAgentStats(id: string): Promise<any> {
    const agent = await this.findOne(id);

    const activeChats = await this.agentRepository
      .createQueryBuilder('agent')
      .leftJoin('agent.conversations', 'conversation')
      .where('agent.id = :id', { id })
      .andWhere('conversation.status = :status', { status: 'active' })
      .andWhere('conversation.assignedAgentId = :id', { id })
      .getCount();

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        status: agent.status,
        role: agent.role,
      },
      stats: {
        activeChats,
        maxConcurrentChats: agent.maxConcurrentChats,
        acceptingChats: agent.acceptingChats,
        availability:
          agent.maxConcurrentChats > 0
            ? ((agent.maxConcurrentChats - activeChats) /
                agent.maxConcurrentChats) *
              100
            : 0,
      },
    };
  }

  async getConversationsByAgent(agentId: string): Promise<any> {
    // First verify the agent exists
    const agent = await this.findOne(agentId);

    // Get all conversations assigned to this agent with related data
    const conversations = await this.conversationRepository.find({
      where: { assignedAgentId: agentId },
      relations: ['visitor', 'assignedAgent', 'group', 'threads', 'tags'],
      order: {
        updatedAt: 'DESC',
      },
    });

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        status: agent.status,
      },
      totalConversations: conversations.length,
      conversations: conversations.map((conv) => ({
        id: conv.id,
        status: conv.status,
        visitor: {
          id: conv.visitor.id,
          name: conv.visitor.name,
          email: conv.visitor.email,
          phone: conv.visitor.phone,
        },
        group: conv.group
          ? {
              id: conv.group.id,
              name: conv.group.name,
            }
          : null,
        tags: conv.tags?.map((tag) => ({
          id: tag.id,
          name: tag.name,
        })) || [],
        threadsCount: conv.threads?.length || 0,
        activeThreadId: conv.activeThreadId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
    };
  }
}
