import { IsString, IsOptional, IsIn } from 'class-validator';

export class SendMediaMessageDto {
  @IsString()
  @IsOptional()
  content?: string; // Optional text caption for the media

  @IsString()
  @IsIn(['conversation', 'thread'])
  targetType: 'conversation' | 'thread';

  @IsString()
  targetId: string; // conversationId or threadId
}
