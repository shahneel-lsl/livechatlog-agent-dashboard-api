import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignAgentsDto } from './dto/assign-agents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(createGroupDto);
  }

  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }

  @Post(':id/agents')
  assignAgents(
    @Param('id') id: string,
    @Body() assignAgentsDto: AssignAgentsDto,
  ) {
    return this.groupsService.assignAgents(id, assignAgentsDto);
  }

  @Delete(':id/agents/:agentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAgent(@Param('id') id: string, @Param('agentId') agentId: string) {
    return this.groupsService.removeAgent(id, agentId);
  }
}
