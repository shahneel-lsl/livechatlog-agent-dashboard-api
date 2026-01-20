import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
