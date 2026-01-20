import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignConversationDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
