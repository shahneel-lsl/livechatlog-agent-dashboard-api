import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum CloseReason {
  RESOLVED = 'resolved',
  SPAM = 'spam',
  ABANDONED = 'abandoned',
  TRANSFERRED = 'transferred',
  OTHER = 'other',
}

export class CloseConversationDto {
  @IsEnum(CloseReason)
  reason: CloseReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
