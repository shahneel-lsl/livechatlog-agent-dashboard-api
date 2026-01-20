import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AssignmentLogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

export enum AssignmentLogType {
  ASSIGNMENT_STARTED = 'assignment_started',
  NO_GROUP_FOUND = 'no_group_found',
  NO_AGENTS_IN_GROUP = 'no_agents_in_group',
  NO_ONLINE_AGENTS = 'no_online_agents',
  NO_ACCEPTING_AGENTS = 'no_accepting_agents',
  ALL_AGENTS_AT_CAPACITY = 'all_agents_at_capacity',
  AGENT_SELECTED = 'agent_selected',
  ASSIGNMENT_SUCCESS = 'assignment_success',
  ASSIGNMENT_FAILED = 'assignment_failed',
}

@Entity('assignment_logs')
@Index(['conversationId'])
@Index(['visitorId'])
@Index(['groupId'])
@Index(['agentId'])
@Index(['createdAt'])
@Index(['level'])
export class AssignmentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column()
  visitorId: string;

  @Column({ nullable: true })
  groupId: string;

  @Column({ nullable: true })
  groupName: string;

  @Column({ nullable: true })
  agentId: string;

  @Column({ nullable: true })
  agentName: string;

  @Column({
    type: 'enum',
    enum: AssignmentLogType,
  })
  type: AssignmentLogType;

  @Column({
    type: 'enum',
    enum: AssignmentLogLevel,
    default: AssignmentLogLevel.INFO,
  })
  level: AssignmentLogLevel;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    attemptNumber?: number;
    availableAgents?: number;
    onlineAgents?: number;
    acceptingAgents?: number;
    routingStrategy?: string;
    agentActiveChats?: number;
    agentMaxChats?: number;
    errorDetails?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;
}
