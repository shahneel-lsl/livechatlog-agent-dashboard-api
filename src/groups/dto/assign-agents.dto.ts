import { IsArray, IsUUID } from 'class-validator';

export class AssignAgentsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  agentIds: string[];
}
