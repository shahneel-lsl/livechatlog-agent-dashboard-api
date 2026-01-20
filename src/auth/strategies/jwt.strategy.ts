import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../../database/mysql/agent.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'livechat-secret-key-2024',
    });
  }

  async validate(payload: JwtPayload): Promise<Agent> {
    const agent = await this.agentRepository.findOne({
      where: { id: payload.sub, isDeleted: false },
    });

    if (!agent) {
      throw new UnauthorizedException('Invalid token or agent not found');
    }

    return agent;
  }
}
