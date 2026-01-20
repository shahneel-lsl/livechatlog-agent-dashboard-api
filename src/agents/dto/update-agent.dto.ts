import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateAgentDto } from './create-agent.dto';
import { AgentStatus } from '../../database/mysql/agent.entity';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @IsEnum(AgentStatus)
  @IsOptional()
  status?: AgentStatus;
}
