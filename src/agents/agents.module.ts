import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentStatusController } from './agent-status.controller';
import { AgentStatusService } from './agent-status.service';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SchedulerController } from './scheduler.controller';
// import { AgentSchedulerService } from './agent-scheduler.service'; // DISABLED: Auto-away cron job commented out
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
    AgentController,
    AgentStatusController,
    SessionController,
    // SchedulerController, // DISABLED: Auto-away cron job commented out
  ],
  providers: [
    AgentsService,
    AgentService,
    AgentStatusService,
    SessionService,
    // AgentSchedulerService, // DISABLED: Auto-away cron job commented out
  ],
  exports: [AgentsService, AgentService, AgentStatusService, SessionService],
})
export class AgentsModule {}
