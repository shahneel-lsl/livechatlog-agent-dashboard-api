import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

export enum CannedResponseVisibility {
  SHARED = 'shared',
  PRIVATE = 'private',
}

@Entity('canned_responses')
export class CannedResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  tag: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  messages: string[];

  @Column({ nullable: true, length: 100 })
  category: string;

  @Column({
    type: 'enum',
    enum: CannedResponseVisibility,
    default: CannedResponseVisibility.SHARED,
  })
  visibility: CannedResponseVisibility;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: Agent;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;
}
