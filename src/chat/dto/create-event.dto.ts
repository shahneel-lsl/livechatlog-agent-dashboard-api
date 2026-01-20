import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { EventType, EventAuthorType } from '../../database/mysql/event.entity';

export class CreateEventDto {
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @IsEnum(EventAuthorType)
  @IsNotEmpty()
  authorType: EventAuthorType;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
