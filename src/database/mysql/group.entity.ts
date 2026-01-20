import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Agent } from './agent.entity';
import { Conversation } from './conversation.entity';

export enum RoutingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  STICKY = 'sticky',
}

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RoutingStrategy,
    default: RoutingStrategy.ROUND_ROBIN,
  })
  routingStrategy: RoutingStrategy;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToMany(() => Agent, (agent) => agent.groups)
  @JoinTable({
    name: 'agent_groups',
    joinColumn: { name: 'groupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'agentId', referencedColumnName: 'id' },
  })
  agents: Agent[];

  @OneToMany(() => Conversation, (conversation) => conversation.group)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;
}
