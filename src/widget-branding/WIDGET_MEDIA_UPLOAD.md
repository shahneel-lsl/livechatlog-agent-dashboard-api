# Widget Media Upload API

## Overview

The Widget Media Upload API allows you to upload images (logos, icons, and other images) to Firebase Storage and get public URLs that can be used in the Widget Branding API.

## Features

- ✅ Upload images to Firebase Storage
- ✅ Organized folder structure (`widget_media/logos`, `widget_media/icons`, `widget_media/images`)
- ✅ Automatic file naming with UUID + timestamp
- ✅ Public URL generation
- ✅ File validation (type, size)
- ✅ Delete uploaded media

## API Endpoints

### 1. Upload Widget Media (Generic)
**POST** `/v1/widget-media/upload`

Upload any widget media with optional type specification.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file` (file, required): Image file to upload
- `mediaType` (text, optional): Type of media - `logo`, `icon`, or `image` (default: `image`)

**Response:**
```json
{
  "fileName": "a1b2c3d4-e5f6-7890-abcd-ef1234567890_1737849600000.png",
  "fileUrl": "https://storage.googleapis.com/your-bucket/widget_media/logos/a1b2c3d4-e5f6-7890-abcd-ef1234567890_1737849600000.png",
  "storagePath": "widget_media/logos/a1b2c3d4-e5f6-7890-abcd-ef1234567890_1737849600000.png",
  "mimeType": "image/png",
  "fileSize": 45678
}
```

### 2. Upload Logo
**POST** `/v1/widget-media/upload-logo`

Dedicated endpoint for uploading company logos.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file` (file, required): Logo image file

### 3. Upload Icon
**POST** `/v1/widget-media/upload-icon`

Dedicated endpoint for uploading widget button icons.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file` (file, required): Icon image file

### 4. Delete Media
**DELETE** `/v1/widget-media`

Delete uploaded media from Firebase Storage.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "storagePath": "widget_media/logos/a1b2c3d4-e5f6-7890-abcd-ef1234567890_1737849600000.png"
}
```

## File Requirements

### Allowed File Types
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- SVG (`.svg`)
- WEBP (`.webp`)

### Size Limit
- Maximum file size: **5 MB**

## Usage Workflow

### Step 1: Upload Media

Upload your logo or icon:

```bash
curl -X POST \
  http://localhost:3000/v1/widget-media/upload-logo \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'file=@/path/to/your/logo.png'
```

### Step 2: Get the URL

Response:
```json
{
  "fileUrl": "https://storage.googleapis.com/your-bucket/widget_media/logos/abc123.png"
}
```

### Step 3: Use in Widget Branding

Use the `fileUrl` in your widget branding configuration:

```bash
curl -X PUT \
  http://localhost:3000/v1/widget-branding/group/GROUP_ID \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "logoUrl": "https://storage.googleapis.com/your-bucket/widget_media/logos/abc123.png",
    "buttonIconUrl": "https://storage.googleapis.com/your-bucket/widget_media/icons/xyz789.png"
  }'
```

## Storage Structure

Files are organized in Firebase Storage as follows:

```
widget_media/
├── logos/
│   ├── uuid1_timestamp1.png
│   ├── uuid2_timestamp2.svg
│   └── ...
├── icons/
│   ├── uuid3_timestamp3.png
│   ├── uuid4_timestamp4.svg
│   └── ...
└── images/
    ├── uuid5_timestamp5.jpg
    ├── uuid6_timestamp6.png
    └── ...
```

## Error Handling

### Common Errors

**400 Bad Request - No file provided**
```json
{
  "statusCode": 400,
  "message": "No file provided"
}
```

**400 Bad Request - File size too large**
```json
{
  "statusCode": 400,
  "message": "File size exceeds 5MB limit"
}
```

**400 Bad Request - Invalid file type**
```json
{
  "statusCode": 400,
  "message": "Invalid file type. Allowed types: JPEG, JPG, PNG, GIF, SVG, WEBP"
}
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Best Practices

1. **Optimize Images**: Compress images before uploading to reduce file size
2. **Use Appropriate Formats**: 
   - PNG for logos with transparency
   - SVG for scalable icons
   - JPEG for photos
   - WEBP for modern browsers
3. **Recommended Sizes**:
   - Logo: 200x200px to 400x400px
   - Button Icon: 64x64px to 128x128px
   - Images: Up to 1920x1080px
4. **Delete Old Files**: Remove unused media to save storage space
5. **Use CDN**: The Firebase Storage URLs are CDN-enabled for fast delivery

## Integration Examples

### JavaScript/Fetch

```javascript
async function uploadLogo(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:3000/v1/widget-media/upload-logo', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  
  const result = await response.json();
  return result.fileUrl;
}

// Usage
const logoUrl = await uploadLogo(logoFile);
console.log('Logo uploaded:', logoUrl);
```

### React Example

```jsx
import { useState } from 'react';

function LogoUploader() {
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/v1/widget-media/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      setLogoUrl(data.fileUrl);
      alert('Logo uploaded successfully!');
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {uploading && <p>Uploading...</p>}
      {logoUrl && <img src={logoUrl} alt="Uploaded logo" />}
    </div>
  );
}
```

## Postman Testing

Import the `Widget-Branding-API.postman_collection.json` file to test all media upload endpoints with pre-configured requests.

## Support

For issues or questions, please contact the development team or refer to the main Widget Branding API documentation.
