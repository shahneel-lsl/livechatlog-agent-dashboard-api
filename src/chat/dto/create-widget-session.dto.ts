import { IsOptional, IsString, IsObject, IsNotEmpty } from 'class-validator';

export class CreateWidgetSessionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsNotEmpty()
  initialMessage: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
