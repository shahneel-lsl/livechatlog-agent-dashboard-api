import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('visitors')
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, length: 255 })
  name: string;

  @Column({ nullable: true, length: 255 })
  email: string;

  @Column({ nullable: true, length: 50 })
  phone: string;

  @Column({ nullable: true, type: 'text' })
  userAgent: string;

  @Column({ nullable: true, length: 100 })
  ipAddress: string;

  @Column({ nullable: true, length: 500 })
  referrer: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  browsingHistory: {
    visits: Array<{
      path: string;
      title: string;
      enteredAt: number;
      durationMs?: number;
    }>;
    initialReferrer: string;
    source: 'direct' | 'referral' | 'unknown';
  };

  @Column({ unique: true, length: 255 })
  sessionToken: string;

  @OneToMany(() => Conversation, (conversation) => conversation.visitor)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
