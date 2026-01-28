import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { SupervisorController } from './supervisor.controller';
import { ChatService } from './chat.service';
import { AgentAssignmentService } from './services/agent-assignment.service';
import { ConversationManagementService } from './services/conversation-management.service';
import { ChatMediaService } from './services/chat-media.service';
import { SupervisorService } from './services/supervisor.service';
import { Visitor } from '../database/mysql/visitor.entity';
import { Conversation } from '../database/mysql/conversation.entity';
import { Thread } from '../database/mysql/thread.entity';
import { Event } from '../database/mysql/event.entity';
import { Agent } from '../database/mysql/agent.entity';
import { Group } from '../database/mysql/group.entity';
import { Tag } from '../database/mysql/tag.entity';
import { AssignmentLog } from '../database/mysql/assignment-log.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Visitor,
      Conversation,
      Thread,
      Event,
      Agent,
      Group,
      Tag,
      AssignmentLog,
    ]),
    AuthModule,
  ],
  controllers: [ChatController, SupervisorController],
  providers: [
    ChatService,
    AgentAssignmentService,
    ConversationManagementService,
    ChatMediaService,
    SupervisorService,
  ],
  exports: [
    ChatService,
    AgentAssignmentService,
    ConversationManagementService,
    ChatMediaService,
    SupervisorService,
  ],
})
export class ChatModule {}
