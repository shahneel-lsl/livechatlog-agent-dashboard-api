import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrechatForm } from '../database/mysql/prechat-form.entity';
import { PrechatFormField } from '../database/mysql/prechat-form-field.entity';
import { ConversationPrechatSnapshot } from '../database/mysql/conversation-prechat-snapshot.entity';
import { ConversationPrechatAnswer } from '../database/mysql/conversation-prechat-answer.entity';
import { Conversation, ConversationStatus } from '../database/mysql/conversation.entity';
import { Group } from '../database/mysql/group.entity';
import { CreatePrechatFormDto } from './dto/create-prechat-form.dto';
import { UpdatePrechatFormDto } from './dto/update-prechat-form.dto';
import { SubmitPrechatFormDto } from './dto/submit-prechat-form.dto';

@Injectable()
export class PrechatService {
  constructor(
    @InjectRepository(PrechatForm)
    private readonly prechatFormRepository: Repository<PrechatForm>,
    @InjectRepository(PrechatFormField)
    private readonly prechatFormFieldRepository: Repository<PrechatFormField>,
    @InjectRepository(ConversationPrechatSnapshot)
    private readonly snapshotRepository: Repository<ConversationPrechatSnapshot>,
    @InjectRepository(ConversationPrechatAnswer)
    private readonly answerRepository: Repository<ConversationPrechatAnswer>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  async createForm(createDto: CreatePrechatFormDto): Promise<PrechatForm> {
    // Verify group exists
    const group = await this.groupRepository.findOne({
      where: { id: createDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Group with ID ${createDto.groupId} not found`,
      );
    }

    // Create form with fields
    const form = this.prechatFormRepository.create({
      groupId: createDto.groupId,
      title: createDto.title,
      description: createDto.description,
      isRequired: createDto.isRequired ?? false,
      isActive: createDto.isActive ?? true,
    });

    const savedForm = await this.prechatFormRepository.save(form);

    // Create fields
    if (createDto.fields && createDto.fields.length > 0) {
      const fields = createDto.fields.map((fieldDto, index) =>
        this.prechatFormFieldRepository.create({
          formId: savedForm.id,
          label: fieldDto.label,
          type: fieldDto.type,
          isRequired: fieldDto.isRequired ?? false,
          placeholder: fieldDto.placeholder,
          options: fieldDto.options,
          order: fieldDto.order ?? index,
        }),
      );

      await this.prechatFormFieldRepository.save(fields);
    }

    return this.findOne(savedForm.id);
  }

  async findAll(): Promise<PrechatForm[]> {
    return this.prechatFormRepository.find({
      relations: ['group', 'fields'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByGroupId(groupId: string): Promise<PrechatForm | null> {
  console.log("This was the group id :: ",groupId)
    return this.prechatFormRepository.findOne({
      where: { groupId, isActive: true },
      relations: ['fields'],
      order: { fields: { order: 'ASC' } },
    });
  }

  async findOne(id: string): Promise<PrechatForm> {
    const form = await this.prechatFormRepository.findOne({
      where: { id },
      relations: ['group', 'fields'],
      order: { fields: { order: 'ASC' } },
    });

    if (!form) {
      throw new NotFoundException(`Prechat form with ID ${id} not found`);
    }

    return form;
  }

  async updateForm(
    id: string,
    updateDto: UpdatePrechatFormDto,
  ): Promise<PrechatForm> {
    const form = await this.findOne(id);

    // Update basic properties
    if (updateDto.title !== undefined) form.title = updateDto.title;
    if (updateDto.description !== undefined)
      form.description = updateDto.description;
    if (updateDto.isRequired !== undefined)
      form.isRequired = updateDto.isRequired;
    if (updateDto.isActive !== undefined) form.isActive = updateDto.isActive;

    await this.prechatFormRepository.save(form);

    // Update fields if provided
    if (updateDto.fields) {
      // Delete existing fields
      await this.prechatFormFieldRepository.delete({ formId: id });

      // Create new fields
      const fields = updateDto.fields.map((fieldDto, index) =>
        this.prechatFormFieldRepository.create({
          formId: id,
          label: fieldDto.label,
          type: fieldDto.type,
          isRequired: fieldDto.isRequired ?? false,
          placeholder: fieldDto.placeholder,
          options: fieldDto.options,
          order: fieldDto.order ?? index,
        }),
      );

      await this.prechatFormFieldRepository.save(fields);
    }

    return this.findOne(id);
  }

  async deleteForm(id: string): Promise<void> {
    const form = await this.findOne(id);
    await this.prechatFormRepository.softRemove(form);
  }

  // Widget submission
  async submitForm(
    submitDto: SubmitPrechatFormDto,
  ): Promise<ConversationPrechatSnapshot> {
    // Find form
    const form = await this.prechatFormRepository.findOne({
      where: { id: submitDto.formId, isActive: true },
      relations: ['fields', 'group'],
    });

    if (!form) {
      throw new NotFoundException(
        `Active prechat form with ID ${submitDto.formId} not found`,
      );
    }

    // Find existing conversation
    const conversation = await this.conversationRepository.findOne({
      where: { id: submitDto.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${submitDto.conversationId} not found`,
      );
    }

    // Check if conversation already has pre-chat submission
    const existingSnapshot = await this.snapshotRepository.findOne({
      where: { conversationId: submitDto.conversationId },
    });

    if (existingSnapshot) {
      throw new ConflictException(
        `Conversation ${submitDto.conversationId} already has a pre-chat submission`,
      );
    }

    // Validate required fields
    const requiredFieldIds = form.fields
      .filter((f) => f.isRequired)
      .map((f) => f.id);
    const providedFieldIds = submitDto.answers.map((a) => a.fieldId);

    const missingFields = requiredFieldIds.filter(
      (id) => !providedFieldIds.includes(id),
    );

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }

    // Create snapshot
    const fieldsSnapshot = form.fields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      isRequired: field.isRequired,
      placeholder: field.placeholder,
      options: field.options,
      order: field.order,
    }));

    const snapshot = this.snapshotRepository.create({
      conversationId: conversation.id,
      formId: form.id,
      formTitle: form.title,
      formDescription: form.description,
      fieldsSnapshot,
    });

    const savedSnapshot = await this.snapshotRepository.save(snapshot);

    // Create answers
    const answers = submitDto.answers.map((answerDto) => {
      const field = form.fields.find((f) => f.id === answerDto.fieldId);
      return this.answerRepository.create({
        snapshotId: savedSnapshot.id,
        fieldId: answerDto.fieldId,
        fieldLabel: field?.label || 'Unknown',
        value: answerDto.value,
      });
    });

    await this.answerRepository.save(answers);

    const result = await this.snapshotRepository.findOne({
      where: { id: savedSnapshot.id },
      relations: ['answers', 'conversation'],
    });

    return result!;
  }

  async getConversationPrechatData(
    conversationId: string,
  ): Promise<ConversationPrechatSnapshot | null> {
    return this.snapshotRepository.findOne({
      where: { conversationId },
      relations: ['answers'],
    });
  }

  async checkConversationHasPrechat(conversationId: string): Promise<boolean> {
    const count = await this.snapshotRepository.count({
      where: { conversationId },
    });
    return count > 0;
  }
}
