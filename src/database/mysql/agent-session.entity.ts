import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from './agent.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  LOGGED_OUT = 'logged_out',
  FORCED_LOGOUT = 'forced_logout',
}

@Entity('agent_sessions')
@Index(['agentId', 'status'])
export class AgentSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ length: 500 })
  token: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @Column({ nullable: true, length: 45 })
  ipAddress: string;

  @Column({ nullable: true, length: 500 })
  userAgent: string;

  @Column({ nullable: true })
  lastActivityAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  loggedOutAt: Date;

  @Column({ nullable: true, length: 255 })
  logoutReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
