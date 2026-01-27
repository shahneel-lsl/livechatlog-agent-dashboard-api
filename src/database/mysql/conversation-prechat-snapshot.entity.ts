import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { ConversationPrechatAnswer } from './conversation-prechat-answer.entity';

@Entity('conversation_prechat_snapshots')
export class ConversationPrechatSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Conversation, { nullable: false })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ unique: true })
  conversationId: string;

  @Column()
  formId: string;

  @Column({ length: 255 })
  formTitle: string;

  @Column({ type: 'text', nullable: true })
  formDescription: string;

  @Column({ type: 'json' })
  fieldsSnapshot: any[]; // Immutable snapshot of form fields at submission time

  @OneToMany(() => ConversationPrechatAnswer, (answer) => answer.snapshot, {
    cascade: true,
  })
  answers: ConversationPrechatAnswer[];

  @CreateDateColumn()
  submittedAt: Date;
}
