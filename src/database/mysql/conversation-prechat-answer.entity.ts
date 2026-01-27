import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ConversationPrechatSnapshot } from './conversation-prechat-snapshot.entity';

@Entity('conversation_prechat_answers')
export class ConversationPrechatAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ConversationPrechatSnapshot, (snapshot) => snapshot.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'snapshotId' })
  snapshot: ConversationPrechatSnapshot;

  @Column()
  snapshotId: string;

  @Column()
  fieldId: string;

  @Column({ length: 255 })
  fieldLabel: string;

  @Column({ type: 'text' })
  value: string;
}
