import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../database/mysql/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const existingTag = await this.tagRepository.findOne({
      where: { name: createTagDto.name },
    });

    if (existingTag && !existingTag.isDeleted) {
      throw new ConflictException('Tag with this name already exists');
    }

    const tag = this.tagRepository.create(createTagDto);
    return this.tagRepository.save(tag);
  }

  async findAll(includeDeleted = false): Promise<Tag[]> {
    const query = this.tagRepository.createQueryBuilder('tag');

    if (!includeDeleted) {
      query.where('tag.isDeleted = :isDeleted', { isDeleted: false });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);

    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const existingTag = await this.tagRepository.findOne({
        where: { name: updateTagDto.name, isDeleted: false },
      });

      if (existingTag) {
        throw new ConflictException('Tag with this name already exists');
      }
    }

    Object.assign(tag, updateTagDto);
    return this.tagRepository.save(tag);
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findOne(id);
    tag.isDeleted = true;
    tag.deletedAt = new Date();
    await this.tagRepository.save(tag);
  }
}
