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

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

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

// Connect to MongoDB
let db;
let client;

async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB with URI:', uri.replace(/:[^:]*?@/, ':*****@'));
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await client.connect();
    console.log('✅ Connected to MongoDB!');
    
    // List all databases to verify connection
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    console.log('Available databases:', dbList.databases.map(d => d.name));
    
    // Connect to the specific database
    db = client.db('SmartKidsTutoring');
    console.log(`✅ Using database: ${db.databaseName}`);
    
    // Verify the users collection exists
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Initialize MongoDB connection
connectToMongoDB();

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
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid email address' 
      });
    }
    
    // Save the contact form data to MongoDB
    const contact = {
      name,
      email,
      subject,
      message,
      createdAt: new Date(),
      status: 'new'
    };
    
    // Insert the contact into the 'contact' collection
    const result = await db.collection('contact').insertOne(contact);
    console.log(`New contact form submission from: ${name} (${email})`, result);
    
    res.status(200).json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    });
    
  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your message. Please try again later.'
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  console.log('\n=== Login Request ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  const { username, password } = req.body;
  
  try {
    console.log(`Login attempt for username: ${username}`);
    
    console.log('Looking up user in database...');
    const user = await db.collection('users').findOne({
      $or: [
        { username: { $regex: `^${username}$`, $options: 'i' } },
        { email: { $regex: `^${username}$`, $options: 'i' } }
      ]
    });
    
    if (!user) {
      console.log('No user found with username/email:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password'
      });
    }
    
    console.log('User found, comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password'
      });
    }
    
    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('Login successful for user:', user.username);
    
    // Ensure user object has required fields
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name || '',
      role: user.role || 'student',
      ...userWithoutPassword
    };
    
    // Determine redirect URL based on user role
    let redirectUrl = '/';
    if (user.role === 'tutor') {
      redirectUrl = '/tutor_dashboard.html';
    } else if (user.role === 'student') {
      redirectUrl = '/student_dashboard.html';
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: 'your-jwt-token-here',
      redirect: redirectUrl
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  console.log('\n=== Signup Request ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { name, email, username, password, role, subject, availability, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !username || !password || !role) {
      console.log('Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name, email, username, password, and role are required'
      });
    }
    
    // Check if username or email already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        { username: { $regex: `^${username}$`, $options: 'i' } },
        { email: { $regex: `^${email}$`, $options: 'i' } }
      ]
    });
    
    if (existingUser) {
      const field = existingUser.username.toLowerCase() === username.toLowerCase() ? 'username' : 'email';
      console.log(`User with this ${field} already exists`);
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user object
    const user = {
      name,
      email,
      username,
      password: hashedPassword,
      role,
      subject: subject || '',
      availability: availability || '',
      message: message || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert user into database
    const result = await db.collection('users').insertOne(user);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('User created successfully:', result.insertedId);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user account',
      error: error.message
    });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', async (req, res) => {
  console.log('\n=== Fetching all users ===');
  
  try {
    // In a real app, you would verify admin status here
    // For now, we'll just return all users
    const users = await db.collection('users').find({}).toArray();
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    console.log(`Found ${usersWithoutPasswords.length} users`);
    
    res.json({
      success: true,
      users: usersWithoutPasswords
    });
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Get assigned tutor for a student
app.get('/api/assigned-tutor/:username', async (req, res) => {
  const { username } = req.params;
  console.log(`\n=== Fetching assigned tutor for student: ${username} ===`);
  
  try {
    // First, find the student to get their assigned tutor
    const student = await db.collection('users').findOne({ 
      username: { $regex: `^${username}$`, $options: 'i' },
      role: 'student' 
    });
    
    if (!student) {
      console.log('Student not found');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // If student has an assigned tutor, get their details
    if (student.assignedTutor) {
      const tutor = await db.collection('users').findOne({
        username: { $regex: `^${student.assignedTutor}$`, $options: 'i' },
        role: 'tutor'
      });
      
      if (tutor) {
        // Remove sensitive data before sending
        const { password, ...tutorData } = tutor;
        console.log('Found assigned tutor:', tutor.username);
        return res.json({
          success: true,
          tutor: tutorData
        });
      }
    }
    
    // If no assigned tutor or tutor not found
    console.log('No assigned tutor found for student');
    res.json({
      success: true,
      tutor: null,
      message: 'No tutor assigned'
    });
    
  } catch (error) {
    console.error('❌ Error fetching assigned tutor:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned tutor',
      error: error.message
    });
  }
});

// Other API routes
app.use('/api', (req, res, next) => {
  // Handle other API routes here
  next();
});

// Start the server
app.listen(port, () => {
  console.log(`\n=== Server Started ===`);
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  console.log('Available endpoints:');
  console.log('- GET  /');
  console.log('- GET  /login');
  console.log('- GET  /signup');
  console.log('- GET  /contact');
  console.log('- GET  /products');
  console.log('====================\n');
});
