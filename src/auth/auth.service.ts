import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Agent, AgentStatus } from '../database/mysql/agent.entity';
import { AgentSession, SessionStatus } from '../database/mysql/agent-session.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(AgentSession)
    private sessionRepository: Repository<AgentSession>,
    private jwtService: JwtService,
  ) {}

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    // Find agent with password field
    const agent = await this.agentRepository
      .createQueryBuilder('agent')
      .where('agent.email = :email', { email })
      .andWhere('agent.isDeleted = :isDeleted', { isDeleted: false })
      .addSelect('agent.password')
      .getOne();

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, agent.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: agent.id,
      email: agent.email,
      role: agent.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Create session record
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (agent.sessionTimeoutMinutes || 60));

    const session = this.sessionRepository.create({
      agentId: agent.id,
      token: access_token.length > 100 ? access_token.slice(-100) : access_token,
      status: SessionStatus.ACTIVE,
      ipAddress,
      userAgent,
      lastActivityAt: new Date(),
      expiresAt,
    });
    await this.sessionRepository.save(session);

    // Update agent login time and status
    agent.lastLoginAt = new Date();
    agent.lastActivityAt = new Date();
    if (agent.status === AgentStatus.OFFLINE) {
      agent.status = AgentStatus.ONLINE;
    }
    await this.agentRepository.save(agent);

    return {
      access_token,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        status: agent.status,
      },
    };
  }

  async validateAgent(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }
}
