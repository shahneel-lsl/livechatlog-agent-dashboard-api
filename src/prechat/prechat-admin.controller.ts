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
  NotFoundException,
} from '@nestjs/common';
import { PrechatService } from './prechat.service';
import { CreatePrechatFormDto } from './dto/create-prechat-form.dto';
import { UpdatePrechatFormDto } from './dto/update-prechat-form.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Agent Dashboard Endpoints - Protected by JWT Auth
 */
@Controller('v1/prechat/admin')
@UseGuards(JwtAuthGuard)
export class PrechatAdminController {
  constructor(private readonly prechatService: PrechatService) {}

  @Post('forms')
  async createForm(@Body() createDto: CreatePrechatFormDto) {
    return this.prechatService.createForm(createDto);
  }

  @Get('forms')
  async getAllForms() {
    return this.prechatService.findAll();
  }

  @Get('forms/:id')
  async getForm(@Param('id') id: string) {
    return this.prechatService.findOne(id);
  }

  @Patch('forms/:id')
  async updateForm(
    @Param('id') id: string,
    @Body() updateDto: UpdatePrechatFormDto,
  ) {
    return this.prechatService.updateForm(id, updateDto);
  }

  @Delete('forms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteForm(@Param('id') id: string) {
    await this.prechatService.deleteForm(id);
  }

  @Get('conversations/:conversationId/prechat')
  async getConversationPrechatData(@Param('conversationId') conversationId: string) {
    const data = await this.prechatService.getConversationPrechatData(conversationId);
    
    if (!data) {
      throw new NotFoundException(
        `No prechat data found for conversation ${conversationId}`,
      );
    }

    return data;
  }
}
