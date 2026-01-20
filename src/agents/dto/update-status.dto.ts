import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AgentStatus } from '../../database/mysql/agent.entity';

export class UpdateStatusDto {
  @IsEnum(AgentStatus)
  status: AgentStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
