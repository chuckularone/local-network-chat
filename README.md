# Local Network Chat App

A simple real-time chat application for communication between machines on the same local network with password protection.

## Features

- **Password protected** - Keep your chat private
- **Persistent chat history** - Messages and photos saved in SQLite database
- **Photo sharing** - Upload and share images with optional captions
- **Emoji picker** - Express yourself with emojis
- Real-time messaging using WebSockets
- Multiple users can connect simultaneously
- Shows when users join/leave
- Displays user count
- Clean, modern interface
- Works on any device with a web browser

## How It Works

All chat messages and photos are automatically saved to a SQLite database (`chat.db`). When users join the chat, they'll see:
- The last 100 messages/photos

This means chat history persists even when the server restarts!

## Setup Instructions

### 1. Install Node.js
If you don't have Node.js installed, download it from https://nodejs.org/

### 2. Set Your Password
Open `server.js` and change line 10:
```javascript
const CHAT_PASSWORD = 'PASSWORD!';
```
Replace `'PASSWORD!'` with your desired password.

### 3. Install Dependencies
Open a terminal in this directory and run:
```bash
npm install
```

This will install all required packages. **No compilation needed!** - sql.js is pure JavaScript.

### 4. Start the Server
```bash
npm start
```

The server will start and display URLs like:
```
Chat server running on port 3000
Local access: http://localhost:3000
Network access: http://192.168.1.XXX:3000
```

### 5. Connect from Other Machines

On the **same machine** (server):
- Open a browser and go to `http://localhost:3000`

On **other machines** on the same network:
- Open a browser and go to the "Network access" URL shown (e.g., `http://192.168.1.XXX:3000`)
- Make sure all machines are on the same WiFi/network

### 6. Start Chatting!
- Enter the password you set in server.js
- Enter your name
- Click "Join Chat"
- Type messages and press Send or Enter
- Click the 📷 camera button to upload and share photos
- Click the 😊 emoji button to add emojis to your messages
- Click on any shared photo to view it full-screen

**Important:** Everyone needs to use the same password to access the chat!

## Troubleshooting

**Can't connect from another machine?**
- Make sure both machines are on the same network
- Check if your firewall is blocking port 3000
- On Windows: Allow Node.js through Windows Firewall
- On Mac: System Preferences > Security & Privacy > Firewall
- Try temporarily disabling the firewall to test

**Port already in use?**
- Change the PORT in server.js (line 222) to a different number like 3001

## Database Management

The chat history is stored in `chat.db` file in the same directory as server.js.

**To clear chat history:**
1. Stop the server (Ctrl+C)
2. Delete the `chat.db` file
3. Restart the server - a new empty database will be created

**To backup chat history:**
- Simply copy the `chat.db` file to a safe location

**Database limits:**
- Keeps last 50 text messages (older messages still in database but not shown)
- Keeps last 20 photos (older photos still in database but not shown)
- You can modify these limits in server.js (line 121)

## How It Works

- **server.js**: Node.js server using Express and Socket.IO with SQLite database
- **public/index.html**: Web client interface
- **chat.db**: SQLite database file (created automatically on first run)
- **WebSockets**: Enable real-time bidirectional communication
- **sql.js**: Pure JavaScript SQLite library (no compilation needed!)

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.
