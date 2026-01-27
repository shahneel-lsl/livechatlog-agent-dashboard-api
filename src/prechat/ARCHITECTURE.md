# Pre-Chat Form System - Architecture Diagram

## Database Schema Relationships

```
┌─────────────────┐
│     groups      │
└────────┬────────┘
         │
         │ groupId (FK)
         │
         ▼
┌─────────────────┐         1:M         ┌──────────────────────┐
│  prechat_forms  │◄────────────────────┤ prechat_form_fields  │
│                 │                     │                      │
│ • id (PK)       │                     │ • id (PK)            │
│ • groupId (FK)  │                     │ • formId (FK)        │
│ • title         │                     │ • label              │
│ • description   │                     │ • type (enum)        │
│ • isRequired    │                     │ • isRequired         │
│ • isActive      │                     │ • placeholder        │
└─────────────────┘                     │ • options (JSON)     │
                                         │ • order              │
                                         └──────────────────────┘

         Form Configuration
         (Mutable - can be edited)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         Submission Data
         (Immutable - never changes)

┌──────────────────────────────────┐
│        conversations             │
└─────────────────┬────────────────┘
                  │
                  │ 1:1
                  │ conversationId (FK, UNIQUE)
                  │
                  ▼
┌──────────────────────────────────┐
│ conversation_prechat_snapshots   │         1:M
│                                  │◄────────────────┐
│ • id (PK)                        │                 │
│ • conversationId (FK, UNIQUE)    │                 │
│ • formId (stored)                │                 │
│ • formTitle (stored)             │                 │
│ • formDescription (stored)       │                 │
│ • fieldsSnapshot (JSON)          │                 │
│ • submittedAt                    │                 │
└──────────────────────────────────┘                 │
                                                      │
                                         ┌────────────────────────────────┐
                                         │ conversation_prechat_answers   │
                                         │                                │
                                         │ • id (PK)                      │
                                         │ • snapshotId (FK)              │
                                         │ • fieldId (stored)             │
                                         │ • fieldLabel (stored)          │
                                         │ • value                        │
                                         └────────────────────────────────┘
```

## API Flow Diagram

```
┌─────────────────┐                                    ┌──────────────────┐
│  Agent          │                                    │  Visitor         │
│  Dashboard      │                                    │  Widget          │
└────────┬────────┘                                    └────────┬─────────┘
         │                                                      │
         │ 1. Create Form (JWT)                                │
         │ POST /v1/prechat/admin/forms                        │
         ▼                                                      │
┌──────────────────────────────────────────────┐              │
│              NestJS Backend                   │              │
│  ┌────────────────────────────────────────┐  │              │
│  │  PrechatAdminController (Protected)    │  │              │
│  │  @UseGuards(JwtAuthGuard)              │  │              │
│  └──────────────────┬─────────────────────┘  │              │
│                     │                         │              │
│                     ▼                         │              │
│  ┌────────────────────────────────────────┐  │              │
│  │         PrechatService                 │  │              │
│  │  • createForm()                        │  │              │
│  │  • findByGroupId()                     │  │              │
│  │  • submitForm()                        │  │              │
│  │  • getConversationPrechatData()        │  │              │
│  └──────────────────┬─────────────────────┘  │              │
│                     │                         │              │
│                     ▼                         │              │
│  ┌────────────────────────────────────────┐  │              │
│  │  TypeORM Repositories                  │  │              │
│  │  • PrechatForm                         │  │              │
│  │  • PrechatFormField                    │  │              │
│  │  • ConversationPrechatSnapshot         │  │              │
│  │  • ConversationPrechatAnswer           │  │              │
│  └──────────────────┬─────────────────────┘  │              │
│                     │                         │              │
└─────────────────────┼─────────────────────────┘              │
                      │                                        │
                      ▼                                        │
            ┌──────────────────┐                              │
            │   MySQL Database │                              │
            │   4 Tables       │                              │
            └──────────────────┘                              │
                      ▲                                        │
                      │                                        │
                      │ 2. Get Form (Public)                  │
                      │ GET /v1/prechat/widget/groups/:id/form│
                      │◄──────────────────────────────────────┤
                      │                                        │
                      │ 3. Submit Form (Public)                │
                      │ POST /v1/prechat/widget/submit         │
                      │◄──────────────────────────────────────┤
                      │                                        │
            (Creates conversation,                             │
             snapshot, and answers)                            │
```

## Submission Flow

```
VISITOR SUBMITS FORM
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  1. Validate Form Exists & Active                         │
└────────────────────────┬──────────────────────────────────┘
                         ▼
┌───────────────────────────────────────────────────────────┐
│  2. Validate All Required Fields Present                  │
│     (Missing required → 400 Bad Request)                   │
└────────────────────────┬──────────────────────────────────┘
                         ▼
┌───────────────────────────────────────────────────────────┐
│  3. Create Conversation                                    │
│     - visitorId                                            │
│     - groupId (from form)                                  │
│     - status: 'pending'                                    │
└────────────────────────┬──────────────────────────────────┘
                         ▼
┌───────────────────────────────────────────────────────────┐
│  4. Create Immutable Snapshot                              │
│     - conversationId (UNIQUE - one per conversation)       │
│     - formId, formTitle, formDescription                   │
│     - fieldsSnapshot (JSON - preserves field structure)    │
└────────────────────────┬──────────────────────────────────┘
                         ▼
┌───────────────────────────────────────────────────────────┐
│  5. Create Immutable Answers                               │
│     - snapshotId                                           │
│     - fieldId, fieldLabel, value                           │
│     (One record per answer)                                │
└────────────────────────┬──────────────────────────────────┘
                         ▼
┌───────────────────────────────────────────────────────────┐
│  6. Return Complete Data                                   │
│     - Conversation ID                                      │
│     - Snapshot with all answers                            │
└───────────────────────────────────────────────────────────┘
```

## Authorization Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Request Incoming                       │
└───────────────────────────┬──────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │                │
         /v1/prechat/admin/*    /v1/prechat/widget/*
                    │                │
                    ▼                ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  JwtAuthGuard    │  │   No Guard       │
        │  (Protected)     │  │   (Public)       │
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
          Verify JWT Token      Direct Access
                 │                     │
         ┌───────┴────────┐           │
         │                │           │
    Valid Token      Invalid          │
         │                │           │
         ▼                ▼           ▼
    Allow Access    401 Error    Allow Access
         │                            │
         ▼                            ▼
  ┌─────────────────┐      ┌──────────────────┐
  │ Admin Actions   │      │ Widget Actions   │
  │ - Create form   │      │ - Get form       │
  │ - Update form   │      │ - Submit form    │
  │ - Delete form   │      │ - View submission│
  │ - View all      │      └──────────────────┘
  └─────────────────┘
```

## Field Types & Validation

```
┌────────────────────────────────────────────────────────┐
│               Field Type System                         │
└────────────────────────────────────────────────────────┘

TEXT                  TEXTAREA              SELECT
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Single line  │     │ Multi-line   │     │ Dropdown     │
│ Plain text   │     │ Long text    │     │ + options[]  │
└──────────────┘     └──────────────┘     └──────────────┘

EMAIL                 PHONE                RADIO
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Email format │     │ Phone format │     │ Single choice│
│ Validation   │     │ Validation   │     │ + options[]  │
└──────────────┘     └──────────────┘     └──────────────┘

CHECKBOX
┌──────────────┐
│ Multi-choice │
│ + options[]  │
└──────────────┘

Each field has:
• label (displayed)
• type (enum)
• isRequired (boolean)
• placeholder (optional)
• options (for select/radio/checkbox)
• order (display order)
```

## Data Immutability Model

```
┌────────────────────────────────────────────────────────┐
│              Form Configuration (MUTABLE)              │
├────────────────────────────────────────────────────────┤
│  Agent can edit:                                       │
│  • Form title, description                             │
│  • Add/remove/modify fields                            │
│  • Change required/optional settings                   │
│  • Activate/deactivate form                            │
└───────────────────────┬────────────────────────────────┘
                        │
                  On submission,
                  form is copied to:
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│          Conversation Snapshot (IMMUTABLE)             │
├────────────────────────────────────────────────────────┤
│  NEVER changes:                                        │
│  • Form structure (fieldsSnapshot JSON)                │
│  • Field labels, types, requirements                   │
│  • Visitor answers                                     │
│  • Submission timestamp                                │
│                                                        │
│  Why? So agents always see what visitor saw            │
└────────────────────────────────────────────────────────┘

Example:
┌─────────────────────────────────────────────────────┐
│ Day 1: Form has fields A, B, C                      │
│ Visitor submits → Snapshot: A, B, C                 │
├─────────────────────────────────────────────────────┤
│ Day 2: Agent edits form → adds field D              │
│ New form: A, B, C, D                                │
├─────────────────────────────────────────────────────┤
│ Day 3: Agent views Day 1 conversation               │
│ Agent sees: A, B, C (original snapshot)             │
│ NOT affected by Day 2 changes                       │
└─────────────────────────────────────────────────────┘
```

## Module Dependencies

```
┌─────────────────────────────────────────────────┐
│              PrechatModule                      │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
   Controllers   Service     Entities
         │           │           │
         │           │           │
         │           ▼           │
         │    ┌──────────────┐  │
         │    │  Repositories│  │
         │    └──────────────┘  │
         │           │           │
         │           ▼           │
         │    External Modules   │
         │    • TypeOrmModule    │
         │    • AuthModule       │
         │    • GroupsModule     │
         │    • ChatModule       │
         └───────────────────────┘

Imports:
• TypeOrmModule.forFeature([...entities])
• Uses existing JwtAuthGuard
• Links to Group & Conversation entities

Exports:
• PrechatService (for other modules)
```

## Security Model

```
┌────────────────────────────────────────────────┐
│          Authorization Layers                  │
└────────────────────────────────────────────────┘

Layer 1: Route-Level Guards
┌──────────────────────────────────────────────┐
│ @Controller('v1/prechat/admin')              │
│ @UseGuards(JwtAuthGuard)                     │
│ ↓ All routes protected                       │
└──────────────────────────────────────────────┘

Layer 2: Service-Level Validation
┌──────────────────────────────────────────────┐
│ • Verify entities exist (Group, Form, etc.)  │
│ • Validate required fields                   │
│ • Check data ownership                       │
│ • Enforce business rules                     │
└──────────────────────────────────────────────┘

Layer 3: Database Constraints
┌──────────────────────────────────────────────┐
│ • Foreign key constraints                    │
│ • Unique constraints (conversationId)        │
│ • NOT NULL constraints                       │
│ • Enum validation                            │
└──────────────────────────────────────────────┘

Layer 4: DTO Validation
┌──────────────────────────────────────────────┐
│ class-validator decorators:                  │
│ • @IsString()                                │
│ • @IsNotEmpty()                              │
│ • @IsEnum()                                  │
│ • @ValidateNested()                          │
└──────────────────────────────────────────────┘
```

---

**This architecture ensures:**
- ✅ Data integrity through immutability
- ✅ Clear separation of concerns
- ✅ Secure authorization model
- ✅ Scalable entity relationships
- ✅ Type-safe validation
