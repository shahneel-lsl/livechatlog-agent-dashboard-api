import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Group } from '../database/mysql/group.entity';
import { Agent } from '../database/mysql/agent.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignAgentsDto } from './dto/assign-agents.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const existingGroup = await this.groupRepository.findOne({
      where: { name: createGroupDto.name },
    });

    if (existingGroup && !existingGroup.isDeleted) {
      throw new ConflictException('Group with this name already exists');
    }

    const group = this.groupRepository.create(createGroupDto);
    return this.groupRepository.save(group);
  }

  async findAll(includeDeleted = false): Promise<Group[]> {
    const query = this.groupRepository.createQueryBuilder('group');

    if (!includeDeleted) {
      query.where('group.isDeleted = :isDeleted', { isDeleted: false });
    }

    query.leftJoinAndSelect('group.agents', 'agent');

    return query.getMany();
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['agents'],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.findOne(id);

    if (updateGroupDto.name && updateGroupDto.name !== group.name) {
      const existingGroup = await this.groupRepository.findOne({
        where: { name: updateGroupDto.name, isDeleted: false },
      });

      if (existingGroup) {
        throw new ConflictException('Group with this name already exists');
      }
    }

    Object.assign(group, updateGroupDto);
    return this.groupRepository.save(group);
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);
    group.isDeleted = true;
    group.deletedAt = new Date();
    await this.groupRepository.save(group);
  }

  async assignAgents(
    id: string,
    assignAgentsDto: AssignAgentsDto,
  ): Promise<Group> {
    const group = await this.findOne(id);

    // Find all agents that are not deleted
    const agents = await this.agentRepository.find({
      where: {
        id: In(assignAgentsDto.agentIds),
        isDeleted: false,
      },
    });

    if (agents.length !== assignAgentsDto.agentIds.length) {
      throw new BadRequestException(
        'One or more agents not found or deleted',
      );
    }

    group.agents = agents;
    return this.groupRepository.save(group);
  }

  async removeAgent(id: string, agentId: string): Promise<Group> {
    const group = await this.findOne(id);
    group.agents = group.agents.filter((agent) => agent.id !== agentId);
    return this.groupRepository.save(group);
  }
}
