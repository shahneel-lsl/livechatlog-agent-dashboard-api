import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Thread } from './thread.entity';
import { Agent } from './agent.entity';

export enum EventType {
  MESSAGE = 'message',
  SYSTEM = 'system',
}

export enum EventAuthorType {
  VISITOR = 'visitor',
  AGENT = 'agent',
  SYSTEM = 'system',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Thread, (thread) => thread.events, {
    nullable: false,
  })
  @JoinColumn({ name: 'threadId' })
  thread: Thread;

  @Column()
  threadId: string;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.MESSAGE,
  })
  type: EventType;

  @Column({
    type: 'enum',
    enum: EventAuthorType,
  })
  authorType: EventAuthorType;

  @ManyToOne(() => Agent, (agent) => agent.events, {
    nullable: true,
  })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ nullable: true })
  agentId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;
}
