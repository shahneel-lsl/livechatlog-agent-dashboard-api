import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrechatService } from './prechat.service';
import { PrechatAdminController } from './prechat-admin.controller';
import { PrechatWidgetController } from './prechat-widget.controller';
import { PrechatForm } from '../database/mysql/prechat-form.entity';
import { PrechatFormField } from '../database/mysql/prechat-form-field.entity';
import { ConversationPrechatSnapshot } from '../database/mysql/conversation-prechat-snapshot.entity';
import { ConversationPrechatAnswer } from '../database/mysql/conversation-prechat-answer.entity';
import { Conversation } from '../database/mysql/conversation.entity';
import { Group } from '../database/mysql/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrechatForm,
      PrechatFormField,
      ConversationPrechatSnapshot,
      ConversationPrechatAnswer,
      Conversation,
      Group,
    ]),
  ],
  controllers: [PrechatAdminController, PrechatWidgetController],
  providers: [PrechatService],
  exports: [PrechatService],
})
export class PrechatModule {}
