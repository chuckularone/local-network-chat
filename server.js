const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Database file path
const DB_PATH = 'chat.db';

// Initialize SQLite database
let db;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('Created new database');
  }

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      photo TEXT NOT NULL,
      caption TEXT,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database initialized');
}

// Save database to file
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save every 5 seconds if there are changes
let hasChanges = false;
setInterval(() => {
  if (hasChanges) {
    saveDatabase();
    hasChanges = false;
  }
}, 5000);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and authenticated sockets
const users = new Map();
const authenticatedSockets = new Set();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user registration
  socket.on('register', async (data) => {
    const { username, password } = data;
    
    // Validate input
    if (!username || !password || username.length < 3 || password.length < 6) {
      socket.emit('register failed', 'Username must be 3+ characters and password 6+ characters');
      return;
    }

    try {
      // Check if username already exists
      const checkUser = db.exec('SELECT username FROM users WHERE username = ?', [username]);
      if (checkUser.length > 0 && checkUser[0].values.length > 0) {
        socket.emit('register failed', 'Username already taken');
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new user
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
      hasChanges = true;
      
      authenticatedSockets.add(socket.id);
      socket.emit('register success', username);
      console.log('User registered:', username);
    } catch (error) {
      console.error('Registration error:', error);
      socket.emit('register failed', 'Registration failed');
    }
  });

  // Handle user login
  socket.on('login', async (data) => {
    const { username, password } = data;
    
    try {
      // Get user from database
      const result = db.exec('SELECT username, password FROM users WHERE username = ?', [username]);
      
      if (result.length === 0 || result[0].values.length === 0) {
        socket.emit('login failed', 'Invalid username or password');
        return;
      }

      const user = result[0].values[0];
      const storedPassword = user[1];
      
      // Verify password
      const isValid = await bcrypt.compare(password, storedPassword);
      
      if (isValid) {
        authenticatedSockets.add(socket.id);
        socket.emit('login success', username);
        console.log('User logged in:', username);
      } else {
        socket.emit('login failed', 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      socket.emit('login failed', 'Login failed');
    }
  });

  // Handle user joining (only if authenticated)
  socket.on('join', (username) => {
    if (!authenticatedSockets.has(socket.id)) {
      socket.emit('auth required');
      return;
    }
    
    users.set(socket.id, username);
    io.emit('user joined', {
      username,
      userCount: users.size
    });
    console.log(`${username} joined. Total users: ${users.size}`);

    // Send chat history to the newly joined user
    try {
      // Get messages with a type indicator
      const messagesResult = db.exec(`
        SELECT 'message' as type, id, username, message as content, NULL as caption, NULL as photo, timestamp, created_at 
        FROM messages
        UNION ALL
        SELECT 'photo' as type, id, username, NULL as content, caption, photo, timestamp, created_at 
        FROM photos
        ORDER BY created_at ASC
        LIMIT 100
      `);
      
      const history = messagesResult.length > 0 
        ? messagesResult[0].values.map(row => ({
            type: row[0],
            id: row[1],
            username: row[2],
            message: row[3],
            caption: row[4],
            photo: row[5],
            timestamp: row[6]
          }))
        : [];
      
      socket.emit('chat history', history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  });

  // Handle chat messages (only if authenticated)
  socket.on('chat message', (data) => {
    if (!authenticatedSockets.has(socket.id)) {
      socket.emit('auth required');
      return;
    }

    const now = new Date();
    const messageData = {
      username: data.username,
      message: data.message,
      timestamp: now.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };

    // Save to database
    try {
      db.run('INSERT INTO messages (username, message, timestamp) VALUES (?, ?, ?)', 
        [messageData.username, messageData.message, messageData.timestamp]);
      hasChanges = true;
    } catch (error) {
      console.error('Error saving message:', error);
    }
    
    io.emit('chat message', messageData);
  });

  // Handle photo messages (only if authenticated)
  socket.on('photo message', (data) => {
    if (!authenticatedSockets.has(socket.id)) {
      socket.emit('auth required');
      return;
    }

    const now = new Date();
    const photoData = {
      username: data.username,
      photo: data.photo,
      caption: data.caption,
      timestamp: now.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };

    // Save to database
    try {
      db.run('INSERT INTO photos (username, photo, caption, timestamp) VALUES (?, ?, ?, ?)',
        [photoData.username, photoData.photo, photoData.caption, photoData.timestamp]);
      hasChanges = true;
    } catch (error) {
      console.error('Error saving photo:', error);
    }
    
    io.emit('photo message', photoData);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      io.emit('user left', {
        username,
        userCount: users.size
      });
      console.log(`${username} left. Total users: ${users.size}`);
    }
    authenticatedSockets.delete(socket.id);
  });
});

const PORT = 3000;

// Initialize database then start server
initDatabase().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat server running on port ${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    
    // Get local IP address
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    Object.keys(networkInterfaces).forEach((interfaceName) => {
      networkInterfaces[interfaceName].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`Network access: http://${iface.address}:${PORT}`);
        }
      });
    });
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  saveDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
