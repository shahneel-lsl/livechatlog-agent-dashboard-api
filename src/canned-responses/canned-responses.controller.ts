import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CannedResponsesService } from './canned-responses.service';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { UpdateCannedResponseDto } from './dto/update-canned-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/canned-responses')
@UseGuards(JwtAuthGuard)
export class CannedResponsesController {
  constructor(private readonly cannedResponsesService: CannedResponsesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCannedResponseDto: CreateCannedResponseDto) {
    return this.cannedResponsesService.create(createCannedResponseDto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('category') category?: string,
    @Query('visibility') visibility?: string,
    @Query('agentId') agentId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    // Convert isActive string to boolean if provided
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    
    return this.cannedResponsesService.findAll(search, isActiveBoolean, category, visibility as any, agentId, page, limit);
  }

  @Get('categories')
  getCategories() {
    return this.cannedResponsesService.getCategories();
  }

  @Get('by-tag/:tag')
  findByTag(@Param('tag') tag: string) {
    return this.cannedResponsesService.findByTag(tag);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cannedResponsesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCannedResponseDto: UpdateCannedResponseDto) {
    return this.cannedResponsesService.update(id, updateCannedResponseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.cannedResponsesService.remove(id);
  }
}
