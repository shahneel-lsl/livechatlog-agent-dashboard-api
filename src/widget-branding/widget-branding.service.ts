import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WidgetBranding } from '../database/mysql/widget-branding.entity';
import { Group } from '../database/mysql/group.entity';
import { CreateWidgetBrandingDto } from './dto/create-widget-branding.dto';
import { UpdateWidgetBrandingDto } from './dto/update-widget-branding.dto';

@Injectable()
export class WidgetBrandingService {
  constructor(
    @InjectRepository(WidgetBranding)
    private widgetBrandingRepository: Repository<WidgetBranding>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  async create(
    createWidgetBrandingDto: CreateWidgetBrandingDto,
  ): Promise<WidgetBranding> {
    // Check if group exists
    const group = await this.groupRepository.findOne({
      where: { id: createWidgetBrandingDto.groupId, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with ID ${createWidgetBrandingDto.groupId} not found`,
      );
    }

    // Check if branding already exists for this group
    const existingBranding = await this.widgetBrandingRepository.findOne({
      where: { groupId: createWidgetBrandingDto.groupId, isDeleted: false },
    });

    if (existingBranding) {
      throw new ConflictException(
        `Widget branding already exists for group ${createWidgetBrandingDto.groupId}`,
      );
    }

    const widgetBranding = this.widgetBrandingRepository.create(
      createWidgetBrandingDto,
    );
    return this.widgetBrandingRepository.save(widgetBranding);
  }

  async findAll(): Promise<WidgetBranding[]> {
    return this.widgetBrandingRepository.find({
      where: { isDeleted: false },
      relations: ['group'],
    });
  }

  async findOne(id: string): Promise<WidgetBranding> {
    const widgetBranding = await this.widgetBrandingRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['group'],
    });

    if (!widgetBranding) {
      throw new NotFoundException(`Widget branding with ID ${id} not found`);
    }

    return widgetBranding;
  }

  async findByGroupId(groupId: string): Promise<WidgetBranding> {
    // Check if group exists
    const group = await this.groupRepository.findOne({
      where: { id: groupId, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    const widgetBranding = await this.widgetBrandingRepository.findOne({
      where: { groupId, isDeleted: false },
      relations: ['group'],
    });

    if (!widgetBranding) {
      throw new NotFoundException(
        `Widget branding not found for group ${groupId}`,
      );
    }

    return widgetBranding;
  }

  async update(
    id: string,
    updateWidgetBrandingDto: UpdateWidgetBrandingDto,
  ): Promise<WidgetBranding> {
    const widgetBranding = await this.findOne(id);

    Object.assign(widgetBranding, updateWidgetBrandingDto);
    return this.widgetBrandingRepository.save(widgetBranding);
  }

  async updateByGroupId(
    groupId: string,
    updateWidgetBrandingDto: UpdateWidgetBrandingDto,
  ): Promise<WidgetBranding> {
    // Check if group exists
    const group = await this.groupRepository.findOne({
      where: { id: groupId, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    let widgetBranding = await this.widgetBrandingRepository.findOne({
      where: { groupId, isDeleted: false },
    });

    if (!widgetBranding) {
      // Create new branding if it doesn't exist
      const createDto: CreateWidgetBrandingDto = {
        groupId,
        ...updateWidgetBrandingDto,
      };
      return this.create(createDto);
    }

    Object.assign(widgetBranding, updateWidgetBrandingDto);
    return this.widgetBrandingRepository.save(widgetBranding);
  }

  async remove(id: string): Promise<void> {
    const widgetBranding = await this.findOne(id);
    widgetBranding.isDeleted = true;
    widgetBranding.deletedAt = new Date();
    await this.widgetBrandingRepository.save(widgetBranding);
  }

  async removeByGroupId(groupId: string): Promise<void> {
    const widgetBranding = await this.findByGroupId(groupId);
    widgetBranding.isDeleted = true;
    widgetBranding.deletedAt = new Date();
    await this.widgetBrandingRepository.save(widgetBranding);
  }

  async toggleActive(id: string): Promise<WidgetBranding> {
    const widgetBranding = await this.findOne(id);
    widgetBranding.isActive = !widgetBranding.isActive;
    return this.widgetBrandingRepository.save(widgetBranding);
  }

  async getPublicBrandingByGroupId(
    groupId: string,
  ): Promise<Partial<WidgetBranding>> {
    const widgetBranding = await this.widgetBrandingRepository.findOne({
      where: { groupId, isDeleted: false, isActive: true },
    });

    if (!widgetBranding) {
      // Return default branding settings
      return this.getDefaultBranding();
    }

    // Remove sensitive data before sending to public
    const {
      id,
      groupId: _groupId,
      createdAt,
      updatedAt,
      deletedAt,
      isDeleted,
      ...publicBranding
    } = widgetBranding;

    return publicBranding;
  }

  private getDefaultBranding(): Partial<WidgetBranding> {
    return {
      brandTitle: 'Chat with us',
      welcomeMessage: 'Welcome! How can we help you today?',
      offlineMessage: 'We are currently offline. Please leave a message.',
      primaryColor: '#0084FF',
      secondaryColor: '#FFFFFF',
      textColor: '#FFFFFF',
      headerTextColor: '#000000',
      buttonColor: '#0084FF',
      buttonTextColor: '#FFFFFF',
      backgroundColor: '#F5F5F5',
      agentBubbleColor: '#E8F4FD',
      visitorBubbleColor: '#0084FF',
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      position: 'bottom_right' as any,
      size: 'medium' as any,
      theme: 'light' as any,
      borderRadius: 8,
      borderWidth: 0,
      showAgentAvatar: true,
      showAgentName: true,
      showTypingIndicator: true,
      soundNotificationEnabled: true,
      autoOpenWidget: false,
      autoOpenDelay: 0,
      showPoweredBy: true,
      enableFileUpload: true,
      enableEmojis: true,
      requirePreChatForm: false,
      preChatFormAskName: true,
      preChatFormAskEmail: true,
      preChatFormAskPhone: false,
      showBusinessHours: false,
      language: 'en',
      timezone: 'UTC',
      enableTranscriptEmail: false,
      enableChatRating: false,
      maxAttachmentSizeMB: 10,
      showOnMobile: true,
      showOnDesktop: true,
      buttonSize: 60,
      enableAnimations: true,
      openAnimation: 'bounce',
      closeAnimation: 'fade',
      isActive: true,
    };
  }
}
