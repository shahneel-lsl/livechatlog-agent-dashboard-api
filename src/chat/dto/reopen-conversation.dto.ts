import { IsOptional, IsString } from 'class-validator';

export class ReopenConversationDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
