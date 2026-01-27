# Pre-Chat Form Module - Quick Reference

## 📁 Files Created

### Entities (Database)
- `src/database/mysql/prechat-form.entity.ts`
- `src/database/mysql/prechat-form-field.entity.ts`
- `src/database/mysql/conversation-prechat-snapshot.entity.ts`
- `src/database/mysql/conversation-prechat-answer.entity.ts`

### Module Files
- `src/prechat/prechat.module.ts`
- `src/prechat/prechat.service.ts`
- `src/prechat/prechat-admin.controller.ts` (Protected)
- `src/prechat/prechat-widget.controller.ts` (Public)

### DTOs
- `src/prechat/dto/create-prechat-form.dto.ts`
- `src/prechat/dto/update-prechat-form.dto.ts`
- `src/prechat/dto/submit-prechat-form.dto.ts`

### Documentation
- `src/prechat/PRECHAT_API_DOCUMENTATION.md`

### Updated Files
- `src/app.module.ts` (Added PrechatModule)

---

## 🚀 Quick Start

### 1. Start the application
```bash
npm run start:dev
```

TypeORM will auto-create these tables:
- `prechat_forms`
- `prechat_form_fields`
- `conversation_prechat_snapshots`
- `conversation_prechat_answers`

### 2. Create a form (requires JWT token)
```bash
POST http://localhost:3000/v1/prechat/admin/forms
Authorization: Bearer YOUR_TOKEN

{
  "groupId": "your-group-uuid",
  "title": "Support Form",
  "isRequired": true,
  "fields": [
    {"label": "Name", "type": "text", "isRequired": true},
    {"label": "Email", "type": "email", "isRequired": true}
  ]
}
```

### 3. Widget gets form (public)
```bash
GET http://localhost:3000/v1/prechat/widget/groups/{groupId}/form
```

### 4. Widget submits form (public)
```bash
POST http://localhost:3000/v1/prechat/widget/submit

{
  "formId": "form-uuid",
  "visitorId": "visitor-uuid",
  "answers": [
    {"fieldId": "field-uuid", "value": "John Doe"}
  ]
}
```

---

## 🎯 Key Endpoints

### Agent Dashboard (Protected)
- `POST /v1/prechat/admin/forms` - Create form
- `GET /v1/prechat/admin/forms` - List all forms
- `GET /v1/prechat/admin/forms/:id` - Get form
- `PATCH /v1/prechat/admin/forms/:id` - Update form
- `DELETE /v1/prechat/admin/forms/:id` - Delete form
- `GET /v1/prechat/admin/conversations/:id/prechat` - View submission

### Widget (Public)
- `GET /v1/prechat/widget/groups/:groupId/form` - Get group form
- `POST /v1/prechat/widget/submit` - Submit form
- `GET /v1/prechat/widget/conversations/:id/prechat` - View submission
- `GET /v1/prechat/widget/conversations/:id/has-prechat` - Check status

---

## ✅ Features Implemented

- ✅ LiveChat-exact behavior (one submission per conversation)
- ✅ Per-group form configuration
- ✅ Required/optional field support
- ✅ Immutable snapshots & answers
- ✅ Agent endpoints protected by JWT
- ✅ Widget endpoints public
- ✅ TypeORM entities with proper relationships
- ✅ Full validation with class-validator
- ✅ Soft delete for forms
- ✅ 7 field types supported

---

## 🔒 Security

- Agent endpoints: `@UseGuards(JwtAuthGuard)`
- Widget endpoints: Public (no guard)
- Validation: All DTOs use `class-validator`

---

## 📊 Database Schema

```
prechat_forms (1) ──< (M) prechat_form_fields
                |
                └──── (via groupId)
                
conversation_prechat_snapshots (1:1) ──< conversations
                                      |
                                      └──< (M) conversation_prechat_answers
```

---

## 🧪 Testing Checklist

- [ ] Create form via admin endpoint
- [ ] Retrieve form by group ID
- [ ] Submit form from widget
- [ ] Verify conversation created
- [ ] Check snapshot immutability
- [ ] Update form (verify old conversations unchanged)
- [ ] Test required field validation
- [ ] Test optional field handling
- [ ] Verify one-submission-per-conversation constraint

---

## 📝 Next Steps

1. **Test the endpoints** using Postman or curl
2. **Integrate with widget UI** to display forms
3. **Add to agent dashboard UI** for form management
4. **Test validation** with various field types
5. **Monitor TypeORM** table creation on first run

---

## 🐛 Troubleshooting

**Tables not created?**
- Check `synchronize: true` in TypeORM config
- Restart the app

**JWT errors?**
- Use existing auth flow to get token
- Test with valid agent JWT

**Validation errors?**
- Check DTO structure matches examples
- Ensure all required fields present

---

## 📚 Full Documentation

See [PRECHAT_API_DOCUMENTATION.md](./PRECHAT_API_DOCUMENTATION.md) for:
- Complete API reference
- Request/response examples
- Business rules
- Field types
- Error handling
