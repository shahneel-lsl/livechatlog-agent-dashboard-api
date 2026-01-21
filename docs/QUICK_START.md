# LiveChat Inc Backend - Quick Start Guide

## Prerequisites

- Node.js 20+ installed
- MySQL 8.0+ running
- Redis server running (for BullMQ queues)
- Git

## Installation Steps

### 1. Clone and Install Dependencies

```bash
cd livechatlog-dashboard
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Essential variables
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=livechat_db

JWT_SECRET=your-super-secret-key-change-this

REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Create Database

```sql
CREATE DATABASE livechat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Note**: You don't need to run migrations! TypeORM is configured with `synchronize: true`, which automatically creates all tables based on your entities.

### 4. Start Redis (if not running)

**macOS/Linux:**
```bash
redis-server
```

**Windows:**
```bash
# Download Redis for Windows or use WSL
redis-server.exe
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 5. Run the Application

**Development:**
```bash
npm run start:dev
```

**Production:**
```bash
npm run build
npm run start:prod
```

The API will be available at: `http://localhost:3000`

---

## Initial Setup

### Create Your First Agent

Since we need an agent to login, you have two options:

#### Option A: Direct SQL Insert (Quick)

```sql
USE livechat_db;

INSERT INTO agents (id, name, email, password, role, status, acceptingChats, maxConcurrentChats, isDeleted, createdAt, updatedAt)
VALUES (
  UUID(),
  'Admin Agent',
  'admin@livechat.com',
  '$2b$10$YourHashedPasswordHere',  -- bcrypt hash for 'password123'
  'admin',
  'online',
  true,
  10,
  false,
  NOW(),
  NOW()
);
```

To generate a bcrypt hash for your password, use:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password123', 10, (err, hash) => console.log(hash));"
```

#### Option B: Create a Seed Script (Better)

Create `scripts/seed-admin.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Agent, AgentRole, AgentStatus } from '../src/database/mysql/agent.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const agentRepository: Repository<Agent> = app.get(getRepositoryToken(Agent));

  const existingAdmin = await agentRepository.findOne({
    where: { email: 'admin@livechat.com' },
  });

  if (existingAdmin) {
    console.log('Admin already exists!');
    await app.close();
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = agentRepository.create({
    name: 'System Admin',
    email: 'admin@livechat.com',
    password: hashedPassword,
    role: AgentRole.ADMIN,
    status: AgentStatus.ONLINE,
    acceptingChats: true,
    maxConcurrentChats: 10,
  });

  await agentRepository.save(admin);
  console.log('✅ Admin agent created successfully!');
  console.log('Email: admin@livechat.com');
  console.log('Password: admin123');

  await app.close();
}

bootstrap();
```

Run it:
```bash
npx ts-node scripts/seed-admin.ts
```

---

## Testing the API

### 1. Import Postman Collection

Import the file: `LiveChat_API.postman_collection.json`

### 2. Test Authentication

**Login:**
```bash
POST http://localhost:3000/v1/auth/login
Content-Type: application/json

{
  "email": "admin@livechat.com",
  "password": "admin123"
}
```

Copy the `access_token` from the response.

### 3. Create a Group (Department)

```bash
POST http://localhost:3000/v1/groups
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Support Team",
  "description": "Customer support department",
  "routingStrategy": "least_loaded",
  "isDefault": true
}
```

Save the `group_id` from response.

### 4. Assign Agent to Group

```bash
POST http://localhost:3000/v1/groups/{group_id}/agents
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "agentIds": ["YOUR_AGENT_ID_FROM_LOGIN"]
}
```

### 5. Create Widget Session (Public Endpoint)

```bash
POST http://localhost:3000/v1/widget/session
Content-Type: application/json

{
  "name": "John Visitor",
  "email": "visitor@example.com",
  "initialMessage": "Hello, I need help!",
  "groupId": "YOUR_GROUP_ID",
  "metadata": {
    "page": "/pricing",
    "source": "website"
  }
}
```

This will:
- Create a visitor
- Create a conversation
- Create the first thread
- Add the initial message
- Return session information

### 6. Assign Conversation to Agent

```bash
POST http://localhost:3000/v1/conversations/{conversation_id}/assign
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "agentId": "YOUR_AGENT_ID",
  "reason": "Manual assignment"
}
```

This will:
- Close the current thread
- Create a new thread
- Add system event: "Agent [name] joined"
- Update conversation status to "active"

### 7. Send Messages

```bash
POST http://localhost:3000/v1/threads/{thread_id}/events
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "authorType": "agent",
  "content": "Hello! How can I help you?",
  "type": "message"
}
```

### 8. Get Thread Events (Chat History)

```bash
GET http://localhost:3000/v1/threads/{thread_id}/events
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Common Issues & Solutions

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution**: Make sure MySQL is running and credentials in `.env` are correct.

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Start Redis server or update `REDIS_HOST` and `REDIS_PORT` in `.env`.

### JWT Token Invalid
```
401 Unauthorized
```
**Solution**: 
1. Login again to get fresh token
2. Check if `JWT_SECRET` in `.env` matches
3. Ensure token is sent as `Authorization: Bearer TOKEN`

### Tables Not Created
**Solution**: TypeORM is set to auto-sync. If tables aren't created:
1. Check MySQL connection
2. Verify `synchronize: true` in `src/config/mysql.config.ts`
3. Restart the application

---

## Project Structure

```
livechatlog-dashboard/
├── src/
│   ├── agents/              # Agent CRUD module
│   ├── auth/                # JWT authentication
│   ├── chat/                # Widget & runtime APIs
│   ├── database/mysql/      # TypeORM entities
│   ├── groups/              # Group CRUD module
│   ├── queue/               # BullMQ assignment engine
│   ├── tags/                # Tag CRUD module
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry
├── LIVECHAT_ARCHITECTURE.md # Full documentation
├── LiveChat_API.postman_collection.json
└── .env.example
```

---

## Next Steps

1. ✅ Test all CRUD endpoints with Postman
2. ✅ Test widget session creation
3. ✅ Test conversation assignment
4. ✅ Test message sending
5. 🔄 Configure Firebase for real-time notifications (optional)
6. 🔄 Set up production environment with proper secrets
7. 🔄 Add monitoring and logging
8. 🔄 Configure CORS for your frontend

---

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `API_ENV=production`
- [ ] Disable TypeORM `synchronize` and use migrations
- [ ] Set up database backups
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure Redis password
- [ ] Set up monitoring (PM2, New Relic, etc.)
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry)
- [ ] Review and test all security measures

---

## Support

For detailed architecture and API documentation, see:
- `LIVECHAT_ARCHITECTURE.md` - Complete system documentation
- `LiveChat_API.postman_collection.json` - API collection with examples

**Happy coding! 🚀**
