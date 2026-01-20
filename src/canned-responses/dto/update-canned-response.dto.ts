import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsBoolean, MaxLength, Matches, IsArray, IsEnum } from 'class-validator';
import { CreateCannedResponseDto } from './create-canned-response.dto';
import { CannedResponseVisibility } from '../../database/mysql/canned-response.entity';

export class UpdateCannedResponseDto extends PartialType(OmitType(CreateCannedResponseDto, ['createdBy'] as const)) {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/^[#\\/][a-zA-Z0-9-_]+$/, {
    message: 'Tag must start with # or / and contain only alphanumeric characters, hyphens, and underscores',
  })
  tag?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  messages?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsEnum(CannedResponseVisibility)
  @IsOptional()
  visibility?: CannedResponseVisibility;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
