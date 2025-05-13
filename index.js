require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Configuration
const uri = "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/SmartKidsTutoring?retryWrites=true&w=majority";
const dbName = "SmartKidsTutoring";

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'Frontend')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Mongo Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Database connection
let db;
async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log("✅ Connected to MongoDB!");
    
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes('tutors')) {
      await db.createCollection('tutors');
      console.log("Created 'tutors' collection");
    }
    
    if (!collectionNames.includes('users')) {
      await db.createCollection('users');
      console.log("Created 'users' collection");
    }
    
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}
connectDB();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// Tutor application route
app.post('/api/tutors', async (req, res) => {
  const { name, email, subject, availability, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  try {
    const result = await db.collection("tutors").insertOne({
      name,
      email,
      subject,
      availability,
      message,
      submittedAt: new Date(),
    });
    res.status(200).json({ message: 'Application submitted successfully!' });
  } catch (err) {
    console.error("Error saving tutor application:", err);
    res.status(500).json({ message: 'Server error. Try again later.' });
  }
});

// Signup route
app.post('/api/signup', async (req, res) => {
  const { name, email, username, password } = req.body;

  if (!name || !email || !username || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await db.collection("users").insertOne({
      name,
      email,
      username,
      password: hashedPassword,
      createdAt: new Date()
    });

    res.status(200).json({ message: 'Account created successfully!' });
  } catch (err) {
    console.error("Error creating account:", err);
    res.status(500).json({ message: 'Server error. Try again later.' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
