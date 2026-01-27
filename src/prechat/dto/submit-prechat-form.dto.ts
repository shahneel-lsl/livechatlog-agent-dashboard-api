import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PrechatAnswerDto {
  @IsString()
  @IsNotEmpty()
  fieldId: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class SubmitPrechatFormDto {
  @IsString()
  @IsNotEmpty()
  formId: string;

  @IsString()
  @IsOptional()
  visitorId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrechatAnswerDto)
  answers: PrechatAnswerDto[];
}
