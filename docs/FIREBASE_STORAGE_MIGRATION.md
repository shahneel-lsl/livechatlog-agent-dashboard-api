# Firebase Storage Migration

## Overview

The document upload system has been migrated from **Google Cloud Storage** to **Firebase Storage** for better integration with our existing Firebase infrastructure.

## What Changed

### 1. Storage Backend
- **Before:** Google Cloud Storage (GCS) with separate credentials
- **After:** Firebase Storage using existing Firebase Admin SDK

### 2. Configuration

**Old Environment Variables (Removed):**
```env
GCS_PROJECT_ID=your-gcs-project-id
GCS_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="..."
GCS_BUCKET_NAME=livechatlog-documents
```

**New Environment Variable (Added):**
```env
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### 3. Database Schema

**Updated GroupDocument Entity:**
```typescript
// Old fields
gcsPath: string;        // ❌ Removed
gcsBucket: string;      // ❌ Removed

// New fields
storagePath: string;    // ✅ Added - Path in Firebase Storage
storageBucket: string;  // ✅ Added - Bucket name from config
```

### 4. File URLs

**Before (GCS):**
```
https://storage.googleapis.com/livechatlog-documents/groups/123/documents/file.pdf
```

**After (Firebase Storage):**
```
https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/groups%2F123%2Fdocuments%2Ffile.pdf?alt=media
```

### 5. Code Changes

**Removed Files:**
- `src/config/gcs.service.ts` - GCS service
- `src/config/gcs.module.ts` - GCS module

**Modified Files:**
- `src/firebase/firebase.service.ts` - Added Storage methods
- `src/groups/group-document.service.ts` - Now uses FirebaseService
- `src/groups/groups.module.ts` - Removed GcsModule import
- `src/app.module.ts` - Removed GcsModule from imports
- `src/database/mysql/group-document.entity.ts` - Updated field names

## Firebase Storage Methods

The `FirebaseService` now includes these storage methods:

### uploadFile(file, folder)
Uploads a file to Firebase Storage and returns metadata.

**Parameters:**
- `file`: File buffer and metadata (from Multer)
- `folder`: Storage folder path (e.g., "groups/123/documents")

**Returns:**
```typescript
{
  fileName: string;      // Generated unique filename
  fileUrl: string;       // Public URL to access the file
  storagePath: string;   // Full path in storage bucket
}
```

### deleteFile(storagePath)
Deletes a file from Firebase Storage.

**Parameters:**
- `storagePath`: Full path to the file in storage

**Returns:** Promise<void>

### getSignedUrl(storagePath, expiresInMinutes)
Generates a temporary signed URL for private file access.

**Parameters:**
- `storagePath`: Full path to the file
- `expiresInMinutes`: URL validity duration (default: 60)

**Returns:** Promise<string> - Signed URL

### fileExists(storagePath)
Checks if a file exists in storage.

**Parameters:**
- `storagePath`: Full path to the file

**Returns:** Promise<boolean>

## Migration Steps (For Existing Projects)

If you have existing documents in GCS, follow these steps:

### 1. Update Environment Variables
```bash
# Remove GCS variables from .env
# Add Firebase Storage bucket
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### 2. Update Database Schema
Run this SQL to rename columns:
```sql
ALTER TABLE group_documents 
  CHANGE COLUMN gcsPath storagePath VARCHAR(500),
  CHANGE COLUMN gcsBucket storageBucket VARCHAR(255);
```

### 3. Migrate Existing Files (Optional)
If you have files in GCS, you can:

**Option A: Keep them in GCS**
- Update `storagePath` values to match GCS paths
- Manually update `fileUrl` to GCS URLs
- Documents will still be accessible

**Option B: Copy to Firebase Storage**
```javascript
// Pseudo-code for migration script
const documents = await getDocumentsFromGCS();
for (const doc of documents) {
  const file = await downloadFromGCS(doc.gcsPath);
  const result = await uploadToFirebase(file, doc.folder);
  await updateDatabase(doc.id, result);
}
```

### 4. Test Upload/Download
- Upload a new document via API
- Verify the file appears in Firebase Console
- Test file download via returned URL

## Benefits of Firebase Storage

1. **Unified Authentication**: Same credentials as Firebase Realtime Database
2. **Simplified Configuration**: One set of environment variables
3. **Better Integration**: Native Firebase Admin SDK support
4. **Free Tier**: 5GB storage + 1GB/day downloads free
5. **CDN**: Built-in global CDN for fast file access
6. **Security Rules**: Fine-grained access control (optional)

## API Compatibility

The API endpoints remain **unchanged**:
- `POST /v1/groups/:groupId/documents` - Upload
- `GET /v1/groups/:groupId/documents` - List
- `GET /v1/documents/:id` - Get single
- `DELETE /v1/documents/:id` - Delete

Response structure is also the same, just field names updated:
- `gcsPath` → `storagePath`
- `gcsBucket` → `storageBucket`

## Testing

Import the updated Postman collection:
```
postman/Group_Documents_API.postman_collection.json
```

All endpoints have been updated with Firebase Storage references.

## Troubleshooting

### Issue: "Storage bucket not configured"
**Solution:** Ensure `FIREBASE_STORAGE_BUCKET` is set in `.env`

### Issue: "Permission denied"
**Solution:** Verify Firebase service account has Storage Admin role

### Issue: "File not found after upload"
**Solution:** Check Firebase Console > Storage to verify file exists

### Issue: "URL returns 404"
**Solution:** Ensure file is set to public read or use signed URLs

## Support

For issues or questions:
1. Check Firebase Console > Storage for uploaded files
2. Review `FirebaseService` logs for error messages
3. Verify environment variables are correct
4. Test with Postman collection

## References

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [GROUP_DOCUMENTS_API.md](./GROUP_DOCUMENTS_API.md) - API documentation
