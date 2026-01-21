# Canned Responses Module - Implementation Guide

## Overview
The Canned Responses module enables agents to create and use predefined quick reply templates (similar to LiveChat's canned responses feature) for faster customer communication.

## Module Structure

```
src/canned-responses/
├── canned-responses.module.ts          # Module definition
├── canned-responses.controller.ts      # REST API endpoints
├── canned-responses.service.ts         # Business logic
└── dto/
    ├── create-canned-response.dto.ts   # Creation validation
    └── update-canned-response.dto.ts   # Update validation

src/database/mysql/
└── canned-response.entity.ts           # TypeORM entity

database/migrations/
└── 20260107_create_canned_responses_table.sql
```

## API Endpoints

### 1. Create Canned Response
```http
POST /v1/canned-responses
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "tag": "#pricing",
  "title": "Pricing Information",
  "message": "Our pricing starts at $29/month...",
  "category": "Sales",
  "isActive": true,
  "createdBy": "agent-uuid"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tag": "#pricing",
  "title": "Pricing Information",
  "message": "Our pricing starts at $29/month...",
  "category": "Sales",
  "isActive": true,
  "createdBy": "agent-uuid",
  "createdAt": "2026-01-07T10:30:00.000Z",
  "updatedAt": "2026-01-07T10:30:00.000Z"
}
```

### 2. Get All Canned Responses (Paginated & Searchable)
```http
GET /v1/canned-responses?search=#pricing&isActive=true&category=Sales&page=1&limit=50
Authorization: Bearer {jwt_token}
```

**Query Parameters:**
- `search` (optional): Search by tag or title
- `isActive` (optional): Filter by active status (true/false)
- `category` (optional): Filter by category
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Items per page

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tag": "#pricing",
      "title": "Pricing Information",
      "message": "Our pricing starts at $29/month...",
      "category": "Sales",
      "isActive": true,
      "creator": {
        "id": "agent-uuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-01-07T10:30:00.000Z",
      "updatedAt": "2026-01-07T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50
}
```

### 3. Get Canned Response by Tag (For Autocomplete)
```http
GET /v1/canned-responses/by-tag/#pricing
Authorization: Bearer {jwt_token}
```

**Use Case:** When agent types a tag in the chat input, frontend calls this endpoint to get the message content.

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tag": "#pricing",
  "title": "Pricing Information",
  "message": "Our pricing starts at $29/month...",
  "category": "Sales",
  "isActive": true,
  "creator": {
    "id": "agent-uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2026-01-07T10:30:00.000Z",
  "updatedAt": "2026-01-07T10:30:00.000Z"
}
```

### 4. Get Canned Response by ID
```http
GET /v1/canned-responses/{id}
Authorization: Bearer {jwt_token}
```

### 5. Get All Categories
```http
GET /v1/canned-responses/categories
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
["Sales", "Support", "Technical", "Billing", "General"]
```

### 6. Update Canned Response
```http
PUT /v1/canned-responses/{id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "title": "Updated Title",
  "message": "Updated message content",
  "isActive": false
}
```

**Note:** All fields are optional. Only provided fields will be updated.

### 7. Delete Canned Response (Soft Delete)
```http
DELETE /v1/canned-responses/{id}
Authorization: Bearer {jwt_token}
```

**Response:** 204 No Content

## Database Schema

### Table: `canned_responses`

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) | UUID primary key |
| tag | VARCHAR(100) | Unique tag (e.g., #pricing, /refund) |
| title | VARCHAR(255) | Response title |
| message | TEXT | Response message content |
| category | VARCHAR(100) | Optional category |
| isActive | BOOLEAN | Active status (default: true) |
| created_by | VARCHAR(36) | Foreign key to agents.id |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |
| deletedAt | TIMESTAMP | Soft delete timestamp |
| isDeleted | BOOLEAN | Soft delete flag |

**Indexes:**
- `IDX_canned_responses_tag` - For fast tag lookups
- `IDX_canned_responses_tag_unique` - Unique constraint (excluding deleted)
- `IDX_canned_responses_created_by` - Foreign key index

## Frontend Integration Guide

### 1. Chat Input Autocomplete

When agent types a tag (starting with # or /), trigger autocomplete:

```typescript
// Example React/Vue code
const handleInputChange = async (text: string) => {
  // Detect if user is typing a tag
  const tagMatch = text.match(/(#|\/)\w+/);
  
  if (tagMatch) {
    const tag = tagMatch[0];
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/canned-responses/by-tag/${encodeURIComponent(tag)}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      );
      
      if (response.ok) {
        const cannedResponse = await response.json();
        // Show suggestion UI
        showSuggestion(cannedResponse);
      }
    } catch (error) {
      // Tag not found or error
      console.log('No canned response found');
    }
  }
};

const insertCannedResponse = (cannedResponse: CannedResponse) => {
  // Replace the tag in input with the actual message
  const newText = inputText.replace(cannedResponse.tag, cannedResponse.message);
  setInputText(newText);
};
```

### 2. Search Canned Responses

```typescript
const searchCannedResponses = async (searchTerm: string, isActive = true) => {
  const params = new URLSearchParams({
    search: searchTerm,
    isActive: String(isActive),
    page: '1',
    limit: '20'
  });
  
  const response = await fetch(
    `${API_BASE_URL}/v1/canned-responses?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }
  );
  
  return response.json();
};
```

### 3. Create New Canned Response

```typescript
const createCannedResponse = async (data: CreateCannedResponseDto) => {
  const response = await fetch(
    `${API_BASE_URL}/v1/canned-responses`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );
  
  return response.json();
};
```

## Tag Format Rules

- Must start with `#` or `/`
- Can contain only alphanumeric characters, hyphens, and underscores
- Max length: 100 characters
- Examples:
  - ✅ `#pricing`
  - ✅ `/refund`
  - ✅ `#technical-support`
  - ✅ `#support_tier_1`
  - ❌ `pricing` (missing prefix)
  - ❌ `#pricing!` (invalid character)

## Features Implemented

✅ Full CRUD operations  
✅ Soft delete with `deletedAt` and `isDeleted`  
✅ Tag uniqueness validation (excluding soft-deleted)  
✅ Search by tag or title  
✅ Filter by active status  
✅ Filter by category  
✅ Pagination support  
✅ Get by tag endpoint for autocomplete  
✅ Get all categories endpoint  
✅ JWT authentication  
✅ Input validation with class-validator  
✅ Foreign key relationship with agents  
✅ Created by tracking  
✅ Database indexes for performance  

## Database Setup

The `canned_responses` table will be automatically created by TypeORM when you start the application (with `synchronize: true` enabled).

The entity definition handles all table creation, indexes, and foreign key constraints.

## Testing with Postman

1. Import the collection: `postman/Canned_Responses_API.postman_collection.json`
2. Set variables:
   - `base_url`: Your API URL (e.g., `http://localhost:3000`)
   - `jwt_token`: Your authentication token
   - `agent_id`: Your agent UUID
3. Run the requests in order to test all endpoints

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success (GET)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid JWT)
- `404` - Not Found
- `409` - Conflict (duplicate tag)

## Performance Considerations

- Tags are indexed for fast lookups
- Soft-deleted records are excluded from unique constraints
- Pagination prevents large result sets
- Query builder used for efficient filtering
- Join with creator only when needed

## Future Enhancements (Optional)

- Variables in messages (e.g., `{agent_name}`, `{visitor_name}`)
- Rich text formatting support
- Attachments/images in responses
- Usage statistics (how often each response is used)
- Share responses between agents
- Team/group-specific responses
- Response templates with placeholders
- Keyboard shortcuts (e.g., Cmd+K to open response picker)
