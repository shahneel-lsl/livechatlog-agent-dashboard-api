import { PartialType } from '@nestjs/mapped-types';
import { CreatePrechatFormDto } from './create-prechat-form.dto';

export class UpdatePrechatFormDto extends PartialType(CreatePrechatFormDto) {}
