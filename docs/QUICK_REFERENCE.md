# Quick Reference

## Installation

```bash
cd livechatlog-dashboard
npm install
cp .env.example .env
# Configure .env
npm run start:dev
```

## Common Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start in debug mode

# Production
npm run build              # Build the project
npm run start:prod         # Run production build

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run e2e tests
npm run test:cov           # Test coverage

# Code Quality
npm run lint               # Lint code
npm run format             # Format with Prettier
```

## Generate Code

```bash
# Using NestJS CLI
nest g module users              # Generate module
nest g controller users          # Generate controller
nest g service users             # Generate service
nest g resolver users            # Generate GraphQL resolver
```

## Project Characteristics

### ✅ Using (Same as ddsconnection-backend-api)
- TypeORM with `synchronize: true` (NO migrations)
- Global validation pipes
- Global exception filters
- CORS enabled for all origins
- Static file serving for uploads
- GraphQL with Apollo Server
- Firebase Admin SDK
- Mailer with Elastic Email
- Twilio for SMS
- Schedule module for cron jobs

### 📦 Latest Stable Versions
- NestJS: 11.0.8
- TypeORM: 0.3.25
- MySQL2: 3.14.3
- TypeScript: 5.7.3
- Node: 20 (LTS)

### 🗄️ Database
- Auto-sync schema (no migrations)
- MySQL with connection pooling
- Entity-based schema definition

## Environment Variables Required

```env
# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=livechatlog_database

# App
PORT=3000
API_ENV=development

# Firebase (if using)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_DATABASE_URL=

# Email (if using)
EMAIL_ID=
EMAIL_PASS=
EMAIL_FROM=

# Twilio (if using)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /graphql` - GraphQL playground (dev only)

## Adding Features

### 1. New Entity
```typescript
// src/database/mysql/example.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('examples')
export class Example {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}
```
That's it! Table auto-creates on next start.

### 2. New Module
```bash
nest g module feature
nest g controller feature
nest g service feature
```

Then add to `app.module.ts`:
```typescript
import { FeatureModule } from './feature/feature.module';

@Module({
  imports: [
    // ... other imports
    FeatureModule,
  ],
})
```

### 3. Add Validation
```typescript
// DTO with validation
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

## Docker

```bash
# Build
docker build -t livechatlog-api .

# Run
docker run -p 3000:3000 --env-file .env livechatlog-api
```

## Troubleshooting

### TypeScript Errors
- Run `npm install` first
- Errors are expected until dependencies are installed

### Database Connection
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database exists

### Port Already in Use
- Change PORT in `.env`
- Or kill process: `netstat -ano | findstr :3000`

## Key Differences from Original Project
- ✅ Same architecture & practices
- ✅ Latest stable versions
- ✅ No business logic copied
- ✅ Clean slate for your features
- ✅ Ready for livechatlog-dashboard requirements
