# Pre-Chat Form Module - Migration & Deployment Guide

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Review all entity files in `src/database/mysql/`
- [ ] Verify `app.module.ts` includes `PrechatModule`
- [ ] Check TypeORM config has `synchronize: true` (development)
- [ ] Test all endpoints locally using `prechat.http`
- [ ] Verify JWT authentication works
- [ ] Test required field validation
- [ ] Test immutability (update form, check old conversations)

### Development Deployment

```bash
# 1. Pull latest code
cd C:\Users\shahneel.ahmed.LSLOGICS\Documents\GitHub\livechatlog-agent-dashboard-api
git pull

# 2. Install dependencies (if any new packages added)
npm install

# 3. Start in development mode
npm run start:dev

# 4. Verify tables created
# Check MySQL for these new tables:
# - prechat_forms
# - prechat_form_fields
# - conversation_prechat_snapshots
# - conversation_prechat_answers
```

### Production Deployment

⚠️ **IMPORTANT for Production:**

```typescript
// In production, change TypeORM config:
// DO NOT use synchronize: true in production!

// Option 1: Generate migrations
npm run typeorm migration:generate -- -n AddPrechatTables

// Option 2: Manual migration SQL
// See MIGRATION.sql below
```

---

## 📊 Database Migration SQL (For Production)

If `synchronize: false` in production, run this SQL:

```sql
-- ==============================================
-- Pre-Chat Forms Tables Migration
-- ==============================================

-- Table: prechat_forms
CREATE TABLE IF NOT EXISTS `prechat_forms` (
  `id` VARCHAR(36) PRIMARY KEY,
  `groupId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `isRequired` BOOLEAN DEFAULT FALSE,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  INDEX `IDX_prechat_forms_groupId` (`groupId`),
  INDEX `IDX_prechat_forms_isActive` (`isActive`),
  CONSTRAINT `FK_prechat_forms_groupId` 
    FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) 
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: prechat_form_fields
CREATE TABLE IF NOT EXISTS `prechat_form_fields` (
  `id` VARCHAR(36) PRIMARY KEY,
  `formId` VARCHAR(36) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `type` ENUM('text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio') DEFAULT 'text',
  `isRequired` BOOLEAN DEFAULT FALSE,
  `placeholder` TEXT NULL,
  `options` JSON NULL,
  `order` INT DEFAULT 0,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX `IDX_prechat_form_fields_formId` (`formId`),
  INDEX `IDX_prechat_form_fields_order` (`order`),
  CONSTRAINT `FK_prechat_form_fields_formId` 
    FOREIGN KEY (`formId`) REFERENCES `prechat_forms`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: conversation_prechat_snapshots
CREATE TABLE IF NOT EXISTS `conversation_prechat_snapshots` (
  `id` VARCHAR(36) PRIMARY KEY,
  `conversationId` VARCHAR(36) NOT NULL UNIQUE,
  `formId` VARCHAR(36) NOT NULL,
  `formTitle` VARCHAR(255) NOT NULL,
  `formDescription` TEXT NULL,
  `fieldsSnapshot` JSON NOT NULL,
  `submittedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX `IDX_conversation_prechat_snapshots_conversationId` (`conversationId`),
  INDEX `IDX_conversation_prechat_snapshots_formId` (`formId`),
  CONSTRAINT `FK_conversation_prechat_snapshots_conversationId` 
    FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UQ_conversation_prechat_snapshots_conversationId` 
    UNIQUE (`conversationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: conversation_prechat_answers
CREATE TABLE IF NOT EXISTS `conversation_prechat_answers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `snapshotId` VARCHAR(36) NOT NULL,
  `fieldId` VARCHAR(36) NOT NULL,
  `fieldLabel` VARCHAR(255) NOT NULL,
  `value` TEXT NOT NULL,
  INDEX `IDX_conversation_prechat_answers_snapshotId` (`snapshotId`),
  CONSTRAINT `FK_conversation_prechat_answers_snapshotId` 
    FOREIGN KEY (`snapshotId`) REFERENCES `conversation_prechat_snapshots`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verify tables created
SHOW TABLES LIKE 'prechat_%';
SHOW TABLES LIKE 'conversation_prechat_%';
```

---

## 🔄 Rollback Plan

If something goes wrong:

```sql
-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS `conversation_prechat_answers`;
DROP TABLE IF EXISTS `conversation_prechat_snapshots`;
DROP TABLE IF EXISTS `prechat_form_fields`;
DROP TABLE IF EXISTS `prechat_forms`;
```

To rollback code:
```bash
# Remove module from app.module.ts
# Remove prechat/ folder
# Remove entity files
git revert <commit-hash>
```

---

## 🧪 Post-Deployment Testing

### 1. Verify Tables Created
```sql
-- Check table structure
DESCRIBE prechat_forms;
DESCRIBE prechat_form_fields;
DESCRIBE conversation_prechat_snapshots;
DESCRIBE conversation_prechat_answers;

-- Check indexes
SHOW INDEX FROM prechat_forms;
SHOW INDEX FROM conversation_prechat_snapshots;
```

### 2. Test API Endpoints

Use the provided `prechat.http` file:

```bash
# 1. Get JWT token
POST /v1/auth/login

# 2. Create a test form
POST /v1/prechat/admin/forms

# 3. Retrieve form
GET /v1/prechat/widget/groups/{groupId}/form

# 4. Submit form
POST /v1/prechat/widget/submit

# 5. View submission
GET /v1/prechat/admin/conversations/{id}/prechat
```

### 3. Verify Data Integrity

```sql
-- Check relationships
SELECT 
  f.id as form_id, 
  f.title, 
  COUNT(ff.id) as field_count
FROM prechat_forms f
LEFT JOIN prechat_form_fields ff ON ff.formId = f.id
GROUP BY f.id;

-- Check submissions
SELECT 
  s.id as snapshot_id,
  s.conversationId,
  s.formTitle,
  COUNT(a.id) as answer_count
FROM conversation_prechat_snapshots s
LEFT JOIN conversation_prechat_answers a ON a.snapshotId = s.id
GROUP BY s.id;
```

---

## 🔒 Security Checklist

- [ ] Admin endpoints require JWT (`@UseGuards(JwtAuthGuard)`)
- [ ] Widget endpoints are public (no sensitive data exposed)
- [ ] DTOs validate all input (`class-validator`)
- [ ] Database constraints prevent invalid data
- [ ] Foreign keys protect data integrity
- [ ] No SQL injection vulnerabilities (using TypeORM)
- [ ] Sensitive data not logged in production

---

## 📈 Monitoring & Logging

### What to Monitor

1. **API Latency**
   - Form creation time
   - Form submission time
   - Snapshot retrieval time

2. **Error Rates**
   - 400 errors (validation failures)
   - 404 errors (form not found)
   - 500 errors (server errors)

3. **Database Performance**
   - Query execution time
   - Table sizes
   - Index usage

### Logging Points

Add logging for:
```typescript
// In prechat.service.ts
this.logger.log(`Form created: ${form.id} for group: ${groupId}`);
this.logger.log(`Form submitted: ${snapshot.id} for conversation: ${conversationId}`);
this.logger.error(`Form submission failed: ${error.message}`, error.stack);
```

---

## 🎯 Performance Optimization

### Database Indexes

Already included in entities:
- `groupId` on `prechat_forms`
- `formId` on `prechat_form_fields`
- `conversationId` (UNIQUE) on `conversation_prechat_snapshots`
- `snapshotId` on `conversation_prechat_answers`

### Query Optimization

```typescript
// Use relations loading strategically
// Good: Load what you need
findOne({ where: { id }, relations: ['fields'] });

// Avoid: Loading unnecessary relations
findOne({ where: { id }, relations: ['fields', 'group', 'group.agents'] });
```

### Caching Considerations

Consider caching:
- Active forms by group (rarely changes)
- Form field structure (immutable after submission)

Do NOT cache:
- Conversation snapshots (unique per conversation)
- Submission data (privacy concern)

---

## 🔄 Future Enhancements

Potential features to add later:

1. **Form Templates**
   - Pre-built form templates
   - Copy form to another group

2. **Conditional Fields**
   - Show/hide fields based on previous answers
   - Dynamic form logic

3. **Field Validation Rules**
   - Min/max length
   - Regex patterns
   - Custom validation

4. **Analytics**
   - Form submission rates
   - Field completion rates
   - Drop-off analysis

5. **Multi-language Support**
   - Form title/description translations
   - Field label translations

6. **File Upload Fields**
   - Document attachments
   - Image uploads

7. **Form Versioning**
   - Track form changes
   - A/B testing

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: Tables not created**
```bash
# Solution: Check TypeORM config
# Ensure synchronize: true in development
# Manually run SQL in production
```

**Issue: JWT authentication fails**
```bash
# Solution: Verify JWT token
# Check token expiry
# Ensure JwtAuthGuard is properly configured
```

**Issue: Required field validation fails**
```bash
# Solution: Check DTO structure
# Ensure all required fields in request
# Verify field IDs match form fields
```

**Issue: "Conversation already has prechat"**
```bash
# Solution: One submission per conversation
# This is by design (UNIQUE constraint)
# Create new conversation for new submission
```

### Debug Mode

Enable TypeORM logging:
```typescript
// In mysql.config.ts
{
  logging: true, // Enable SQL logging
  logger: 'advanced-console',
}
```

---

## 📚 Documentation Links

Internal docs:
- [README.md](./README.md) - Quick reference
- [PRECHAT_API_DOCUMENTATION.md](./PRECHAT_API_DOCUMENTATION.md) - Full API docs
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - What was built

---

## ✅ Final Checklist

Before marking deployment complete:

- [ ] All 4 tables created successfully
- [ ] All 10 API endpoints working
- [ ] JWT authentication working on admin routes
- [ ] Widget routes accessible without auth
- [ ] Required field validation working
- [ ] Form submission creates conversation
- [ ] Snapshots are immutable
- [ ] Answers are immutable
- [ ] Soft delete working for forms
- [ ] Documentation complete
- [ ] Test file provided
- [ ] Team trained on new feature

---

## 🎉 Deployment Complete!

Once all checks pass:

1. ✅ Mark deployment as successful
2. 📝 Update team documentation
3. 🎓 Train support team on new feature
4. 📊 Set up monitoring dashboards
5. 🚀 Announce feature to users

**Module is production-ready!**
