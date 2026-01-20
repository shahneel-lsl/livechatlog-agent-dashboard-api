import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CannedResponse, CannedResponseVisibility } from '../database/mysql/canned-response.entity';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { UpdateCannedResponseDto } from './dto/update-canned-response.dto';

@Injectable()
export class CannedResponsesService {
  constructor(
    @InjectRepository(CannedResponse)
    private cannedResponseRepository: Repository<CannedResponse>,
  ) {}

  async create(createCannedResponseDto: CreateCannedResponseDto): Promise<CannedResponse> {
    // Check if tag already exists (excluding soft-deleted)
    const existingResponse = await this.cannedResponseRepository.findOne({
      where: { tag: createCannedResponseDto.tag },
      withDeleted: false,
      relations: ['creator'],
    });

    if (existingResponse && !existingResponse.isDeleted) {
      // Tag exists - add new message to existing messages array
      const existingMessages = existingResponse.messages || [];
      
      // Add the new message if it doesn't already exist
      if (createCannedResponseDto.message && !existingMessages.includes(createCannedResponseDto.message)) {
        existingMessages.push(createCannedResponseDto.message);
        existingResponse.messages = existingMessages;
        existingResponse.message = createCannedResponseDto.message; // Update latest message
      }
      
      return this.cannedResponseRepository.save(existingResponse);
    }

    // Tag doesn't exist - create new canned response with message in array
    const cannedResponse = this.cannedResponseRepository.create({
      ...createCannedResponseDto,
      messages: [createCannedResponseDto.message], // Initialize messages array with first message
    });
    return this.cannedResponseRepository.save(cannedResponse);
  }

  async findAll(
    search?: string,
    isActive?: boolean,
    category?: string,
    visibility?: CannedResponseVisibility,
    agentId?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: CannedResponse[]; total: number; page: number; limit: number }> {
    const query = this.cannedResponseRepository.createQueryBuilder('cannedResponse')
      .leftJoinAndSelect('cannedResponse.creator', 'creator')
      .where('cannedResponse.isDeleted = :isDeleted', { isDeleted: false });

    // Filter by visibility and agent access
    if (visibility) {
      query.andWhere('cannedResponse.visibility = :visibility', { visibility });
    }

    // If agentId provided, show shared responses + agent's private responses
    if (agentId) {
      query.andWhere(
        '(cannedResponse.visibility = :shared OR (cannedResponse.visibility = :private AND cannedResponse.createdBy = :agentId))',
        { 
          shared: CannedResponseVisibility.SHARED, 
          private: CannedResponseVisibility.PRIVATE,
          agentId 
        }
      );
    }

    // Search by tag or title
    if (search) {
      query.andWhere(
        '(cannedResponse.tag LIKE :search OR cannedResponse.title LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.andWhere('cannedResponse.isActive = :isActive', { isActive });
    }

    // Filter by category
    if (category) {
      query.andWhere('cannedResponse.category = :category', { category });
    }

    // Pagination
    query.skip((page - 1) * limit).take(limit);

    // Order by most recently created
    query.orderBy('cannedResponse.createdAt', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<CannedResponse> {
    const cannedResponse = await this.cannedResponseRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['creator'],
    });

    if (!cannedResponse) {
      throw new NotFoundException(`Canned response with ID ${id} not found`);
    }

    return cannedResponse;
  }

  async findByTag(tag: string): Promise<CannedResponse> {
    // Normalize the tag (ensure it starts with # or /)
    const normalizedTag = tag.startsWith('#') || tag.startsWith('/') ? tag : `#${tag}`;

    const cannedResponse = await this.cannedResponseRepository.findOne({
      where: { 
        tag: normalizedTag, 
        isDeleted: false,
        isActive: true, // Only return active responses for autocomplete
      },
      relations: ['creator'],
    });

    if (!cannedResponse) {
      throw new NotFoundException(`Canned response with tag '${normalizedTag}' not found`);
    }

    return cannedResponse;
  }

  async update(id: string, updateCannedResponseDto: UpdateCannedResponseDto): Promise<CannedResponse> {
    const cannedResponse = await this.findOne(id);

    // Check if tag is being updated and if it already exists
    if (updateCannedResponseDto.tag && updateCannedResponseDto.tag !== cannedResponse.tag) {
      const existingResponse = await this.cannedResponseRepository.findOne({
        where: { tag: updateCannedResponseDto.tag, isDeleted: false },
      });

      if (existingResponse) {
        throw new ConflictException(`Canned response with tag '${updateCannedResponseDto.tag}' already exists`);
      }
    }

    Object.assign(cannedResponse, updateCannedResponseDto);
    return this.cannedResponseRepository.save(cannedResponse);
  }

  async remove(id: string): Promise<void> {
    const cannedResponse = await this.findOne(id);
    
    // Soft delete
    cannedResponse.isDeleted = true;
    cannedResponse.deletedAt = new Date();
    await this.cannedResponseRepository.save(cannedResponse);
  }

  async getCategories(): Promise<string[]> {
    const results = await this.cannedResponseRepository
      .createQueryBuilder('cannedResponse')
      .select('DISTINCT cannedResponse.category', 'category')
      .where('cannedResponse.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('cannedResponse.category IS NOT NULL')
      .getRawMany();

    return results.map(r => r.category).filter(c => c);
  }
}
