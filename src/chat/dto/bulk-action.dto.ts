import { IsArray, IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';

export enum BulkActionType {
  CLOSE = 'close',
  ASSIGN = 'assign',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
}

export class BulkActionDto {
  @IsArray()
  @IsUUID('4', { each: true })
  conversationIds: string[];

  @IsEnum(BulkActionType)
  action: BulkActionType;

  @IsOptional()
  @IsUUID('4')
  agentId?: string;

  @IsOptional()
  @IsUUID('4')
  tagId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
