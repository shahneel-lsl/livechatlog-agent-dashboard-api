import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '../../database/mysql/prechat-form-field.entity';

export class CreatePrechatFormFieldDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class CreatePrechatFormDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrechatFormFieldDto)
  fields: CreatePrechatFormFieldDto[];
}
