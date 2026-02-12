# Local Network Chat App

A feature-rich real-time chat application for communication between machines on the same local network with user accounts, persistent history, and media sharing.

## Features

- **User accounts** - Register your own username and password
- **Secure authentication** - Passwords are hashed with bcrypt
- **"Remain logged in"** - Optional auto-login saves your session in the browser
- **REST API** - Post messages and photos from command line or scripts
- **Persistent chat history** - Messages and photos saved in SQLite database
- **Photo sharing** - Upload and share images with optional captions
- **Emoji picker** - Express yourself with emojis organized by category
- **Real-time messaging** - Instant message delivery using WebSockets
- **Multiple users** - Connect simultaneously from different devices
- **User presence** - Shows when users join/leave and current user count
- **Timestamps** - Every message shows date and time
- **Logout option** - Manual logout button in chat header
- **Clean interface** - Modern, responsive design works on any device

## How It Works

Users create their own accounts with username and password. All passwords are securely hashed before being stored in the database. Once logged in, users can send messages and photos that are saved to the chat history.

The app stores:
- User accounts (usernames and hashed passwords)
- Last 100 messages and photos (interleaved chronologically)
- Auto-login sessions in browser localStorage (if enabled)

Chat history persists even when the server restarts!

## Setup Instructions

### 1. Install Node.js
If you don't have Node.js installed, download it from https://nodejs.org/

### 2. Install Dependencies
Open a terminal in this directory and run:
```bash
npm install
```

This will install all required packages. **No compilation needed!** - sql.js is pure JavaScript.

### 3. Start the Server
```bash
npm start
```

The server will start and display URLs like:
```
Chat server running on port 3000
Local access: http://localhost:3000
Network access: http://192.168.1.XXX:3000
```

### 4. Connect from Other Machines

On the **same machine** (server):
- Open a browser and go to `http://localhost:3000`

On **other machines** on the same network:
- Open a browser and go to the "Network access" URL shown (e.g., `http://192.168.1.XXX:3000`)
- Make sure all machines are on the same WiFi/network

### 5. Create Account and Start Chatting!

**First time users:**
- Click "Register here"
- Create a username (3+ characters) and password (6+ characters)
- You'll be automatically logged in and can start chatting

**Returning users:**
- Enter your username and password
- Check "Remain logged in" to auto-login next time
- Click "Login"
- Start sending messages and photos!

**Chat features:**
- Type messages and press Send or Enter
- Click the 📷 camera button to upload and share photos
- Click the 😊 emoji button to add emojis to your messages
- Click on any shared photo to view it full-screen
- Click "Logout" in the top-right to manually log out

## Using the API

The chat includes REST API endpoints for posting messages and photos programmatically.

### Quick Start

**Post a message from command line:**
```bash
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password","message":"Hello from API!"}'
```

**Post a message from browser console:**
```javascript
fetch('http://localhost:3000/api/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'your_username',
    password: 'your_password',
    message: 'Hello from browser!'
  })
}).then(res => res.json()).then(console.log);
```

**Using the provided scripts:**
1. Edit `post-message.sh` or `post-message.py` with your username/password
2. Bash: `./post-message.sh "Your message"`
3. Python: `python3 post-message.py "Your message"`
4. Python (photo): `python3 post-message.py --photo image.jpg "Caption"`

For complete API documentation, see [API.md](API.md)

### Available Endpoints

- `POST /api/message` - Post a text message
- `POST /api/photo` - Post a photo with optional caption  
- `GET /api/history` - Get chat history (last 100 items)

All messages posted via API appear in real-time to web users!

## Configuration

### Changing the Port

If port 3000 is already in use or you want to use a different port:

1. Open `server.js`
2. Find line 274 (near the bottom):
   ```javascript
   const PORT = 3000;
   ```
3. Change `3000` to your desired port number (e.g., `3001`, `8080`, etc.)
4. Save the file and restart the server

The server will now run on your new port. Update the URL you use to connect accordingly (e.g., `http://localhost:8080`).

## Troubleshooting

**Can't connect from another machine?**
- Make sure both machines are on the same network
- Check if your firewall is blocking the port (default 3000)
- On Windows: Allow Node.js through Windows Firewall
- On Mac: System Preferences > Security & Privacy > Firewall
- Try temporarily disabling the firewall to test

**Port already in use?**
- Change the PORT in server.js (see Configuration section above)
- Or stop any other service using that port

**Auto-login not working?**
- Make sure you checked "Remain logged in" during login
- Check if browser is blocking localStorage
- Try logging out and logging in again with the checkbox enabled
- Clearing browser data will clear saved sessions

**Chat history not loading?**
- Check that the `chat.db` file exists in the same directory as `server.js`
- Look at the server console for any database errors
- Try stopping the server and restarting it

## Database Management

The app uses two separate SQLite database files:
- **users.db** - Stores user accounts (usernames and hashed passwords)
- **chat.db** - Stores messages and photos

Both files are located in the same directory as server.js.

**To clear chat history only (keep users):**
1. Stop the server (Ctrl+C)
2. Delete the `chat.db` file
3. Restart the server - a new empty chat database will be created
4. All users can still log in with their existing accounts

**To clear user accounts only (keep chat history):**
1. Stop the server (Ctrl+C)
2. Delete the `users.db` file
3. Restart the server - a new empty users database will be created
4. Chat history remains, but all users will need to re-register

**To clear everything:**
1. Stop the server (Ctrl+C)
2. Delete both `users.db` and `chat.db` files
3. Restart the server - fresh start!

**To backup:**
- **User accounts**: Copy `users.db` to a safe location
- **Chat history**: Copy `chat.db` to a safe location
- **Everything**: Copy both files

**Database contents:**
- **users.db**: User accounts with hashed passwords
- **chat.db**: Last 100 messages and photos (you can modify this limit in server.js line 349)

**To remove saved auto-login sessions:**
- Click the Logout button in the chat
- Or clear your browser's localStorage/site data

## Technical Details

### Stack
- **server.js**: Node.js server using Express and Socket.IO with SQLite databases
- **public/index.html**: Web client interface with vanilla JavaScript
- **users.db**: SQLite database for user accounts (auto-created on first run)
- **chat.db**: SQLite database for messages and photos (auto-created on first run)
- **WebSockets**: Enable real-time bidirectional communication
- **sql.js**: Pure JavaScript SQLite library (no compilation needed!)
- **bcryptjs**: Secure password hashing library

### Security Notes
- Passwords are hashed with bcrypt (10 rounds) before storage
- Auto-login stores only the username in localStorage (no password)
- Socket authentication is verified on every message
- SQL injection protection through parameterized queries

### Browser Compatibility
Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile, etc.)

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## File Structure
```
local-network-chat/
├── server.js              # Node.js server with Socket.IO and SQLite
├── package.json           # Dependencies list
├── users.db               # User accounts database (auto-created)
├── chat.db                # Chat history database (auto-created)
├── post-message.sh        # Bash script for posting via API
├── post-message.py        # Python script for posting via API
├── API.md                 # Complete API documentation
├── public/
│   └── index.html         # Client web interface
└── README.md              # This file
```

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Look at the server console for error messages
3. Open browser DevTools (F12) and check the Console tab for client-side errors

## License

This is a local network chat application for personal/private use.
