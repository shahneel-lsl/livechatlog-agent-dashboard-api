import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from './agent.entity';
import { AgentStatus } from './agent.entity';

export enum StatusChangeReason {
  MANUAL = 'manual',
  AUTO_AWAY = 'auto_away',
  SCHEDULE = 'schedule',
  OVERLOAD = 'overload',
  SESSION_TIMEOUT = 'session_timeout',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SYSTEM = 'system',
}

@Entity('agent_status_logs')
@Index(['agentId', 'createdAt'])
export class AgentStatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({
    type: 'enum',
    enum: AgentStatus,
  })
  previousStatus: AgentStatus;

  @Column({
    type: 'enum',
    enum: AgentStatus,
  })
  newStatus: AgentStatus;

  @Column({
    type: 'enum',
    enum: StatusChangeReason,
    default: StatusChangeReason.MANUAL,
  })
  reason: StatusChangeReason;

  @Column({ nullable: true, length: 500 })
  details: string;

  @Column({ nullable: true, length: 45 })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
