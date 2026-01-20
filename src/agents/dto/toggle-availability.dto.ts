import { IsBoolean } from 'class-validator';

export class ToggleAvailabilityDto {
  @IsBoolean()
  acceptingChats: boolean;
}
