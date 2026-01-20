import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateWidgetBrandingDto } from './create-widget-branding.dto';

export class UpdateWidgetBrandingDto extends PartialType(
  OmitType(CreateWidgetBrandingDto, ['groupId'] as const),
) {}
