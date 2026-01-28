import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PrechatService } from './prechat.service';
import { SubmitPrechatFormDto } from './dto/submit-prechat-form.dto';

/**
 * Widget Endpoints - Public (no authentication)
 */
@Controller('v1/prechat/widget')
export class PrechatWidgetController {
  constructor(private readonly prechatService: PrechatService) {}

  @Get('groups/:groupId/form')
  async getFormByGroup(@Param('groupId') groupId: string) {
    const form = await this.prechatService.findByGroupId('cc54467c-c845-448f-8c7e-2e9adb87dabd');

    if (!form) {
      throw new NotFoundException(
        `No active prechat form found for group ${groupId}`,
      );
    }

    return form;
  }

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  async submitForm(@Body() submitDto: SubmitPrechatFormDto) {
    return this.prechatService.submitForm(submitDto);
  }

  @Get('conversations/:conversationId/prechat')
  async getConversationPrechat(@Param('conversationId') conversationId: string) {
    const data = await this.prechatService.getConversationPrechatData(conversationId);

    if (!data) {
      throw new NotFoundException(
        `No prechat data found for conversation ${conversationId}`,
      );
    }

    return data;
  }

  @Get('conversations/:conversationId/has-prechat')
  async checkHasPrechat(@Param('conversationId') conversationId: string) {
    const hasPrechat = await this.prechatService.checkConversationHasPrechat(
      conversationId,
    );

    return { conversationId, hasPrechat };
  }
}
