import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

export enum MessageStatus {
  DELIVERED = 'delivered',
  READ = 'read',
}

export class UpdateMessageStatusDto {
  @IsEnum(MessageStatus)
  status: MessageStatus;
}

export class BulkUpdateMessageStatusDto {
  @IsArray()
  @IsString({ each: true })
  messageIds: string[];

  @IsEnum(MessageStatus)
  status: MessageStatus;
}
