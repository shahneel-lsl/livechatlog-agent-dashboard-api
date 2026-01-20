# Database Entities

This directory contains TypeORM entity definitions.

## Guidelines

- Each entity represents a database table
- Use decorators from `typeorm` for column definitions
- Follow naming conventions: PascalCase for class names, snake_case for table names
- Use UUIDs for primary keys by default
- Always include `createdAt` and `updatedAt` timestamps

## Example Entity Structure

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('table_name')
export class EntityName {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  fieldName: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
```

## Important Notes

- The project uses `synchronize: true` in TypeORM configuration
- Schema changes are automatically applied to the database
- No manual migrations are needed
- Be cautious with schema changes in production
