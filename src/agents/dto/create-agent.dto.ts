import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { AgentRole, AgentStatus } from '../../database/mysql/agent.entity';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEnum(AgentRole)
  @IsOptional()
  role?: AgentRole;

  @IsEnum(AgentStatus)
  @IsOptional()
  status?: AgentStatus;

  @IsBoolean()
  @IsOptional()
  acceptingChats?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  maxConcurrentChats?: number;

  @IsString()
  @IsOptional()
  avatar?: string;
}
