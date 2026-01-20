# Group Document Management API

## Overview

This API allows you to manage documents for groups with Firebase Storage integration. Each API call uploads a single document (no multiple file uploads).

## Features

- ✅ Single file upload per request
- ✅ Files stored in Firebase Storage
- ✅ Support for multiple file types (PDF, DOC, Excel, Images, Videos, etc.)
- ✅ 10MB file size limit
- ✅ Document metadata stored in MySQL
- ✅ Soft delete with cloud storage cleanup
- ✅ Document statistics

## API Endpoints

### 1. Upload Document

**Endpoint:** `POST /v1/groups/:groupId/documents`

**Authentication:** Required (JWT Bearer Token)

**Content-Type:** `multipart/form-data`

**Request:**
```
POST /v1/groups/{groupId}/documents
Content-Type: multipart/form-data

file: [binary file data]
```

**Allowed File Types:**
- PDF (application/pdf)
- Word Documents (DOC, DOCX)
- Excel Files (XLS, XLSX)
- Text Files (TXT, CSV)
- Images (JPG, PNG, GIF)

**Max File Size:** 10MB

**Response:**
```json
{
  "id": "doc-uuid",
  "groupId": "group-uuid",
  "fileName": "abc123_1705234567890.pdf",
  "originalFileName": "document.pdf",
  "fileUrl": "https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/groups%2Fgroup-uuid%2Fdocuments%2Fabc123_1705234567890.pdf?alt=media",
  "mimeType": "application/pdf",
  "fileSize": 524288,
  "storagePath": "groups/group-uuid/documents/abc123_1705234567890.pdf",
  "storageBucket": "your-project.appspot.com",
  "uploadedBy": "agent-uuid",
  "createdAt": "2026-01-14T10:00:00Z"
}
```

### 2. Get All Documents for Group

**Endpoint:** `GET /v1/groups/:groupId/documents`

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "doc-uuid-1",
    "groupId": "group-uuid",
    "fileName": "abc123_1705234567890.pdf",
    "originalFileName": "document.pdf",
    "fileUrl": "https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/groups%2F...?alt=media",
    "mimeType": "application/pdf",
    "fileSize": 524288,
    "uploadedBy": "agent-uuid",
    "uploader": {
      "id": "agent-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2026-01-14T10:00:00Z"
  }
]
```

### 3. Delete Document

**Endpoint:** `DELETE /v1/groups/documents/:documentId`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Note:** This permanently deletes the file from Google Cloud Storage and soft-deletes the database record.

## Environment Variables

Add these to your `.env` file:

```env
# Google Cloud Storage Configuration
GCS_PROJECT_ID=your-project-id
GCS_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
GCS_BUCKET_NAME=livechatlog-documents
```

## Google Cloud Storage Setup

### 1. Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin > Service Accounts
3. Click "Create Service Account"
4. Give it a name (e.g., "livechatlog-storage")
5. Grant it "Storage Admin" role
6. Create a key (JSON format)
7. Download the JSON file

### 2. Extract Credentials

From the downloaded JSON file, extract:
- `project_id` → `GCS_PROJECT_ID`
- `client_email` → `GCS_CLIENT_EMAIL`
- `private_key` → `GCS_PRIVATE_KEY`

### 3. Create Storage Bucket

1. Go to Cloud Storage > Buckets
2. Click "Create Bucket"
3. Name it (e.g., "livechatlog-documents")
4. Choose region
5. Set access control to "Fine-grained"
6. Create the bucket

## Database Migration

Run this SQL to create the documents table:

```sql
CREATE TABLE `group_documents` (
  `id` varchar(36) NOT NULL,
  `groupId` varchar(36) NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `originalFileName` varchar(255) NOT NULL,
  `fileUrl` text NOT NULL,
  `mimeType` varchar(100) NOT NULL,
  `fileSize` bigint NOT NULL,
  `storagePath` varchar(500) DEFAULT NULL,
  `storageBucket` varchar(255) DEFAULT NULL,
  `uploadedBy` varchar(36) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_group_documents_groupId` (`groupId`),
  KEY `FK_group_documents_uploadedBy` (`uploadedBy`),
  CONSTRAINT `FK_group_documents_groupId` FOREIGN KEY (`groupId`) REFERENCES `groups` (`id`),
  CONSTRAINT `FK_group_documents_uploadedBy` FOREIGN KEY (`uploadedBy`) REFERENCES `agents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Usage Examples

### Upload with cURL

```bash
curl -X POST "http://localhost:3000/v1/groups/{groupId}/documents" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

### Upload with Axios (Frontend)

```typescript
const uploadDocument = async (groupId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `/v1/groups/${groupId}/documents`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data;
};
```

### React Component Example

```tsx
import React, { useState } from 'react';

const DocumentUpload = ({ groupId }: { groupId: string }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/groups/${groupId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      console.log('Upload successful:', result);
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
};
```

## Error Handling

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | No file uploaded | File not provided in request |
| 400 | File size exceeds 10MB limit | File too large |
| 400 | Invalid file type | Unsupported file format |
| 404 | Group not found | Invalid group ID |
| 401 | Unauthorized | Invalid or missing JWT token |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "File size exceeds 10MB limit",
  "error": "Bad Request"
}
```

## Postman Collection

Import the Postman collection from:
```
postman/Group_Documents_API.postman_collection.json
```

**Variables to set:**
- `base_url`: Your API base URL (e.g., http://localhost:3000)
- `authToken`: Your JWT token (auto-set after login)
- `groupId`: Group ID for document upload

## API Response Times

- Upload: ~2-5 seconds (depends on file size)
- Get documents: ~100-300ms
- Delete: ~1-2 seconds (includes cloud deletion)

## Storage Structure

Files are organized in Google Cloud Storage as:
```
livechatlog-documents/
  groups/
    {groupId}/
      documents/
        {uuid}_{timestamp}.{ext}
        {uuid}_{timestamp}.{ext}
```

## Security Considerations

1. **Authentication:** All endpoints require JWT authentication
2. **File Validation:** Only whitelisted MIME types accepted
3. **Size Limits:** Hard limit of 10MB per file
4. **Soft Delete:** Documents are soft-deleted for audit trail
5. **Cloud Permissions:** Service account has minimal required permissions

## Monitoring

Track these metrics:
- Upload success/failure rates
- Storage usage per group
- Average file sizes
- Most common file types
- Upload times

Use the stats endpoint:
```
GET /v1/groups/{groupId}/documents/stats
```

## Troubleshooting

### Upload fails with GCS error

Check:
1. GCS credentials in .env are correct
2. Service account has Storage Admin role
3. Bucket exists and is accessible
4. Private key format (ensure \n is properly escaped)

### File not accessible after upload

Check:
1. Bucket permissions
2. File is set to public (optional)
3. CORS settings if accessing from browser

### Database errors

Check:
1. group_documents table exists
2. Foreign key constraints are valid
3. Agent has permission to upload
