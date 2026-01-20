# Firebase Storage Quick Start Guide

## Setup (5 Minutes)

### 1. Get Firebase Credentials

Go to [Firebase Console](https://console.firebase.google.com/):
1. Select your project
2. Click ⚙️ Settings → Project Settings
3. Go to "Service Accounts" tab
4. Click "Generate new private key"
5. Save the JSON file

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# Firebase Configuration
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

**Important:** 
- Copy values from the downloaded JSON file
- Keep `FIREBASE_PRIVATE_KEY` in quotes with `\n` for line breaks
- Don't include `https://` in `FIREBASE_STORAGE_BUCKET`

### 3. Start the Server

```bash
npm install
npm run start:dev
```

### 4. Test Upload

Use this curl command (replace values):

```bash
curl -X POST http://localhost:3000/v1/groups/YOUR_GROUP_ID/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

**Success Response:**
```json
{
  "id": "doc-uuid",
  "groupId": "group-uuid",
  "fileName": "abc123_1705234567890.pdf",
  "originalFileName": "document.pdf",
  "fileUrl": "https://firebasestorage.googleapis.com/...",
  "mimeType": "application/pdf",
  "fileSize": 524288,
  "storagePath": "groups/group-uuid/documents/abc123_1705234567890.pdf",
  "uploadedBy": "agent-uuid",
  "createdAt": "2024-01-14T10:00:00Z"
}
```

## Quick API Reference

### Upload Document
```
POST /v1/groups/:groupId/documents
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: file (file upload)
```

### List Group Documents
```
GET /v1/groups/:groupId/documents
Authorization: Bearer <token>
```

### Get Document Details
```
GET /v1/documents/:id
Authorization: Bearer <token>
```

### Delete Document
```
DELETE /v1/documents/:id
Authorization: Bearer <token>
```

## File Restrictions

✅ **Allowed Types:**
- PDF (application/pdf)
- Word (application/msword, .docx)
- Excel (application/vnd.ms-excel, .xlsx)
- Text (text/plain, text/csv)
- Images (image/jpeg, image/png, image/gif)
- Videos (video/mp4, video/quicktime for MOV)

⚠️ **Max Size:** 10MB per file

## Common Issues

### ❌ "Invalid file type"
**Fix:** Only upload supported file types (see list above)

### ❌ "File too large"
**Fix:** Compress file or upload files under 10MB

### ❌ "Unauthorized"
**Fix:** Include valid JWT token in Authorization header

### ❌ "Group not found"
**Fix:** Verify the groupId exists in your database

### ❌ "Storage bucket not configured"
**Fix:** Set `FIREBASE_STORAGE_BUCKET` in `.env` file

## View Uploaded Files

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click "Storage" in the left menu
4. Navigate to `groups/` folder
5. See all uploaded documents organized by group

## Frontend Integration

### React/Next.js Example

```typescript
async function uploadDocument(groupId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/v1/groups/${groupId}/documents`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return await response.json();
}

// Usage
const file = document.getElementById('fileInput').files[0];
const result = await uploadDocument('group-123', file);
console.log('Uploaded:', result.fileUrl);
```

### Display Document List

```typescript
async function getGroupDocuments(groupId: string) {
  const response = await fetch(
    `${API_BASE_URL}/v1/groups/${groupId}/documents`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  return await response.json();
}

// Usage
const documents = await getGroupDocuments('group-123');
documents.forEach(doc => {
  console.log(`${doc.originalFileName} - ${doc.fileUrl}`);
});
```

## Postman Testing

1. Import collection: `postman/Group_Documents_API.postman_collection.json`
2. Set variables:
   - `{{base_url}}`: Your API URL (e.g., http://localhost:3000)
   - `{{authToken}}`: Your JWT token
   - `{{groupId}}`: A valid group ID
3. Run "Upload Document" request
4. Verify response has `fileUrl`
5. Open `fileUrl` in browser to download file

## Next Steps

- Read full API docs: [GROUP_DOCUMENTS_API.md](./GROUP_DOCUMENTS_API.md)
- Learn about migration: [FIREBASE_STORAGE_MIGRATION.md](./FIREBASE_STORAGE_MIGRATION.md)
- Explore Firebase Console to manage uploaded files
- Set up Firebase Security Rules for fine-grained access control

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify Firebase credentials are correct
3. Ensure database is running and migrations applied
4. Test with Postman collection first
5. Check Firebase Console > Storage for uploaded files

---

**Ready to upload!** 🚀

Start with the Postman collection to verify everything works, then integrate into your frontend.
