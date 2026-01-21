# Canned Responses - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React/Vue/Angular)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Chat Input Component                         │   │
│  │  ┌────────────────────────────────────────────────────────┐    │   │
│  │  │  Agent types: "Hello, #pricing"                        │    │   │
│  │  │  ↓                                                      │    │   │
│  │  │  Detects tag: #pricing                                 │    │   │
│  │  │  ↓                                                      │    │   │
│  │  │  Calls API: GET /v1/canned-responses/by-tag/#pricing   │    │   │
│  │  │  ↓                                                      │    │   │
│  │  │  Receives message: "Our pricing starts at..."          │    │   │
│  │  │  ↓                                                      │    │   │
│  │  │  Replaces tag with message in input                    │    │   │
│  │  └────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Canned Responses Management UI                      │   │
│  │  • List all responses (with search & filters)                   │   │
│  │  • Create new responses                                          │   │
│  │  • Edit existing responses                                       │   │
│  │  • Delete responses                                              │   │
│  │  • Filter by category, active status                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    │ HTTP/REST API
                                    │ JWT Authentication
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         BACKEND (NestJS)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    CannedResponsesController                     │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │ @Controller('v1/canned-responses')                       │  │   │
│  │  │ @UseGuards(JwtAuthGuard)                                 │  │   │
│  │  │                                                           │  │   │
│  │  │ POST   /v1/canned-responses         → create()          │  │   │
│  │  │ GET    /v1/canned-responses         → findAll()         │  │   │
│  │  │ GET    /v1/canned-responses/by-tag/:tag → findByTag()   │  │   │
│  │  │ GET    /v1/canned-responses/categories  → getCategories()│  │   │
│  │  │ GET    /v1/canned-responses/:id     → findOne()         │  │   │
│  │  │ PUT    /v1/canned-responses/:id     → update()          │  │   │
│  │  │ DELETE /v1/canned-responses/:id     → remove()          │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                    CannedResponsesService                        │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │  Business Logic:                                         │  │   │
│  │  │  • create(dto)          → Validate unique tag           │  │   │
│  │  │  • findAll(filters)     → Search, filter, paginate      │  │   │
│  │  │  • findByTag(tag)       → Get active response by tag    │  │   │
│  │  │  • findOne(id)          → Get single response           │  │   │
│  │  │  • update(id, dto)      → Update with validation        │  │   │
│  │  │  • remove(id)           → Soft delete                   │  │   │
│  │  │  • getCategories()      → Get unique categories         │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                        TypeORM Repository                        │   │
│  │  • CannedResponse Repository                                    │   │
│  │  • Query Builder for complex searches                           │   │
│  │  • Transaction support                                           │   │
│  └─────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                      CannedResponse Entity                       │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │  @Entity('canned_responses')                             │  │   │
│  │  │  • id: string (UUID)                                     │  │   │
│  │  │  • tag: string (UNIQUE, INDEXED)                         │  │   │
│  │  │  • title: string                                         │  │   │
│  │  │  • message: text                                         │  │   │
│  │  │  • category: string                                      │  │   │
│  │  │  • isActive: boolean                                     │  │   │
│  │  │  • createdBy: string (FK → Agent)                       │  │   │
│  │  │  • createdAt: Date                                       │  │   │
│  │  │  • updatedAt: Date                                       │  │   │
│  │  │  • deletedAt: Date (Soft Delete)                        │  │   │
│  │  │  • isDeleted: boolean                                    │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────┬───────────────────────────────────┘   │
│                                 │                                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐   │
│  │                           DTOs                                   │   │
│  │  • CreateCannedResponseDto → Validation with class-validator    │   │
│  │  • UpdateCannedResponseDto → Partial updates                    │   │
│  └───────────────────────────────────────────────────────────────────   │
│                                                                           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │ TypeORM
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                           DATABASE (MySQL)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                Table: canned_responses                           │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │ id          | VARCHAR(36)  | PK                          │  │   │
│  │  │ tag         | VARCHAR(100) | UNIQUE, INDEXED             │  │   │
│  │  │ title       | VARCHAR(255) |                             │  │   │
│  │  │ message     | TEXT         |                             │  │   │
│  │  │ category    | VARCHAR(100) | NULL                        │  │   │
│  │  │ isActive    | BOOLEAN      | DEFAULT 1                   │  │   │
│  │  │ created_by  | VARCHAR(36)  | FK → agents(id), INDEXED   │  │   │
│  │  │ createdAt   | TIMESTAMP    |                             │  │   │
│  │  │ updatedAt   | TIMESTAMP    |                             │  │   │
│  │  │ deletedAt   | TIMESTAMP    | NULL (Soft Delete)          │  │   │
│  │  │ isDeleted   | BOOLEAN      | DEFAULT 0                   │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Table: agents                               │   │
│  │  • id (PK)                                                       │   │
│  │  • name, email, password                                         │   │
│  │  • role, status                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                              DATA FLOW EXAMPLE
═══════════════════════════════════════════════════════════════════════════

1. AUTOCOMPLETE FLOW (Chat Input)
   ─────────────────────────────────────────────────────────────────────
   User Input: "Hello, #pricing"
        ↓
   Frontend detects tag: #pricing
        ↓
   API Call: GET /v1/canned-responses/by-tag/#pricing
        ↓
   Controller → Service → Repository → Database
        ↓
   Query: SELECT * FROM canned_responses 
          WHERE tag = '#pricing' AND isActive = 1 AND isDeleted = 0
        ↓
   Response: { message: "Our pricing starts at $29/month..." }
        ↓
   Frontend replaces "#pricing" with actual message
        ↓
   New Input: "Hello, Our pricing starts at $29/month..."


2. CREATE FLOW (Management UI)
   ─────────────────────────────────────────────────────────────────────
   User submits form with:
   {
     "tag": "#refund",
     "title": "Refund Policy",
     "message": "Our refund policy...",
     "category": "Billing",
     "createdBy": "agent-uuid"
   }
        ↓
   API Call: POST /v1/canned-responses
        ↓
   DTO Validation (CreateCannedResponseDto)
   • Tag format check: ^[#\/][a-zA-Z0-9-_]+$
   • Required fields check
   • Max length validation
        ↓
   Service checks unique tag constraint
        ↓
   INSERT INTO canned_responses (...)
        ↓
   Response: { id: "new-uuid", tag: "#refund", ... }
        ↓
   Frontend updates list


3. SEARCH/FILTER FLOW
   ─────────────────────────────────────────────────────────────────────
   User searches: "pricing" + filter: category="Sales"
        ↓
   API Call: GET /v1/canned-responses?search=pricing&category=Sales&page=1
        ↓
   Query Builder constructs:
   SELECT * FROM canned_responses
   WHERE (tag LIKE '%pricing%' OR title LIKE '%pricing%')
     AND category = 'Sales'
     AND isDeleted = 0
   ORDER BY createdAt DESC
   LIMIT 50 OFFSET 0
        ↓
   Response: {
     data: [...],
     total: 5,
     page: 1,
     limit: 50
   }


═══════════════════════════════════════════════════════════════════════════
                           AUTHENTICATION FLOW
═══════════════════════════════════════════════════════════════════════════

   Request: GET /v1/canned-responses
        ↓
   Headers: Authorization: Bearer <jwt_token>
        ↓
   @UseGuards(JwtAuthGuard)
        ↓
   JWT verification & agent extraction
        ↓
   Request proceeds if valid, 401 if invalid
        ↓
   Controller handles request with authenticated context


═══════════════════════════════════════════════════════════════════════════
                              KEY FEATURES
═══════════════════════════════════════════════════════════════════════════

✅ Isolated Module
   • Zero impact on existing code
   • Self-contained with own controller, service, entity

✅ Type Safety
   • TypeScript throughout
   • DTOs with validation decorators
   • TypeORM entities

✅ Database Optimization
   • Indexes on tag (most queried field)
   • Unique constraint (excludes soft-deleted)
   • Foreign key with cascade delete

✅ Soft Delete
   • Data preserved for recovery
   • Excluded from normal queries
   • Can be restored if needed

✅ Performance
   • Pagination prevents large datasets
   • Indexes speed up searches
   • Query builder for efficient SQL

✅ Security
   • JWT authentication required
   • Input validation prevents injection
   • Foreign key constraints ensure data integrity


═══════════════════════════════════════════════════════════════════════════
