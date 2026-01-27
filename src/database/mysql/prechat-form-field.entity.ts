import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PrechatForm } from './prechat-form.entity';

export enum FieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
}

@Entity('prechat_form_fields')
export class PrechatFormField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PrechatForm, (form) => form.fields, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'formId' })
  form: PrechatForm;

  @Column()
  formId: string;

  @Column({ length: 255 })
  label: string;

  @Column({
    type: 'enum',
    enum: FieldType,
    default: FieldType.TEXT,
  })
  type: FieldType;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ type: 'text', nullable: true })
  placeholder: string;

  @Column({ type: 'json', nullable: true })
  options: string[]; // For select, radio, checkbox

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
