# Project Setup Guide

## Overview

This is a NestJS backend API project following the same architecture and practices as the ddsconnection-backend-api project, but with the latest stable versions of all dependencies.

## Technology Stack

- **NestJS**: v11.0.8 (Latest stable)
- **TypeORM**: v0.3.25 (Latest stable)
- **MySQL2**: v3.14.3 (Latest stable)
- **Node.js**: v20 (LTS)
- **TypeScript**: v5.7.3 (Latest stable)
- **GraphQL**: Apollo Server v3.13.0 with @nestjs/graphql v13.1.0
- **Firebase Admin**: v13.4.0 (Latest stable)

## Key Architecture Patterns

### 1. Database Configuration
- Uses TypeORM with **synchronize: true** (no migrations)
- Automatic schema synchronization on application start
- MySQL database with connection pooling

### 2. Global Validation
- Class-validator for DTO validation
- Class-transformer for data transformation
- Validation pipe configured globally

### 3. CORS Configuration
- Enabled for all origins (configure for production)
- Comprehensive headers support
- Credentials enabled

### 4. Exception Handling
- Global exception filter
- Consistent error response format
- Detailed logging

### 5. Static File Serving
- `/uploads` directory for file uploads
- Configured in main.ts

### 6. GraphQL Integration
- Apollo Server with automatic schema generation
- Schema file generated in `/temp/schema.gql`
- GraphQL Playground enabled in development

### 7. Firebase Integration
- Firebase Admin SDK for authentication
- Real-time database support
- Global module for easy access

### 8. Email & SMS
- Mailer module with Elastic Email SMTP
- Twilio integration for SMS
- Configured via environment variables

## Project Structure

```
livechatlog-dashboard/
├── src/
│   ├── auth/                    # Authentication module
│   │   └── auth.module.ts
│   ├── config/                  # Configuration files
│   │   ├── mysql.config.ts      # Database config (synchronize: true)
│   │   ├── data-source.ts       # TypeORM data source
│   │   ├── firebase.config.ts   # Firebase setup
│   │   └── graphql.config.ts    # GraphQL config
│   ├── database/
│   │   └── mysql/               # TypeORM entities
│   │       ├── user.entity.ts   # Sample entity
│   │       └── README.md
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── firebase/
│   │   └── firebase.module.ts
│   ├── utils/
│   │   └── utils.helper.ts
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts                  # Application bootstrap
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── database/                    # Database scripts
├── scripts/                     # Utility scripts
├── uploads/                     # File uploads
├── temp/                        # Temporary files (GraphQL schema)
├── .env.example                 # Environment variables template
├── .gitignore
├── .prettierrc
├── Dockerfile
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── README.md
├── tsconfig.json
└── tsconfig.build.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd livechatlog-dashboard
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database and service credentials
```

### 3. Database Setup

Create a MySQL database:
```sql
CREATE DATABASE livechatlog_database;
```

No need to create tables manually - TypeORM will auto-sync on first run.

### 4. Run the Application

Development mode:
```bash
npm run start:dev
```

Production mode:
```bash
npm run build
npm run start:prod
```

### 5. Verify Installation

- API Root: http://localhost:3000
- Health Check: http://localhost:3000/health
- GraphQL Playground: http://localhost:3000/graphql (dev only)

## Development Practices

### 1. Creating New Modules

Use NestJS CLI:
```bash
nest generate module module-name
nest generate controller module-name
nest generate service module-name
```

### 2. Creating Entities

1. Create entity file in `src/database/mysql/`
2. No need to run migrations - TypeORM will auto-sync
3. Entity will be automatically detected via glob pattern

Example:
```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('table_name')
export class EntityName {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}
```

### 3. Creating DTOs

Use class-validator decorators:
```typescript
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
```

### 4. Error Handling

Use NestJS built-in exceptions:
```typescript
throw new HttpException('Error message', HttpStatus.BAD_REQUEST);
// or
throw new BadRequestException('Error message');
```

### 5. Database Synchronization

**Important**: The project uses `synchronize: true`:
- ✅ Automatic schema updates
- ✅ No migration files needed
- ⚠️ Be careful in production
- ⚠️ Test schema changes in development first

### 6. Adding GraphQL Resolvers

1. Create resolver with decorators
2. Schema auto-generates in `temp/schema.gql`
3. Use `@Query()` and `@Mutation()` decorators

## Testing

Run tests:
```bash
npm run test          # Unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage
npm run test:e2e      # End-to-end tests
```

## Docker Deployment

Build and run:
```bash
docker build -t livechatlog-dashboard-api .
docker run -p 3000:3000 --env-file .env livechatlog-dashboard-api
```

## Common Tasks

### Add a New Module

1. Create module directory in `src/`
2. Generate module, controller, service
3. Import module in `app.module.ts`
4. Create entities if needed

### Add Environment Variable

1. Add to `.env.example`
2. Add to `.env`
3. Access via `process.env.VARIABLE_NAME`

### Add Database Table

1. Create entity in `src/database/mysql/`
2. Start application - table auto-creates
3. No migrations needed

## Best Practices

- ✅ Use DTOs for all input validation
- ✅ Use class-validator decorators
- ✅ Follow NestJS module structure
- ✅ Keep business logic in services
- ✅ Use dependency injection
- ✅ Write unit tests for services
- ✅ Use environment variables for config
- ✅ Log errors appropriately
- ⚠️ Be cautious with `synchronize: true` in production
- ⚠️ Test schema changes before deploying

## Notes

- TypeScript errors shown during development are expected until dependencies are installed
- Run `npm install` to resolve all module import errors
- The project follows the same practices as ddsconnection-backend-api
- No business logic has been copied - only architecture and patterns
