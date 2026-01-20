import { IsOptional, IsString, IsEnum, IsArray, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConversationStatus } from '../../database/mysql/conversation.entity';

export enum SortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  UNREAD = 'unread',
  SLA = 'sla',
  PRIORITY = 'priority',
}

export class GetConversationsDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Handle query string arrays like status[]=active or status=active,pending
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value;
    }
    // If it's a comma-separated string, split it
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(v => v.trim());
    }
    // If it's a single value, wrap it in an array
    return [value];
  })
  @IsArray()
  @IsEnum(ConversationStatus, { each: true })
  status?: ConversationStatus[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(v => v.trim());
    }
    return [value];
  })
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(v => v.trim());
    }
    return [value];
  })
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
