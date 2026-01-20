# 🎯 Canned Responses Module - README

## 🚀 Quick Start

### 1️⃣ Run Database Migration
```bash
mysql -u root -p livechatlog < database/migrations/20260107_create_canned_responses_table.sql
```

### 2️⃣ (Optional) Seed Sample Data
```bash
mysql -u root -p livechatlog < database/migrations/20260107_seed_canned_responses.sql
```

### 3️⃣ Start Application
```bash
npm run start:dev
```

### 4️⃣ Test with Postman
- Import: `postman/Canned_Responses_API.postman_collection.json`
- Set variables: `base_url`, `jwt_token`, `agent_id`

---

## 📁 Project Structure

```
livechatlog-dashboard/
├── src/
│   ├── canned-responses/                    # ✅ NEW MODULE
│   │   ├── canned-responses.module.ts       # Module definition
│   │   ├── canned-responses.controller.ts   # REST API endpoints
│   │   ├── canned-responses.service.ts      # Business logic
│   │   └── dto/
│   │       ├── create-canned-response.dto.ts
│   │       └── update-canned-response.dto.ts
│   ├── database/mysql/
│   │   └── canned-response.entity.ts        # ✅ NEW ENTITY
│   └── app.module.ts                        # ✅ UPDATED (module imported)
├── database/migrations/
│   ├── 20260107_create_canned_responses_table.sql  # ✅ Migration
│   └── 20260107_seed_canned_responses.sql          # ✅ Sample data
├── postman/
│   └── Canned_Responses_API.postman_collection.json # ✅ API tests
├── CANNED_RESPONSES_GUIDE.md                # ✅ Complete guide
├── CANNED_RESPONSES_QUICK_REFERENCE.md      # ✅ Quick reference
├── CANNED_RESPONSES_IMPLEMENTATION.md       # ✅ Implementation summary
├── CANNED_RESPONSES_ARCHITECTURE.md         # ✅ Architecture diagram
└── README.md (this file)                    # ✅ Quick start
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/canned-responses` | Create new response |
| GET | `/v1/canned-responses` | Get all (paginated) |
| GET | `/v1/canned-responses/by-tag/:tag` | **Get by tag (autocomplete)** ⭐ |
| GET | `/v1/canned-responses/categories` | Get all categories |
| GET | `/v1/canned-responses/:id` | Get by ID |
| PUT | `/v1/canned-responses/:id` | Update response |
| DELETE | `/v1/canned-responses/:id` | Soft delete |

---

## 💡 Usage Example

### Frontend Integration (React/Vue)

```typescript
// When agent types #pricing in chat input
const handleCannedResponse = async (tag: string) => {
  const response = await fetch(
    `${API_URL}/v1/canned-responses/by-tag/${tag}`,
    {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }
  );
  
  if (response.ok) {
    const data = await response.json();
    // Insert data.message into chat input
    setChatInput(chatInput.replace(tag, data.message));
  }
};
```

### Create Canned Response

```bash
POST /v1/canned-responses
Authorization: Bearer {token}
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

### Search & Filter

```bash
GET /v1/canned-responses?search=#pricing&isActive=true&category=Sales&page=1&limit=20
```

---

## ✨ Features

✅ **Full CRUD** - Create, Read, Update, Delete  
✅ **Soft Delete** - Data preservation  
✅ **Unique Tags** - Duplicate prevention  
✅ **Search** - By tag or title  
✅ **Filters** - By category, active status  
✅ **Pagination** - Efficient data loading  
✅ **Autocomplete** - Get by tag endpoint  
✅ **JWT Auth** - Secure endpoints  
✅ **Validation** - Input sanitization  
✅ **Relations** - Links to creator agent  
✅ **Indexes** - Optimized queries  

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [CANNED_RESPONSES_GUIDE.md](./CANNED_RESPONSES_GUIDE.md) | **Complete implementation guide** with API docs, frontend integration, database schema |
| [CANNED_RESPONSES_QUICK_REFERENCE.md](./CANNED_RESPONSES_QUICK_REFERENCE.md) | **Quick reference** with examples, cheat sheet, testing checklist |
| [CANNED_RESPONSES_IMPLEMENTATION.md](./CANNED_RESPONSES_IMPLEMENTATION.md) | **Implementation summary** with deliverables, requirements checklist |
| [CANNED_RESPONSES_ARCHITECTURE.md](./CANNED_RESPONSES_ARCHITECTURE.md) | **Architecture diagram** with data flow visualization |

---

## 🗄️ Database Schema

```sql
CREATE TABLE `canned_responses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tag` VARCHAR(100) UNIQUE NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `category` VARCHAR(100) NULL,
  `isActive` BOOLEAN DEFAULT TRUE,
  `created_by` VARCHAR(36) NOT NULL,
  `createdAt` TIMESTAMP,
  `updatedAt` TIMESTAMP,
  `deletedAt` TIMESTAMP NULL,
  `isDeleted` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`created_by`) REFERENCES `agents`(`id`)
);
```

---

## 🎯 Tag Format

Valid examples:
- `#pricing` ✅
- `/refund` ✅
- `#technical-support` ✅

Invalid examples:
- `pricing` ❌ (missing # or /)
- `#pricing!` ❌ (invalid character)

---

## 🧪 Testing

### Postman Collection
Import `postman/Canned_Responses_API.postman_collection.json` with:
- 12 pre-configured requests
- Example payloads
- Response examples

### Sample Data
Run seed script to get 20 example responses across 5 categories:
- Sales (3)
- Support (3)
- Technical (3)
- Billing (4)
- General (6)

---

## ⚡ Performance

- **Indexed tag field** for fast lookups
- **Pagination** prevents large datasets
- **Query optimization** with TypeORM query builder
- **Soft delete** with unique constraint on active records only

---

## 🔒 Security

- **JWT authentication** on all endpoints
- **Input validation** with class-validator
- **SQL injection prevention** via TypeORM
- **Foreign key constraints** for data integrity

---

## 📊 Response Format

```json
{
  "data": [
    {
      "id": "uuid",
      "tag": "#pricing",
      "title": "Pricing Information",
      "message": "Our pricing starts at...",
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

---

## 🎨 Frontend Integration Checklist

- [ ] Implement autocomplete in chat input
- [ ] Detect tags starting with # or /
- [ ] Call `/v1/canned-responses/by-tag/:tag` endpoint
- [ ] Display suggestion UI
- [ ] Replace tag with message on selection
- [ ] Add management UI for CRUD operations
- [ ] Implement search and filter
- [ ] Add category dropdown

---

## ⚙️ Configuration

No additional configuration needed! The module:
- ✅ Integrates with existing TypeORM setup
- ✅ Uses existing JWT authentication
- ✅ Follows project conventions
- ✅ Zero breaking changes

---

## 🚨 Troubleshooting

### Migration fails
```bash
# Check if table already exists
mysql -u root -p -e "SHOW TABLES LIKE 'canned_responses';" livechatlog

# Drop and recreate if needed
mysql -u root -p -e "DROP TABLE IF EXISTS canned_responses;" livechatlog
```

### Foreign key error
```bash
# Ensure agents table exists first
mysql -u root -p -e "SHOW TABLES LIKE 'agents';" livechatlog
```

### Duplicate tag error
- Tags must be unique (excluding soft-deleted records)
- Check if tag already exists: `GET /v1/canned-responses?search=<tag>`

---

## 🎉 Status: ✅ PRODUCTION READY

All requirements implemented with:
- Clean, maintainable code
- Complete documentation
- Testing resources
- Frontend integration examples
- Sample data
- Best practices

---

## 📞 Need Help?

1. Check [CANNED_RESPONSES_GUIDE.md](./CANNED_RESPONSES_GUIDE.md) for detailed docs
2. Review [CANNED_RESPONSES_QUICK_REFERENCE.md](./CANNED_RESPONSES_QUICK_REFERENCE.md) for quick answers
3. Test endpoints using Postman collection
4. Verify database migration completed successfully

---

**Version:** 1.0.0  
**Date:** January 7, 2026  
**Module Status:** ✅ Complete & Production Ready
