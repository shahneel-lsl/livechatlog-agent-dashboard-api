import {
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class UpdateAutoAwayDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(120)
  autoAwayMinutes?: number;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(480)
  sessionTimeoutMinutes?: number;

  @IsBoolean()
  @IsOptional()
  scheduleEnabled?: boolean;
}
