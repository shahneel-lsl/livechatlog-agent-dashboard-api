# LiveChatLog Dashboard API

A production-ready **LiveChat Inc-style backend** built with NestJS, TypeORM, MySQL, BullMQ, and Firebase. This system implements event-driven chat lifecycle management with automatic agent assignment, real-time notifications, and comprehensive REST APIs.

## 🌟 Features

### Architecture
- **Event-Driven Design**: Immutable event sourcing for all chat messages
- **Thread-Based Conversations**: Separate threads for different conversation phases
- **Automatic Agent Assignment**: BullMQ-powered background worker with smart routing
- **JWT Authentication**: Secure token-based auth for all CRUD operations
- **Soft Deletes**: Data preservation with referential integrity
- **Real-time Updates**: Firebase integration for live notifications

### Core Modules

#### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Agent, Supervisor, Admin)
- Protected CRUD endpoints
- Public widget session endpoint

#### 👥 Agent Management (CRUD)
- Full agent lifecycle management
- Status tracking (online/offline/away)
- Concurrent chat limits
- Agent statistics and availability
- Soft delete with restore capability

#### 🏢 Group Management (CRUD)
- Department/team organization
- Agent-to-group assignments (many-to-many)
- Multiple routing strategies:
  - **Round Robin**: Even distribution
  - **Least Loaded**: Based on active chat count
  - **Sticky**: Returning visitors to same agent
- Default group configuration

#### 🏷️ Tag Management (CRUD)
- Conversation tagging
- Color-coded labels
- Soft delete support

#### 💬 Chat Runtime APIs
- **Widget Session Creation**: Initialize visitor chat
- **Thread Events**: Send/receive messages
- **Conversation Assignment**: Manual or automatic
- **Event History**: Retrieve chat logs
- **System Events**: Auto-generated audit trail

#### ⚙️ Background Processing
- BullMQ queue system
- Redis-backed job processing
- Automatic agent assignment
- Retry logic with exponential backoff
- Concurrent job processing

## 📋 Prerequisites

- **Node.js** 20 or higher
- **MySQL** 8.0 or higher  
- **Redis** 6.0 or higher
- npm or yarn package manager

## � Quick Start

See [QUICK_START.md](./QUICK_START.md) for detailed setup instructions.

### Basic Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 3. Create database
mysql -u root -p
CREATE DATABASE livechat_db;

# 4. Start Redis
redis-server

# 5. Run the application
npm run start:dev
```

The API will be available at `http://localhost:3000`

## 📦 Available Scripts

- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with watch
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run lint` - Lint the codebase
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

## � Documentation

### Complete Documentation
- **[LIVECHAT_ARCHITECTURE.md](./LIVECHAT_ARCHITECTURE.md)** - Full system architecture, database schema, API reference, state transitions, and deployment guide
- **[QUICK_START.md](./QUICK_START.md)** - Step-by-step setup and testing guide

### API Testing
- **[LiveChat_API.postman_collection.json](./LiveChat_API.postman_collection.json)** - Complete Postman collection with all endpoints

## 🎯 API Overview

### Authentication
```
POST   /v1/auth/login          - Login and get JWT token
GET    /v1/auth/me             - Get current user info
```

### Agents (Protected 🔒)
```
POST   /v1/agents              - Create agent
GET    /v1/agents              - List all agents
GET    /v1/agents/:id          - Get agent by ID
GET    /v1/agents/:id/stats    - Get agent statistics
PATCH  /v1/agents/:id          - Update agent
DELETE /v1/agents/:id          - Soft delete agent
POST   /v1/agents/:id/restore  - Restore deleted agent
```

### Groups (Protected 🔒)
```
POST   /v1/groups              - Create group
GET    /v1/groups              - List all groups
GET    /v1/groups/:id          - Get group by ID
PATCH  /v1/groups/:id          - Update group
DELETE /v1/groups/:id          - Soft delete group
POST   /v1/groups/:id/agents   - Assign agents to group
DELETE /v1/groups/:id/agents/:agentId - Remove agent from group
```

### Tags (Protected 🔒)
```
POST   /v1/tags                - Create tag
GET    /v1/tags                - List all tags
GET    /v1/tags/:id            - Get tag by ID
PATCH  /v1/tags/:id            - Update tag
DELETE /v1/tags/:id            - Soft delete tag
```

### Chat / Widget
```
POST   /v1/widget/session      - Create chat session (Public)
POST   /v1/threads/:id/events  - Send event to thread 🔒
GET    /v1/threads/:id/events  - Get thread events 🔒
POST   /v1/conversations/:id/assign - Assign agent 🔒
GET    /v1/conversations/:id   - Get conversation 🔒
```

## 🗄️ Database

### Auto-Synchronization
TypeORM is configured with `synchronize: true` for development, which automatically:
- Creates tables based on entities
- Updates schema when entities change
- No manual migrations needed

**Note**: For production, disable `synchronize` and use proper migrations.

### Entities
- **Agents** - Chat agents with roles and status
- **Groups** - Departments/teams
- **Agent-Groups** - Many-to-many relationship
- **Tags** - Conversation labels
- **Visitors** - Chat visitors
- **Conversations** - Chat sessions
- **Threads** - Conversation phases
- **Events** - Messages and system events
- **Conversation-Tags** - Many-to-many relationship

## 🔧 Technology Stack

- **NestJS 11** - Progressive Node.js framework
- **TypeORM 0.3** - ORM with MySQL support
- **MySQL 8.0** - Relational database
- **JWT** - Token-based authentication
- **BullMQ** - Redis-based queue system
- **Redis** - Cache and queue storage
- **Firebase Admin** - Real-time database and auth
- **GraphQL** - Apollo Server integration
- **Passport** - Authentication middleware
- **bcrypt** - Password hashing
- **class-validator** - DTO validation

## 🐳 Docker Deployment

```bash
# Build the image
docker build -t livechat-api .

# Run the container
docker run -p 3000:3000 --env-file .env livechat-api
```

## 🔒 Security Features

- JWT authentication for protected endpoints
- Bcrypt password hashing
- Input validation with class-validator
- SQL injection prevention (TypeORM)
- Soft deletes for data preservation
- Role-based access control

## � Project Structure

```
livechatlog-dashboard/
├── src/
│   ├── agents/              # Agent CRUD module
│   │   ├── dto/
│   │   ├── agents.controller.ts
│   │   ├── agents.service.ts
│   │   └── agents.module.ts
│   ├── auth/                # JWT authentication
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── chat/                # Widget & runtime APIs
│   │   ├── dto/
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── chat.module.ts
│   ├── database/mysql/      # TypeORM entities
│   │   ├── agent.entity.ts
│   │   ├── group.entity.ts
│   │   ├── tag.entity.ts
│   │   ├── visitor.entity.ts
│   │   ├── conversation.entity.ts
│   │   ├── thread.entity.ts
│   │   └── event.entity.ts
│   ├── groups/              # Group CRUD module
│   ├── queue/               # BullMQ assignment engine
│   ├── tags/                # Tag CRUD module
│   ├── config/              # Configuration files
│   ├── firebase/            # Firebase integration
│   ├── filters/             # Exception filters
│   ├── utils/               # Utility functions
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry
├── test/                    # Test files
├── scripts/                 # Utility scripts
├── database/                # Database-related files
├── uploads/                 # File uploads directory
└── temp/                    # Temporary files
```

## 🔮 Future Enhancements

- [ ] Canned responses (quick replies)
- [ ] File upload support in chat
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Chat transfer between agents
- [ ] Supervisor dashboard
- [ ] Advanced analytics
- [ ] Webhooks for integrations
- [ ] AI-powered chatbot
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the UNLICENSED License.

## � Support

For questions, issues, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ using NestJS**

For detailed architecture, API documentation, and deployment guides, see [LIVECHAT_ARCHITECTURE.md](./LIVECHAT_ARCHITECTURE.md)


See `.env.example` for all required environment variables including:

- Database credentials
- Firebase configuration
- Email/SMS service credentials
- Application settings

## 📝 API Documentation

- GraphQL Playground: `http://localhost:3000/graphql` (development only)
- Health Check: `http://localhost:3000/health`

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

UNLICENSED - Private project

## 👥 Author

LiveChatLog Dashboard Team
