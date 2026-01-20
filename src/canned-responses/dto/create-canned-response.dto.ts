import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, Matches, IsArray, IsEnum } from 'class-validator';
import { CannedResponseVisibility } from '../../database/mysql/canned-response.entity';

export class CreateCannedResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[#\/][a-zA-Z0-9-_]+$/, {
    message: 'Tag must start with # or / and contain only alphanumeric characters, hyphens, and underscores',
  })
  tag: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

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

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
