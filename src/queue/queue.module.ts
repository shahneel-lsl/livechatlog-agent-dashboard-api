import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentQueueService } from './assignment-queue.service';
import { Agent } from '../database/mysql/agent.entity';
import { Group } from '../database/mysql/group.entity';
import { Conversation } from '../database/mysql/conversation.entity';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Group, Conversation]),
    ChatModule,
  ],
  providers: [AssignmentQueueService],
  exports: [AssignmentQueueService],
})
export class QueueModule {}
