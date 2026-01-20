import { IsUUID } from 'class-validator';

export class RemoveTagDto {
  @IsUUID('4')
  tagId: string;
}
