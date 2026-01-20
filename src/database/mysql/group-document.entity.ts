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
import { Group } from './group.entity';
import { Agent } from './agent.entity';

@Entity('group_documents')
export class GroupDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, { nullable: false })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column()
  groupId: string;

  @Column({ length: 255 })
  fileName: string;

  @Column({ length: 255 })
  originalFileName: string;

  @Column({ type: 'text' })
  fileUrl: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ length: 500, nullable: true })
  storagePath: string;

  @Column({ length: 255, nullable: true })
  storageBucket: string;

  @ManyToOne(() => Agent, { nullable: true })
  @JoinColumn({ name: 'uploadedBy' })
  uploader: Agent;

  @Column({ nullable: true })
  uploadedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;
}
