import { IsArray, IsUUID } from 'class-validator';

export class AddTagsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds: string[];
}
