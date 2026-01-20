import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { RoutingStrategy } from '../../database/mysql/group.entity';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoutingStrategy)
  @IsOptional()
  routingStrategy?: RoutingStrategy;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
