import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class UpdateTypingDto {
  @IsBoolean()
  isTyping: boolean;

  @IsString()
  @IsOptional()
  preview?: string;
}
