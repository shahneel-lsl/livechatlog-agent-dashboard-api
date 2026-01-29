import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueSchedulerService } from './queue-scheduler.service';
import { QueueController } from './queue.controller';
import { Agent } from '../database/mysql/agent.entity';
import { Group } from '../database/mysql/group.entity';
import { Conversation } from '../database/mysql/conversation.entity';
import { ChatModule } from '../chat/chat.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Group, Conversation]),
    ChatModule,
    FirebaseModule,
  ],
  controllers: [QueueController],
  providers: [QueueSchedulerService],
  exports: [QueueSchedulerService],
})
export class QueueModule {}
