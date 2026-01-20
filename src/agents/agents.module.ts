import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentStatusController } from './agent-status.controller';
import { AgentStatusService } from './agent-status.service';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SchedulerController } from './scheduler.controller';
import { AgentSchedulerService } from './agent-scheduler.service';
import { Agent } from '../database/mysql/agent.entity';
import { AgentSession } from '../database/mysql/agent-session.entity';
import { AgentSchedule } from '../database/mysql/agent-schedule.entity';
import { AgentStatusLog } from '../database/mysql/agent-status-log.entity';
import { Conversation } from '../database/mysql/conversation.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      AgentSession,
      AgentSchedule,
      AgentStatusLog,
      Conversation,
    ]),
    AuthModule,
  ],
  controllers: [
    AgentsController,
    AgentStatusController,
    SessionController,
    SchedulerController,
  ],
  providers: [
    AgentsService,
    AgentStatusService,
    SessionService,
    AgentSchedulerService,
  ],
  exports: [AgentsService, AgentStatusService, SessionService],
})
export class AgentsModule {}
