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
  Put,
} from '@nestjs/common';
import { WidgetBrandingService } from './widget-branding.service';
import { CreateWidgetBrandingDto } from './dto/create-widget-branding.dto';
import { UpdateWidgetBrandingDto } from './dto/update-widget-branding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1/widget-branding')
export class WidgetBrandingController {
  constructor(
    private readonly widgetBrandingService: WidgetBrandingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createWidgetBrandingDto: CreateWidgetBrandingDto) {
    return this.widgetBrandingService.create(createWidgetBrandingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.widgetBrandingService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.widgetBrandingService.findOne(id);
  }

  @Get('group/:groupId')
  findByGroupId(@Param('groupId') groupId: string) {
    return this.widgetBrandingService.findByGroupId(groupId);
  }

  @Get('public/group/:groupId')
  getPublicBrandingByGroupId(@Param('groupId') groupId: string) {
    return this.widgetBrandingService.getPublicBrandingByGroupId(groupId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateWidgetBrandingDto: UpdateWidgetBrandingDto,
  ) {
    return this.widgetBrandingService.update(id, updateWidgetBrandingDto);
  }

  @Put('group/:groupId')
  @UseGuards(JwtAuthGuard)
  updateByGroupId(
    @Param('groupId') groupId: string,
    @Body() updateWidgetBrandingDto: UpdateWidgetBrandingDto,
  ) {
    return this.widgetBrandingService.updateByGroupId(
      groupId,
      updateWidgetBrandingDto,
    );
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard)
  toggleActive(@Param('id') id: string) {
    return this.widgetBrandingService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.widgetBrandingService.remove(id);
  }

  @Delete('group/:groupId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeByGroupId(@Param('groupId') groupId: string) {
    return this.widgetBrandingService.removeByGroupId(groupId);
  }
}
