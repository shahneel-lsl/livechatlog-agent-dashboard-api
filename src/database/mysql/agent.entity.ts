import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { Group } from './group.entity';
import { Conversation } from './conversation.entity';
import { Event } from './event.entity';

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
  AVAILABLE = 'available',
}

export enum AgentRole {
  AGENT = 'agent',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: AgentRole,
    default: AgentRole.AGENT,
  })
  role: AgentRole;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.OFFLINE,
  })
  status: AgentStatus;

  @Column({ default: true })
  acceptingChats: boolean;

  @Column({ default: 5 })
  maxConcurrentChats: number;

  @Column({ nullable: true, length: 500 })
  avatar: string;

  @Column({ nullable: true })
  lastActivityAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLogoutAt: Date;

  @Column({ default: 15 })
  autoAwayMinutes: number;

  @Column({ default: 60 })
  sessionTimeoutMinutes: number;

  @Column({ default: false })
  scheduleEnabled: boolean;

  @ManyToMany(() => Group, (group) => group.agents)
  groups: Group[];

  @OneToMany(() => Conversation, (conversation) => conversation.assignedAgent)
  conversations: Conversation[];

  @OneToMany(() => Event, (event) => event.agent)
  events: Event[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;
}
