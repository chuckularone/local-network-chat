# Chat API Documentation

The chat server provides REST API endpoints for posting messages and photos programmatically.

## Base URL

```
http://localhost:3000
```

Replace `localhost` with your server's IP address if accessing from another machine.

## Authentication

All POST endpoints require username and password authentication in the request body.

## Endpoints

### 1. Post a Message

Send a text message to the chat.

**Endpoint:** `POST /api/message`

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password",
  "message": "Hello from the API!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Message posted successfully"
}
```

**Error Responses:**
- `400`: Missing required fields
- `401`: Invalid username or password
- `500`: Server error

**Example (curl):**
```bash
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password","message":"Hello from curl!"}'
```

**Example (browser fetch):**
```javascript
fetch('http://localhost:3000/api/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'your_username',
    password: 'your_password',
    message: 'Hello from browser!'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

### 2. Post a Photo

Upload and share a photo with optional caption.

**Endpoint:** `POST /api/photo`

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password",
  "photo": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "caption": "Optional caption text"
}
```

**Photo Format:**
- Must be a base64-encoded data URL
- Format: `data:image/[type];base64,[base64data]`
- Supported types: jpeg, png, gif, webp
- Max size: ~5MB recommended

**Success Response (200):**
```json
{
  "success": true,
  "message": "Photo posted successfully"
}
```

**Error Responses:**
- `400`: Missing required fields
- `401`: Invalid username or password
- `500`: Server error

**Example (Python with base64):**
```python
import base64
import json
import urllib.request

# Read and encode image
with open('image.jpg', 'rb') as f:
    image_data = base64.b64encode(f.read()).decode('utf-8')

photo_url = f"data:image/jpeg;base64,{image_data}"

data = {
    "username": "your_username",
    "password": "your_password",
    "photo": photo_url,
    "caption": "My photo from Python"
}

req = urllib.request.Request(
    'http://localhost:3000/api/photo',
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

with urllib.request.urlopen(req) as response:
    print(response.read().decode('utf-8'))
```

---

### 3. Get Chat History

Retrieve the chat history (last 100 messages and photos).

**Endpoint:** `GET /api/history`

**Authentication:** Not required (read-only)

**Success Response (200):**
```json
{
  "success": true,
  "history": [
    {
      "type": "message",
      "id": 1,
      "username": "alice",
      "message": "Hello!",
      "caption": null,
      "photo": null,
      "timestamp": "Feb 12, 3:45 PM"
    },
    {
      "type": "photo",
      "id": 2,
      "username": "bob",
      "message": null,
      "caption": "Check this out",
      "photo": "data:image/jpeg;base64,...",
      "timestamp": "Feb 12, 3:46 PM"
    }
  ]
}
```

**Example (curl):**
```bash
curl http://localhost:3000/api/history
```

**Example (browser):**
```javascript
fetch('http://localhost:3000/api/history')
  .then(res => res.json())
  .then(data => console.log(data.history));
```

---

## Using the Provided Scripts

### Bash Script (Linux/Mac)

1. Edit `post-message.sh` and set your username and password
2. Make it executable: `chmod +x post-message.sh`
3. Run: `./post-message.sh "Your message here"`

### Python Script (All platforms)

1. Edit `post-message.py` and set your username and password
2. Post a message: `python3 post-message.py "Your message here"`
3. Post a photo: `python3 post-message.py --photo image.jpg "Optional caption"`

---

## Rate Limiting

Currently no rate limiting is implemented. Messages and photos are broadcast to all connected clients in real-time.

## Security Notes

- Always use HTTPS in production
- Credentials are sent in plain text over HTTP (use only on trusted local networks)
- Consider implementing API tokens for automation instead of passwords
- The API uses the same authentication as the web interface

## Real-time Updates

Messages posted via the API are immediately broadcast to all connected WebSocket clients. Users in the web interface will see API-posted messages in real-time without refreshing.
