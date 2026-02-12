const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 10 * 1024 * 1024  // 10MB limit for messages (to handle base64 photos)
});

// Middleware to parse JSON
app.use(express.json());

// Database file paths
const USERS_DB_PATH = 'users.db';
const CHAT_DB_PATH = 'chat.db';

// Initialize SQLite databases
let usersDb;
let chatDb;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load or create users database
  if (fs.existsSync(USERS_DB_PATH)) {
    const buffer = fs.readFileSync(USERS_DB_PATH);
    usersDb = new SQL.Database(buffer);
    console.log('Loaded existing users database');
  } else {
    usersDb = new SQL.Database();
    console.log('Created new users database');
  }

  // Create users table
  usersDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Load or create chat database
  if (fs.existsSync(CHAT_DB_PATH)) {
    const buffer = fs.readFileSync(CHAT_DB_PATH);
    chatDb = new SQL.Database(buffer);
    console.log('Loaded existing chat database');
  } else {
    chatDb = new SQL.Database();
    console.log('Created new chat database');
  }

  // Create messages and photos tables
  chatDb.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  chatDb.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      photo TEXT NOT NULL,
      caption TEXT,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Databases initialized');
}

// Save databases to files
function saveDatabase() {
  // Save users database
  const usersData = usersDb.export();
  const usersBuffer = Buffer.from(usersData);
  fs.writeFileSync(USERS_DB_PATH, usersBuffer);
  
  // Save chat database
  const chatData = chatDb.export();
  const chatBuffer = Buffer.from(chatData);
  fs.writeFileSync(CHAT_DB_PATH, chatBuffer);
}

// Auto-save every 5 seconds if there are changes
let hasUsersChanges = false;
let hasChatChanges = false;
setInterval(() => {
  if (hasUsersChanges || hasChatChanges) {
    saveDatabase();
    hasUsersChanges = false;
    hasChatChanges = false;
  }
}, 5000);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies for API requests
app.use(express.json({ limit: '10mb' }));

// API endpoint to post a message
app.post('/api/message', (req, res) => {
  const { username, password, message } = req.body;
  
  if (!username || !password || !message) {
    return res.status(400).json({ error: 'Missing required fields: username, password, message' });
  }

  // Verify user credentials
  try {
    const result = usersDb.exec('SELECT username, password FROM users WHERE username = ?', [username]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result[0].values[0];
    const storedPassword = user[1];
    
    // Verify password (async)
    bcrypt.compare(password, storedPassword).then(isValid => {
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Save and broadcast message
      const now = new Date();
      const messageData = {
        username,
        message,
        timestamp: now.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      };

      try {
        chatDb.run('INSERT INTO messages (username, message, timestamp) VALUES (?, ?, ?)', 
          [messageData.username, messageData.message, messageData.timestamp]);
        hasChatChanges = true;
        
        // Broadcast to all connected clients
        io.emit('chat message', messageData);
        
        res.json({ success: true, message: 'Message posted successfully' });
      } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
      }
    }).catch(err => {
      console.error('Password comparison error:', err);
      res.status(500).json({ error: 'Authentication error' });
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// API endpoint to post a photo
app.post('/api/photo', (req, res) => {
  const { username, password, photo, caption } = req.body;
  
  if (!username || !password || !photo) {
    return res.status(400).json({ error: 'Missing required fields: username, password, photo' });
  }

  // Verify user credentials
  try {
    const result = usersDb.exec('SELECT username, password FROM users WHERE username = ?', [username]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result[0].values[0];
    const storedPassword = user[1];
    
    // Verify password (async)
    bcrypt.compare(password, storedPassword).then(isValid => {
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Save and broadcast photo
      const now = new Date();
      const photoData = {
        username,
        photo,
        caption: caption || '',
        timestamp: now.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      };

      try {
        chatDb.run('INSERT INTO photos (username, photo, caption, timestamp) VALUES (?, ?, ?, ?)',
          [photoData.username, photoData.photo, photoData.caption, photoData.timestamp]);
        hasChatChanges = true;
        
        // Broadcast to all connected clients
        io.emit('photo message', photoData);
        
        res.json({ success: true, message: 'Photo posted successfully' });
      } catch (error) {
        console.error('Error saving photo:', error);
        res.status(500).json({ error: 'Failed to save photo' });
      }
    }).catch(err => {
      console.error('Password comparison error:', err);
      res.status(500).json({ error: 'Authentication error' });
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// API endpoint to get chat history
app.get('/api/history', (req, res) => {
  try {
    const messagesResult = chatDb.exec(`
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
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Parse JSON bodies for API requests
app.use(express.json());

// REST API endpoint for posting messages
app.post('/api/message', async (req, res) => {
  const { username, password, message } = req.body;

  // Validate input
  if (!username || !password || !message) {
    return res.status(400).json({ 
      error: 'Missing required fields: username, password, message' 
    });
  }

  try {
    // Verify user credentials
    const result = db.exec('SELECT username, password FROM users WHERE username = ?', [username]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result[0].values[0];
    const storedPassword = user[1];
    
    // Verify password
    const isValid = await bcrypt.compare(password, storedPassword);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create message
    const now = new Date();
    const messageData = {
      username: username,
      message: message,
      timestamp: now.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };

    // Save to database
    db.run('INSERT INTO messages (username, message, timestamp) VALUES (?, ?, ?)', 
      [messageData.username, messageData.message, messageData.timestamp]);
    hasChanges = true;

    // Broadcast to all connected clients
    io.emit('chat message', messageData);

    // Send success response
    res.json({ 
      success: true, 
      message: 'Message posted successfully',
      data: messageData
    });

  } catch (error) {
    console.error('API message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get chat history
app.get('/api/history', (req, res) => {
  try {
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
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('API history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
      const checkUser = usersDb.exec('SELECT username FROM users WHERE username = ?', [username]);
      if (checkUser.length > 0 && checkUser[0].values.length > 0) {
        socket.emit('register failed', 'Username already taken');
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new user
      usersDb.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
      hasUsersChanges = true;
      
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
      const result = usersDb.exec('SELECT username, password FROM users WHERE username = ?', [username]);
      
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

  // Handle auto-login from saved session
  socket.on('auto-login', (username) => {
    try {
      // Verify user exists in database
      const result = usersDb.exec('SELECT username FROM users WHERE username = ?', [username]);
      
      if (result.length > 0 && result[0].values.length > 0) {
        authenticatedSockets.add(socket.id);
        console.log('Auto-login successful:', username);
        socket.emit('auto-login success', username);
      } else {
        console.log('Auto-login failed - user not found:', username);
        socket.emit('auto-login failed');
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      socket.emit('auto-login failed');
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
      const messagesResult = chatDb.exec(`
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
      chatDb.run('INSERT INTO messages (username, message, timestamp) VALUES (?, ?, ?)', 
        [messageData.username, messageData.message, messageData.timestamp]);
      hasChatChanges = true;
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
      chatDb.run('INSERT INTO photos (username, photo, caption, timestamp) VALUES (?, ?, ?, ?)',
        [photoData.username, photoData.photo, photoData.caption, photoData.timestamp]);
      hasChatChanges = true;
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
