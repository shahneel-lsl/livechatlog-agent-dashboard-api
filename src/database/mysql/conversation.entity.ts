import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { Visitor } from './visitor.entity';
import { Agent } from './agent.entity';
import { Group } from './group.entity';
import { Thread } from './thread.entity';
import { Tag } from './tag.entity';

export enum ConversationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Visitor, (visitor) => visitor.conversations, {
    nullable: false,
  })
  @JoinColumn({ name: 'visitorId' })
  visitor: Visitor;

  @Column()
  visitorId: string;

  @ManyToOne(() => Agent, (agent) => agent.conversations, {
    nullable: true,
  })
  @JoinColumn({ name: 'assignedAgentId' })
  assignedAgent: Agent;

  @Column({ nullable: true })
  assignedAgentId: string;

  @ManyToOne(() => Group, (group) => group.conversations, {
    nullable: true,
  })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ nullable: true })
  groupId: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.PENDING,
  })
  status: ConversationStatus;

  @OneToMany(() => Thread, (thread) => thread.conversation, {
    cascade: true,
  })
  threads: Thread[];

  @ManyToMany(() => Tag, (tag) => tag.conversations)
  @JoinTable({
    name: 'conversation_tags',
    joinColumn: { name: 'conversationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @Column({ nullable: true })
  activeThreadId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
