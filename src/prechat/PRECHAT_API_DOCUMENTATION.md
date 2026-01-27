# Pre-Chat Form Module - API Documentation

## Overview

The Pre-Chat Form module enables LiveChat-style pre-chat forms that visitors must complete before initiating a chat conversation. Each form is configured per group, and submitted data is stored as an immutable snapshot with the conversation.

## Database Schema

### Tables Created (via TypeORM synchronize: true)

1. **prechat_forms** - Form configurations per group
2. **prechat_form_fields** - Form field definitions
3. **conversation_prechat_snapshots** - Immutable form snapshots
4. **conversation_prechat_answers** - Visitor responses (immutable)

## API Endpoints

### Agent Dashboard Endpoints (Protected - JWT Required)

#### 1. Create Pre-Chat Form
```http
POST /v1/prechat/admin/forms
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "groupId": "uuid",
  "title": "Customer Information",
  "description": "Please provide your details",
  "isRequired": true,
  "isActive": true,
  "fields": [
    {
      "label": "Full Name",
      "type": "text",
      "isRequired": true,
      "placeholder": "Enter your name",
      "order": 0
    },
    {
      "label": "Email",
      "type": "email",
      "isRequired": true,
      "placeholder": "your.email@example.com",
      "order": 1
    },
    {
      "label": "Department",
      "type": "select",
      "isRequired": false,
      "options": ["Sales", "Support", "Billing"],
      "order": 2
    }
  ]
}
```

**Field Types:**
- `text` - Single line text
- `email` - Email validation
- `phone` - Phone number
- `textarea` - Multi-line text
- `select` - Dropdown selection
- `checkbox` - Multiple choice
- `radio` - Single choice

#### 2. Get All Forms
```http
GET /v1/prechat/admin/forms
Authorization: Bearer <JWT_TOKEN>
```

#### 3. Get Form by ID
```http
GET /v1/prechat/admin/forms/:id
Authorization: Bearer <JWT_TOKEN>
```

#### 4. Update Form
```http
PATCH /v1/prechat/admin/forms/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Updated Title",
  "isActive": false,
  "fields": [...]
}
```

**Note:** Updating a form does NOT affect existing conversation snapshots. Only new submissions use the updated form.

#### 5. Delete Form (Soft Delete)
```http
DELETE /v1/prechat/admin/forms/:id
Authorization: Bearer <JWT_TOKEN>
```

#### 6. Get Conversation Pre-Chat Data
```http
GET /v1/prechat/admin/conversations/:conversationId/prechat
Authorization: Bearer <JWT_TOKEN>
```

Returns the immutable snapshot and answers for a conversation.

---

### Widget Endpoints (Public - No Authentication)

#### 1. Get Form by Group
```http
GET /v1/prechat/widget/groups/:groupId/form
```

Retrieves the active pre-chat form for a group. Used by widget to display form to visitor.

**Response:**
```json
{
  "id": "form-uuid",
  "groupId": "group-uuid",
  "title": "Customer Information",
  "description": "Please provide your details",
  "isRequired": true,
  "isActive": true,
  "fields": [
    {
      "id": "field-uuid",
      "label": "Full Name",
      "type": "text",
      "isRequired": true,
      "placeholder": "Enter your name",
      "order": 0
    }
  ]
}
```

#### 2. Submit Form
```http
POST /v1/prechat/widget/submit
Content-Type: application/json

{
  "formId": "form-uuid",
  "visitorId": "visitor-uuid",
  "answers": [
    {
      "fieldId": "field-uuid",
      "value": "John Doe"
    },
    {
      "fieldId": "field-uuid-2",
      "value": "john@example.com"
    }
  ]
}
```

**Behavior:**
- Creates a new conversation
- Creates immutable form snapshot
- Saves answers (immutable)
- Validates all required fields
- Returns 400 if required fields missing
- Returns conversation with prechat data

**Response:**
```json
{
  "id": "snapshot-uuid",
  "conversationId": "conversation-uuid",
  "formId": "form-uuid",
  "formTitle": "Customer Information",
  "formDescription": "Please provide your details",
  "fieldsSnapshot": [...],
  "answers": [
    {
      "fieldId": "field-uuid",
      "fieldLabel": "Full Name",
      "value": "John Doe"
    }
  ],
  "submittedAt": "2026-01-27T10:30:00.000Z"
}
```

#### 3. Get Conversation Pre-Chat (Read-Only)
```http
GET /v1/prechat/widget/conversations/:conversationId/prechat
```

Visitor can view their submitted pre-chat data (read-only).

#### 4. Check if Conversation Has Pre-Chat
```http
GET /v1/prechat/widget/conversations/:conversationId/has-prechat
```

**Response:**
```json
{
  "conversationId": "conversation-uuid",
  "hasPrechat": true
}
```

---

## Business Rules

### Form Configuration
- Each group can have ONE active pre-chat form
- Forms can be required (blocks chat) or optional
- Forms can be active or inactive
- Agents configure forms from dashboard

### Field Validation
- Required fields MUST be filled before submission
- Optional fields do NOT block chat initiation
- Field types enforce basic validation (email, phone)

### Submission Rules
- **One submission per conversation** (enforced by unique constraint)
- Submission creates conversation automatically
- All data is immutable after submission
- Snapshot preserves form structure at submission time

### Data Immutability
- Form snapshots never change
- Answers never change
- Future form edits don't affect existing conversations
- Agents see data exactly as visitor submitted it

### Visibility
- **Agent Dashboard:** Full read access to all prechat data
- **Widget:** Visitor can view their own submission (read-only)
- No editing allowed after submission

---

## Module Structure

```
src/prechat/
├── dto/
│   ├── create-prechat-form.dto.ts
│   ├── update-prechat-form.dto.ts
│   └── submit-prechat-form.dto.ts
├── prechat.module.ts
├── prechat.service.ts
├── prechat-admin.controller.ts (protected)
└── prechat-widget.controller.ts (public)

src/database/mysql/
├── prechat-form.entity.ts
├── prechat-form-field.entity.ts
├── conversation-prechat-snapshot.entity.ts
└── conversation-prechat-answer.entity.ts
```

---

## Example Usage Flow

### 1. Agent Creates Form (Dashboard)
```bash
POST /v1/prechat/admin/forms
# Agent configures form for their group
```

### 2. Widget Loads Form
```bash
GET /v1/prechat/widget/groups/{groupId}/form
# Widget displays form to visitor
```

### 3. Visitor Submits Form
```bash
POST /v1/prechat/widget/submit
# Creates conversation + snapshot + answers
```

### 4. Agent Views Submission
```bash
GET /v1/prechat/admin/conversations/{conversationId}/prechat
# Agent sees visitor's responses in dashboard
```

---

## Testing Examples

### Create a Form (curl)
```bash
curl -X POST http://localhost:3000/v1/prechat/admin/forms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "group-uuid",
    "title": "Support Form",
    "isRequired": true,
    "fields": [
      {
        "label": "Name",
        "type": "text",
        "isRequired": true
      },
      {
        "label": "Email",
        "type": "email",
        "isRequired": true
      }
    ]
  }'
```

### Submit Form (curl)
```bash
curl -X POST http://localhost:3000/v1/prechat/widget/submit \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "form-uuid",
    "visitorId": "visitor-uuid",
    "answers": [
      {"fieldId": "field-1", "value": "John Doe"},
      {"fieldId": "field-2", "value": "john@example.com"}
    ]
  }'
```

---

## Key Features Implemented

✅ One pre-chat submission per conversation (unique constraint)  
✅ Forms configured per group  
✅ Immutable form snapshots  
✅ Immutable answers  
✅ Required field validation  
✅ Optional fields support  
✅ Agent endpoints protected (JWT)  
✅ Widget endpoints public  
✅ TypeORM entities with relationships  
✅ Soft delete for forms  
✅ Read-only visibility after submission  
✅ Future form edits don't affect existing conversations  

---

## Notes

- Uses `synchronize: true` (no migrations needed)
- All DTOs use `class-validator` for validation
- Follows existing project patterns (similar to groups, tags modules)
- Service handles all business logic
- Controllers are thin (delegate to service)
- Proper error handling (NotFoundException, BadRequestException)
