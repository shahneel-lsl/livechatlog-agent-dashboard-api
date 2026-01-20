import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { Event } from './event.entity';

export enum ThreadStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity('threads')
export class Thread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.threads, {
    nullable: false,
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @Column({
    type: 'enum',
    enum: ThreadStatus,
    default: ThreadStatus.ACTIVE,
  })
  status: ThreadStatus;

  @Column({ nullable: true })
  closedBy: string; // 'agent' | 'system' | 'visitor'

  @Column({ nullable: true })
  closedReason: string; // 'agent_assigned' | 'resolved' | 'timeout'

  @OneToMany(() => Event, (event) => event.thread, {
    cascade: true,
  })
  events: Event[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;
}
