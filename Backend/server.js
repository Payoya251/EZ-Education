require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Enable debug logging
process.env.DEBUG = 'app:*';

// Database configuration
const uri = process.env.MONGODB_URI || "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/SmartKidsTutoring?retryWrites=true&w=majority";
const dbName = process.env.DB_NAME || "SmartKidsTutoring";

if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set!");
    process.exit(1);
}

// CORS Configuration
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware to log all routes as they are registered
const originalUse = app.use;
const originalGet = app.get;
const originalPost = app.post;

app.use = function(...args) {
    console.log(`[ROUTE] Registering middleware for:`, args[0] || '/');
    return originalUse.apply(this, args);
};

app.get = function(path, ...handlers) {
    console.log(`[ROUTE] Registering GET: ${path}`);
    return originalGet.call(this, path, ...handlers);
};

app.post = function(path, ...handlers) {
    console.log(`[ROUTE] Registering POST: ${path}`);
    return originalPost.call(this, path, ...handlers);
};

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// MongoDB connection
let db;
async function connectToMongoDB() {
    try {
        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        
        await client.connect();
        db = client.db(dbName);
        
        console.log('✅ Connected to MongoDB!');
        
        // List all databases
        const adminDb = client.db().admin();
        const databases = await adminDb.listDatabases();
        console.log('Available databases:', databases.databases.map(d => d.name));
        
        // List collections in the current database
        const collections = await db.listCollections().toArray();
        console.log('Collections in database:', collections.map(c => c.name));
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// ======================
// API Routes
// ======================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tutor students endpoint
app.get('/api/tutor-students/:tutorUsername', async (req, res) => {
    try {
        const { tutorUsername } = req.params;
        
        console.log(`[DEBUG] ===== TUTOR STUDENTS REQUEST =====`);
        console.log(`[DEBUG] Tutor username: ${tutorUsername}`);
        
        if (!tutorUsername) {
            console.error('[ERROR] No tutorUsername provided in request');
            return res.status(400).json({
                success: false,
                message: 'Tutor username is required'
            });
        }
        
        // Find all students assigned to this tutor (case-insensitive match)
        const students = await db.collection('users').find({
            assignedTutor: { $regex: `^${tutorUsername}$`, $options: 'i' },
            role: 'student'
        }).toArray();
        
        // Return just the necessary student information
        const studentData = students.map(student => ({
            username: student.username,
            name: student.name || student.username,
            email: student.email
        }));
        
        console.log(`[DEBUG] Found ${studentData.length} students for tutor ${tutorUsername}`);
        
        res.json({
            success: true,
            students: studentData
        });
        
    } catch (error) {
        console.error('Error in /api/tutor-students:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching students',
            error: error.message
        });
    }
});

// ======================
// Static File Serving
// ======================

// Path configuration
const frontendPath = path.join(__dirname, '..', 'Frontend');
console.log('Frontend path:', frontendPath);

// Verify the frontend directory exists
if (!fs.existsSync(frontendPath)) {
  console.error('❌ Frontend path does not exist:', frontendPath);
  process.exit(1);
}
console.log('✅ Frontend path exists');

// Serve static files from the frontend directory
app.use(express.static(frontendPath));

// Route for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'Homepage.html'));
});

// Route for other HTML files
const htmlFiles = [
  'login',
  'signup',
  'contact',
  'products',
  'student_dashboard',
  'tutor_dashboard'
];

htmlFiles.forEach(file => {
  app.get(`/${file}`, (req, res) => {
    res.sendFile(path.join(frontendPath, `${file}.html`));
  });
});

// ======================
// API Routes (continued)
// ======================

// Contact form submission endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Save contact to database
    const result = await db.collection('contact').insertOne({
      name,
      email,
      subject,
      message,
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result.ops[0]
    });
  } catch (error) {
    console.error('Error saving contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

// Initialize MongoDB connection
connectToMongoDB();

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`\n=== Server Started ===`);
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  console.log('Available endpoints:');
  console.log('- GET  /');
  console.log('- GET  /login');
  console.log('- GET  /signup');
  console.log('- GET  /contact');
  console.log('- GET  /products');
  console.log('=====================');
});
