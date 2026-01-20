# Widget Branding Quick Start Guide

## Complete Setup in 3 Steps

### Step 1: Upload Your Logo & Icon

**Upload Logo:**
```bash
curl -X POST http://localhost:3000/v1/widget-media/upload-logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/logo.png"
```

**Response:**
```json
{
  "fileUrl": "https://storage.googleapis.com/bucket/widget_media/logos/uuid_timestamp.png"
}
```

**Upload Icon (optional):**
```bash
curl -X POST http://localhost:3000/v1/widget-media/upload-icon \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/icon.svg"
```

### Step 2: Create/Update Widget Branding

Use the uploaded URLs in your branding configuration:

```bash
curl -X PUT http://localhost:3000/v1/widget-branding/group/YOUR_GROUP_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brandTitle": "Customer Support",
    "companyName": "Your Company",
    "logoUrl": "https://storage.googleapis.com/bucket/widget_media/logos/uuid_timestamp.png",
    "buttonIconUrl": "https://storage.googleapis.com/bucket/widget_media/icons/uuid_timestamp.svg",
    "primaryColor": "#0084FF",
    "welcomeMessage": "Hello! How can we help you?",
    "position": "bottom_right",
    "theme": "light",
    "isActive": true
  }'
```

### Step 3: Fetch & Use Branding

**For Dashboard (Authenticated):**
```bash
curl -X GET http://localhost:3000/v1/widget-branding/group/YOUR_GROUP_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**For Widget (Public - No Auth):**
```bash
curl -X GET http://localhost:3000/v1/widget-branding/public/group/YOUR_GROUP_ID
```

## Using Postman

1. **Import Collection**: Import `Widget-Branding-API.postman_collection.json`
2. **Set Variables**:
   - `base_url`: `http://localhost:3000`
   - `access_token`: Your JWT token
   - `group_id`: Your group ID
3. **Run Requests** in order:
   - Upload Logo
   - Upload Icon
   - Create/Update Widget Branding (use uploaded URLs)
   - Fetch branding

## Minimal Setup Example

Don't need all features? Here's a minimal configuration:

```json
{
  "brandTitle": "Chat with us",
  "primaryColor": "#0084FF",
  "welcomeMessage": "Hi! How can we help?",
  "isActive": true
}
```

All other fields will use sensible defaults!

## Quick Tips

- ✅ Upload images first, then use the returned URLs
- ✅ Use PUT to create OR update (no need to check if exists)
- ✅ Max image size: 5MB
- ✅ Allowed formats: JPEG, PNG, GIF, SVG, WEBP
- ✅ Public endpoint requires no authentication
- ✅ One branding config per group

## Common Use Cases

### Update Just the Logo
```bash
curl -X PUT http://localhost:3000/v1/widget-branding/group/GROUP_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"logoUrl": "NEW_URL"}'
```

### Change Colors Only
```bash
curl -X PUT http://localhost:3000/v1/widget-branding/group/GROUP_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryColor": "#FF6B6B",
    "buttonColor": "#FF6B6B",
    "visitorBubbleColor": "#FF6B6B"
  }'
```

### Toggle Widget On/Off
```bash
curl -X PATCH http://localhost:3000/v1/widget-branding/BRANDING_ID/toggle-active \
  -H "Authorization: Bearer TOKEN"
```

## Need Help?

- 📖 Full API docs: See collection in Postman
- 📁 Media upload guide: `WIDGET_MEDIA_UPLOAD.md`
- 🎨 All customization options: Check entity file for 60+ settings
