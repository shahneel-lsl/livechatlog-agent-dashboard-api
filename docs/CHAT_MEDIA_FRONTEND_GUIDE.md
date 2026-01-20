# Chat Media - Frontend Implementation Guide

## Overview

This guide explains how to implement media sharing (images, videos, GIFs, documents) in your LiveChatLog chat interface. The system follows **LiveChat Inc's architecture** with real-time Firebase synchronization.

## Architecture

### How It Works

```
1. Agent/Visitor uploads file → API uploads to Firebase Storage
2. API creates Event with attachment in metadata
3. API syncs to Firebase Realtime Database
4. Frontend listens to Firebase → Displays media in real-time
```

### Data Structure

**Event with Media:**
```typescript
{
  id: "event-uuid",
  threadId: "thread-uuid",
  type: "message",
  authorType: "agent" | "visitor" | "system",
  content: "Optional caption text",
  metadata: {
    hasMedia: true,
    mediaType: "image" | "video" | "document" | "gif",
    attachments: [
      {
        id: "file-uuid",
        type: "image",
        name: "screenshot.png",
        url: "https://firebasestorage.googleapis.com/...",
        size: 245760,
        mimeType: "image/png",
        storagePath: "conversations/conv-id/media/file.png"
      }
    ]
  },
  createdAt: "2026-01-14T10:00:00Z"
}
```

## Frontend Implementation

### 1. Firebase Setup (Same as before)

```typescript
// firebase-config.ts
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onChildAdded, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: "your-api-key",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, onChildAdded, push };
```

### 2. Listen for Messages (Including Media)

```typescript
// hooks/useConversationMessages.ts
import { useEffect, useState } from 'react';
import { database, ref, onChildAdded } from '../firebase-config';

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'gif';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface Message {
  id: string;
  threadId: string;
  content: string;
  authorType: 'agent' | 'visitor' | 'system';
  type: 'message' | 'system';
  createdAt: string;
  agentId?: string;
  agentName?: string;
  metadata?: {
    hasMedia?: boolean;
    mediaType?: string;
    attachments?: MediaAttachment[];
  };
}

export function useConversationMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    const messagesRef = ref(database, `conversations/${conversationId}/messages`);
    
    // Listen for new messages
    const unsubscribe = onChildAdded(messagesRef, (snapshot) => {
      const message = snapshot.val() as Message;
      
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    });

    return () => unsubscribe();
  }, [conversationId]);

  return messages;
}
```

### 3. Send Media Component

```typescript
// components/MediaUpload.tsx
import React, { useState } from 'react';
import axios from 'axios';

interface MediaUploadProps {
  conversationId: string;
  authToken: string;
  onSuccess?: () => void;
}

export function MediaUpload({ conversationId, authToken, onSuccess }: MediaUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);

    // Generate preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);
      formData.append('authorType', 'agent'); // or 'visitor'

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/conversations/${conversationId}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Media uploaded:', response.data);
      
      // Reset form
      setFile(null);
      setCaption('');
      setPreview(null);
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="media-upload">
      <input
        type="file"
        onChange={handleFileSelect}
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        disabled={uploading}
      />

      {preview && (
        <div className="preview">
          <img src={preview} alt="Preview" style={{ maxWidth: '200px' }} />
        </div>
      )}

      {file && (
        <div className="file-info">
          <p>📎 {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
          
          <input
            type="text"
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={uploading}
          />

          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 4. Display Media Messages

```typescript
// components/MessageItem.tsx
import React from 'react';

interface MessageItemProps {
  message: {
    id: string;
    content: string;
    authorType: 'agent' | 'visitor' | 'system';
    agentName?: string;
    createdAt: string;
    metadata?: {
      hasMedia?: boolean;
      mediaType?: string;
      attachments?: Array<{
        id: string;
        type: string;
        name: string;
        url: string;
        size: number;
        mimeType: string;
      }>;
    };
  };
}

export function MessageItem({ message }: MessageItemProps) {
  const isAgent = message.authorType === 'agent';
  const hasMedia = message.metadata?.hasMedia;

  return (
    <div className={`message ${isAgent ? 'agent' : 'visitor'}`}>
      <div className="message-header">
        <span className="author">
          {message.authorType === 'system' ? 'System' : 
           message.agentName || 'Visitor'}
        </span>
        <span className="time">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Render Media Attachments */}
      {hasMedia && message.metadata?.attachments?.map((attachment) => (
        <div key={attachment.id} className="attachment">
          {attachment.type === 'image' || attachment.type === 'gif' ? (
            <img 
              src={attachment.url} 
              alt={attachment.name}
              style={{ maxWidth: '100%', borderRadius: '8px' }}
              loading="lazy"
            />
          ) : attachment.type === 'video' ? (
            <video 
              src={attachment.url} 
              controls 
              style={{ maxWidth: '100%', borderRadius: '8px' }}
            >
              Your browser does not support video.
            </video>
          ) : (
            <a 
              href={attachment.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="document-link"
            >
              📄 {attachment.name} ({(attachment.size / 1024).toFixed(2)} KB)
            </a>
          )}
        </div>
      ))}

      {/* Render Caption */}
      {message.content && (
        <div className="message-content">
          {message.content}
        </div>
      )}
    </div>
  );
}
```

### 5. Complete Chat Component

```typescript
// components/ChatWindow.tsx
import React from 'react';
import { useConversationMessages } from '../hooks/useConversationMessages';
import { MessageItem } from './MessageItem';
import { MediaUpload } from './MediaUpload';

interface ChatWindowProps {
  conversationId: string;
  authToken: string;
}

export function ChatWindow({ conversationId, authToken }: ChatWindowProps) {
  const messages = useConversationMessages(conversationId);

  return (
    <div className="chat-window">
      {/* Messages List */}
      <div className="messages-container">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>

      {/* Media Upload */}
      <div className="chat-input">
        <MediaUpload 
          conversationId={conversationId}
          authToken={authToken}
        />
      </div>
    </div>
  );
}
```

## API Reference

### 1. Send Media to Conversation

**Endpoint:** `POST /v1/conversations/:conversationId/media`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (required): The media file
- `caption` (optional): Text caption
- `authorType` (optional): `agent` | `visitor` | `system` (default: `agent`)

**Supported File Types:**
- **Images:** JPG, PNG, GIF, WEBP
- **Videos:** MP4, MOV, AVI, WEBM
- **Documents:** PDF, DOC, DOCX, XLS, XLSX, TXT, CSV

**Max Size:** 10MB

**Example (Fetch):**
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('caption', 'Check this out!');
formData.append('authorType', 'agent');

const response = await fetch(
  `${API_URL}/v1/conversations/${conversationId}/media`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  }
);

const data = await response.json();
console.log('Media sent:', data);
```

**Example (Axios):**
```typescript
import axios from 'axios';

const formData = new FormData();
formData.append('file', file);
formData.append('caption', 'Look at this!');

const { data } = await axios.post(
  `${API_URL}/v1/conversations/${conversationId}/media`,
  formData,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  }
);
```

**Response:**
```json
{
  "id": "event-uuid",
  "threadId": "thread-uuid",
  "type": "message",
  "authorType": "agent",
  "content": "Check this out!",
  "metadata": {
    "attachments": [
      {
        "id": "file-uuid",
        "type": "image",
        "name": "photo.jpg",
        "url": "https://firebasestorage.googleapis.com/...",
        "size": 245760,
        "mimeType": "image/jpeg",
        "storagePath": "conversations/conv-id/media/file.jpg"
      }
    ],
    "hasMedia": true,
    "mediaType": "image"
  },
  "agentId": "agent-uuid",
  "createdAt": "2026-01-14T10:00:00.000Z"
}
```

### 2. Send Media to Specific Thread

**Endpoint:** `POST /v1/threads/:threadId/media?conversationId=<conv-id>`

Same as above, but targets a specific thread. Requires `conversationId` query parameter.

### 3. Get All Media from Conversation

**Endpoint:** `GET /v1/conversations/:conversationId/media`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "event-1",
    "threadId": "thread-uuid",
    "content": "Image caption",
    "metadata": {
      "attachments": [...],
      "hasMedia": true
    },
    "createdAt": "2026-01-14T10:00:00.000Z"
  }
]
```

### 4. Delete Media

**Endpoint:** `DELETE /v1/events/:eventId/media/:attachmentId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`

## Real-Time Behavior

### Firebase Message Structure

Messages appear in Firebase at:
```
conversations/
  └── {conversationId}/
      └── messages/
          └── {messageId}/
              ├── id
              ├── threadId
              ├── content
              ├── authorType
              ├── type
              ├── createdAt
              ├── agentId
              ├── agentName
              └── metadata
                  ├── hasMedia: true
                  ├── mediaType: "image"
                  └── attachments: [...]
```

### Listening for New Media

Your existing message listener automatically receives media messages:

```typescript
onChildAdded(messagesRef, (snapshot) => {
  const message = snapshot.val();
  
  // Check if it's a media message
  if (message.metadata?.hasMedia) {
    console.log('New media received:', message.metadata.mediaType);
    // Render media attachment
  }
});
```

## Styling Examples

### CSS for Media Messages

```css
.message {
  margin: 10px;
  padding: 10px;
  border-radius: 8px;
  max-width: 70%;
}

.message.agent {
  background: #e3f2fd;
  margin-left: auto;
}

.message.visitor {
  background: #f5f5f5;
  margin-right: auto;
}

.attachment {
  margin: 10px 0;
}

.attachment img,
.attachment video {
  max-width: 100%;
  border-radius: 8px;
  cursor: pointer;
}

.document-link {
  display: inline-block;
  padding: 10px 15px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
}

.document-link:hover {
  background: #f9f9f9;
}

.message-content {
  margin-top: 8px;
  color: #333;
}
```

## Error Handling

### Common Errors

**1. File Too Large**
```json
{
  "message": "File size exceeds 10MB limit",
  "error": "Bad Request",
  "statusCode": 400
}
```

**2. Invalid File Type**
```json
{
  "message": "File type 'application/zip' not allowed...",
  "error": "Bad Request",
  "statusCode": 400
}
```

**3. No Active Thread**
```json
{
  "message": "No active thread found. Conversation may be closed.",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Handle Errors in Frontend

```typescript
try {
  await uploadMedia();
} catch (error: any) {
  if (error.response?.status === 400) {
    const message = error.response.data.message;
    
    if (message.includes('size exceeds')) {
      alert('File is too large. Max 10MB.');
    } else if (message.includes('not allowed')) {
      alert('File type not supported.');
    } else {
      alert(message);
    }
  } else {
    alert('Upload failed. Please try again.');
  }
}
```

## Advanced Features

### Image Lightbox

```typescript
import React, { useState } from 'react';

function ImageAttachment({ url, name }: { url: string; name: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <img
        src={url}
        alt={name}
        onClick={() => setLightboxOpen(true)}
        style={{ cursor: 'pointer', maxWidth: '100%' }}
      />

      {lightboxOpen && (
        <div className="lightbox" onClick={() => setLightboxOpen(false)}>
          <img src={url} alt={name} />
        </div>
      )}
    </>
  );
}
```

### Download Progress

```typescript
async function uploadWithProgress(file: File, conversationId: string) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axios.post(
    `${API_URL}/v1/conversations/${conversationId}/media`,
    formData,
    {
      headers: { 'Authorization': `Bearer ${token}` },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        console.log(`Upload: ${percentCompleted}%`);
        // Update UI progress bar
      },
    }
  );

  return data;
}
```

### Media Gallery View

```typescript
function MediaGallery({ conversationId, authToken }: Props) {
  const [media, setMedia] = useState([]);

  useEffect(() => {
    axios.get(
      `${API_URL}/v1/conversations/${conversationId}/media`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    ).then(res => setMedia(res.data));
  }, [conversationId]);

  return (
    <div className="media-gallery">
      {media.map(event => 
        event.metadata.attachments.map(att => (
          <div key={att.id} className="gallery-item">
            {att.type === 'image' && <img src={att.url} alt={att.name} />}
            {att.type === 'video' && <video src={att.url} controls />}
          </div>
        ))
      )}
    </div>
  );
}
```

## Testing

### Postman Collection

Import the collection from:
```
postman/Chat_Media_API.postman_collection.json
```

**Variables to set:**
- `base_url`: Your API URL
- `authToken`: JWT token from login
- `conversationId`: A valid conversation ID

### Test Flow

1. **Login** → Get auth token
2. **Get Conversations** → Get conversation ID
3. **Send Image** → Upload image with caption
4. **Get Thread Events** → Verify image appears
5. **Get Media** → See all media in conversation
6. **Delete Media** → Remove attachment

## Production Considerations

### 1. File Size Limits
- Current: 10MB
- Adjust in controller `FileInterceptor` if needed
- Consider video compression for large files

### 2. Storage Costs
- Firebase Storage free tier: 5GB storage, 1GB/day transfer
- Monitor usage in Firebase Console
- Consider CDN for high traffic

### 3. Security
- Validate file types on backend ✅ (already implemented)
- Scan for malware in production
- Use signed URLs for private files (method available)

### 4. Performance
- Use lazy loading for images
- Implement pagination for media gallery
- Compress images client-side before upload

### 5. Accessibility
- Add alt text for images
- Provide download links for all media
- Support keyboard navigation

## Summary

✅ **Backend Ready:**
- Media upload endpoints
- Firebase Storage integration
- Real-time sync to Firebase Database

✅ **Frontend Implementation:**
1. Use existing Firebase listener (works for media)
2. Add media upload component with file picker
3. Render media based on `attachment.type`
4. Display images, videos, documents appropriately

✅ **Real-Time:**
- Media messages sync instantly via Firebase
- No polling needed
- Works exactly like text messages

✅ **Testing:**
- Import Postman collection
- Test all media types
- Verify real-time delivery

---

**Need Help?**
- Check [Chat_Media_API.postman_collection.json](../postman/Chat_Media_API.postman_collection.json)
- Review error messages in API responses
- Test with Postman before frontend implementation
