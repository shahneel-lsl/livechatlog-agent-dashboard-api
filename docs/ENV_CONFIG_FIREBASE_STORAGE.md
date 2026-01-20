# Firebase Storage - Environment Configuration

## Required Environment Variable

Add this to your `.env` file:

```env
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

## How to Find Your Storage Bucket Name

### Method 1: Firebase Console (Recommended)
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click "Storage" in the left sidebar
4. Look at the top of the page - you'll see your bucket name
5. It's usually in format: `your-project-id.appspot.com`

### Method 2: From Service Account JSON
If you have your Firebase service account JSON file:
```json
{
  "project_id": "your-project-id",
  "storage_bucket": "your-project-id.appspot.com",  ← This is it!
  ...
}
```

### Method 3: From Project Settings
1. Firebase Console → Project Settings
2. General tab
3. Under "Your project" section
4. Look for "Storage bucket" field

## Full Firebase Configuration

Your `.env` should have these Firebase variables:

```env
# Firebase Realtime Database
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com

# Firebase Project
FIREBASE_PROJECT_ID=your-project-id

# Firebase Service Account
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"

# Firebase Storage (NEWLY ADDED)
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

## Common Mistakes

### ❌ Wrong Format
```env
# DON'T include https://
FIREBASE_STORAGE_BUCKET=https://your-project.appspot.com

# DON'T add trailing slash
FIREBASE_STORAGE_BUCKET=your-project.appspot.com/

# DON'T use full URL
FIREBASE_STORAGE_BUCKET=https://firebasestorage.googleapis.com/v0/b/...
```

### ✅ Correct Format
```env
# Just the bucket name
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

## Testing Your Configuration

### 1. Check Environment Variable Loads
```typescript
// In your code or console
console.log(process.env.FIREBASE_STORAGE_BUCKET);
// Should output: your-project.appspot.com
```

### 2. Test Upload
```bash
# Upload a test file
curl -X POST http://localhost:3000/v1/groups/{groupId}/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf"
```

### 3. Check Firebase Console
After successful upload:
1. Go to Firebase Console → Storage
2. You should see a `groups/` folder
3. Inside: `groups/{groupId}/documents/{filename}`

## Troubleshooting

### Error: "FIREBASE_STORAGE_BUCKET is not defined"
**Solution:** 
1. Add the variable to `.env`
2. Restart your server
3. Make sure `.env` file is in project root

### Error: "The caller does not have permission"
**Solution:**
1. Go to Firebase Console → IAM & Admin
2. Find your service account
3. Add role: "Storage Object Admin"

### Error: "Bucket not found"
**Solution:**
1. Verify bucket name is correct (no typos)
2. Make sure Storage is enabled in Firebase Console
3. Check if you're using the right Firebase project

### Files Upload But Can't Access URLs
**Solution:**
1. Firebase Console → Storage → Rules
2. Update rules to allow public read:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;  // Public read
      allow write: if false; // Only via Admin SDK
    }
  }
}
```

## Production Deployment

### Development vs Production

**Development (.env):**
```env
FIREBASE_STORAGE_BUCKET=your-project-dev.appspot.com
```

**Production (.env.production):**
```env
FIREBASE_STORAGE_BUCKET=your-project-prod.appspot.com
```

### Deployment Checklist
- [ ] Update production `.env` file
- [ ] Remove old GCS variables (GCS_PROJECT_ID, GCS_BUCKET_NAME, etc.)
- [ ] Test upload in production
- [ ] Verify files appear in Firebase Console
- [ ] Check file URLs are accessible
- [ ] Monitor storage usage

## Storage Limits

### Firebase Storage Free Tier
- Storage: 5 GB
- Downloads: 1 GB/day
- Uploads: 20k/day

### When You Exceed Free Tier
- Storage: $0.026/GB/month
- Downloads: $0.12/GB
- Uploads: $0.05/GB

Monitor usage: Firebase Console → Usage and billing

## Security Best Practices

### 1. Storage Rules (Firebase Console)
```javascript
// Recommended: Only Admin SDK can write
service firebase.storage {
  match /b/{bucket}/o {
    match /groups/{groupId}/{allPaths=**} {
      allow read: if true;
      allow write: if false; // Only backend can upload
    }
  }
}
```

### 2. Environment Variables
- Never commit `.env` to git
- Use different buckets for dev/staging/prod
- Rotate service account keys periodically

### 3. File Validation
Already implemented in code:
- Max 10MB file size
- Allowed MIME types only
- Unique filenames prevent overwrites

## Next Steps

1. ✅ Add `FIREBASE_STORAGE_BUCKET` to your `.env`
2. ✅ Restart your development server
3. ✅ Test upload via Postman
4. ✅ Verify file in Firebase Console
5. ✅ Integrate into frontend

## Quick Reference

**Environment Variable:**
```env
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

**Test Upload:**
```bash
curl -X POST localhost:3000/v1/groups/GROUP_ID/documents \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@test.pdf"
```

**Verify Upload:**
https://console.firebase.google.com/ → Storage → groups/

---

**Need Help?** 
- Check [FIREBASE_STORAGE_QUICK_START.md](./FIREBASE_STORAGE_QUICK_START.md)
- Review [FIREBASE_STORAGE_MIGRATION.md](./FIREBASE_STORAGE_MIGRATION.md)
- See [GROUP_DOCUMENTS_API.md](./GROUP_DOCUMENTS_API.md) for API details
