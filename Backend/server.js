require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI || "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/SmartKidsTutoring?retryWrites=true&w=majority";
const dbName = process.env.DB_NAME || "SmartKidsTutoring";

if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set!");
    process.exit(1);
}

// Middleware
app.use(cors());
// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Update the static file path to point to the correct location
app.use(express.static(path.join(__dirname, '../Frontend')));
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

        if (!collectionNames.includes('enrollments')) {
            await db.createCollection('enrollments');
            console.log("Created 'enrollments' collection");
        }
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
}
connectDB();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// User registration endpoint for both students and tutors
app.post('/api/signup', async (req, res) => {
    const { name, email, username, password, role, subject, availability, message } = req.body;
    
    // Validate input
    if (!name || !email || !username || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (role !== 'student' && role !== 'tutor') {
        return res.status(400).json({ message: 'Invalid role. Must be either student or tutor' });
    }

    try {
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ 
            $or: [
                { email },
                { username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this email or username already exists' 
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user object with common fields
        const userData = { 
            name, 
            email, 
            username, 
            password: hashedPassword,
            role,
            createdAt: new Date()
        };

        // Add role-specific fields
        if (role === 'tutor') {
            userData.subject = subject || 'General';
            userData.availability = availability || 'Flexible';
            userData.message = message || '';
            userData.students = []; // Initialize empty students array for tutors
        }
        
        // Save the new user
        const result = await db.collection('users').insertOne(userData);
        const newUser = result.ops ? result.ops[0] : userData;

        // If this is a tutor, migrate any existing enrollments
        if (role === 'tutor') {
            await migrateTutorEnrollments(username, result.insertedId);
        }

        // Send success response
        res.status(201).json({ 
            message: 'Account created successfully',
            redirect: '/login.html',
            userId: result.insertedId
        });
    } catch (error) {
        console.error('Error in /api/signup:', error);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// Helper function to migrate enrollments when a tutor is created
async function migrateTutorEnrollments(tutorUsername, tutorId) {
    try {
        // Find all enrollments with this tutor's username
        const enrollments = await db.collection('enrollments')
            .find({ tutorUsername })
            .toArray();
        
        if (enrollments.length > 0) {
            // Update each enrollment to use the tutor's ID
            for (const enrollment of enrollments) {
                await db.collection('enrollments').updateOne(
                    { _id: enrollment._id },
                    { $set: { tutorId: tutorId.toString() } }
                );
                
                // Update the student's tutor reference
                await db.collection('users').updateOne(
                    { username: enrollment.studentUsername },
                    { $set: { tutorId: tutorId.toString() } }
                );
            }
            console.log(`Migrated ${enrollments.length} enrollments for tutor ${tutorUsername}`);
        }
    } catch (error) {
        console.error('Error migrating tutor enrollments:', error);
    }
}

// Tutor registration endpoint
app.post('/api/tutors', async (req, res) => {
    console.log('Tutor signup attempt:', req.body);
    
    const { name, email, username, password, subject, availability, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !username || !password) {
        return res.status(400).json({ 
            message: 'Name, email, username, and password are required',
            code: 'MISSING_FIELDS'
        });
    }
    
    try {
        // Check if user already exists
        const existingUser = await db.collection('users').findOne({
            $or: [
                { email },
                { username }
            ]
        });
        
        if (existingUser) {
            const field = existingUser.email === email ? 'Email' : 'Username';
            return res.status(400).json({
                message: `${field} is already in use`,
                code: 'USER_EXISTS'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create tutor document
        const tutorData = {
            name,
            email,
            username,
            password: hashedPassword,
            role: 'tutor',
            subject: subject || 'General',
            availability: availability || 'Flexible',
            message: message || '',
            students: [],
            createdAt: new Date()
        };
        
        // Insert into users collection
        const result = await db.collection('users').insertOne(tutorData);
        
        // Remove password from response
        const { password: _, ...tutor } = tutorData;
        
        res.status(201).json({
            message: 'Tutor account created successfully',
            tutor: {
                ...tutor,
                _id: result.insertedId
            },
            redirect: '/login.html'
        });
        
    } catch (error) {
        console.error('Tutor signup error:', error);
        res.status(500).json({
            message: 'Error creating tutor account',
            code: 'SERVER_ERROR',
            error: error.message
        });
    }
});

// Enroll a student with a tutor
app.post('/api/enroll', async (req, res) => {
    const { tutorId, studentUsername } = req.body;
    
    if (!tutorId || !studentUsername) {
        return res.status(400).json({ 
            message: 'Tutor ID and student username are required',
            code: 'MISSING_FIELDS'
        });
    }
    
    try {
        // Start a session for transaction
        const session = client.startSession();
        let result;
        
        try {
            // Start transaction
            await session.withTransaction(async () => {
                // 1. Verify tutor exists and is a tutor
                const tutor = await db.collection('users').findOne(
                    { _id: new ObjectId(tutorId), role: 'tutor' },
                    { session }
                );
                
                if (!tutor) {
                    throw { status: 404, code: 'TUTOR_NOT_FOUND', message: 'Tutor not found' };
                }
                
                // 2. Verify student exists and is a student
                const student = await db.collection('users').findOne(
                    { username: studentUsername, role: 'student' },
                    { session }
                );
                
                if (!student) {
                    throw { status: 404, code: 'STUDENT_NOT_FOUND', message: 'Student not found' };
                }
                
                // 3. Check if student already has a tutor
                if (student.tutorId) {
                    throw { 
                        status: 400, 
                        code: 'ALREADY_ENROLLED', 
                        message: 'Student is already enrolled with a tutor' 
                    };
                }
                
                // 4. Update student with tutor reference
                await db.collection('users').updateOne(
                    { _id: student._id },
                    { $set: { tutorId: new ObjectId(tutorId) } },
                    { session }
                );
                
                // 5. Add student to tutor's students array if not already there
                if (!tutor.students || !tutor.students.includes(studentUsername)) {
                    await db.collection('users').updateOne(
                        { _id: tutor._id },
                        { $addToSet: { students: studentUsername } },
                        { session }
                    );
                }
                
                // 6. Create enrollment record (for backward compatibility)
                await db.collection('enrollments').updateOne(
                    { 
                        tutorUsername: tutor.username,
                        studentUsername: student.username
                    },
                    {
                        $setOnInsert: {
                            tutorId: tutor._id,
                            studentId: student._id,
                            enrollmentDate: new Date()
                        }
                    },
                    { 
                        upsert: true,
                        session 
                    }
                );
                
                result = {
                    tutorId: tutor._id,
                    tutorUsername: tutor.username,
                    tutorName: tutor.name,
                    studentId: student._id,
                    studentUsername: student.username,
                    studentName: student.name,
                    enrollmentDate: new Date()
                };
            });
            
            // If we get here, the transaction was successful
            res.status(201).json({
                message: 'Enrollment successful',
                ...result
            });
            
        } finally {
            // End the session
            await session.endSession();
        }
        
    } catch (error) {
        console.error('Enrollment error:', error);
        
        // Handle custom errors from transaction
        if (error.status) {
            return res.status(error.status).json({
                message: error.message,
                code: error.code
            });
        }
        
        // Handle other errors
        res.status(500).json({
            message: 'Server error during enrollment',
            code: 'SERVER_ERROR',
            error: error.message
        });
    }
});

// Test endpoint to verify routing is working
app.get('/api/test', (req, res) => {
    console.log('Test endpoint hit!');
    res.json({ message: 'Test endpoint is working!' });
});

// Get assigned tutor for a student
app.get('/api/assigned-tutor/:studentUsername', async (req, res) => {
    console.log('\n=== Assigned Tutor Endpoint Hit ===');
    console.log('Student Username:', req.params.studentUsername);
    
    const { studentUsername } = req.params;
    try {
        // First, check if the student exists and get their tutorId if any
        const student = await db.collection('users').findOne({ 
            username: studentUsername,
            role: 'student' 
        });
        
        if (!student) {
            return res.status(404).json({ 
                message: 'Student not found',
                code: 'STUDENT_NOT_FOUND'
            });
        }
        
        // Check if student has a tutorId directly on their document
        if (!student.tutorId) {
            return res.json({ 
                message: 'No tutor assigned',
                code: 'NO_TUTOR_ASSIGNED',
                hasTutor: false
            });
        }
        
        // Find the tutor by ID
        const tutor = await db.collection('users').findOne({
            _id: new ObjectId(student.tutorId),
            role: 'tutor'
        });
        
        if (!tutor) {
            console.log('Tutor not found with ID:', student.tutorId);
            return res.json({ 
                message: 'Assigned tutor not found',
                code: 'TUTOR_NOT_FOUND',
                hasTutor: false
            });
        }
        
        console.log('Found tutor:', {
            id: tutor._id,
            username: tutor.username,
            name: tutor.name
        });
        
        // Return tutor information
        res.json({ 
            tutorId: tutor._id,
            tutorUsername: tutor.username,
            tutorName: tutor.name || tutor.username,
            tutorSubject: tutor.subject,
            tutorAvailability: tutor.availability,
            hasTutor: true
        });
        
    } catch (error) {
        console.error('Error fetching assigned tutor:', error);
        res.status(500).json({ 
            message: 'Server error while fetching tutor information',
            code: 'SERVER_ERROR',
            error: error.message
        });
    }
});

// Login endpoint for both students and tutors
app.post('/api/login', async (req, res) => {
    console.log('\n=== Login Attempt ===');
    console.log('Username:', req.body.username);
    console.log('Role being logged in as:', req.body.role || 'Not specified');
    
    const { username, password } = req.body;

    try {
        // Find user by username
        const user = await db.collection('users').findOne({ username });
        
        if (!user) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ 
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS',
                details: 'No user found with this username'
            });
        }
        
        console.log('👤 User found:', {
            id: user._id,
            username: user.username,
            role: user.role,
            hasPassword: !!user.password
        });

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', username);
            return res.status(401).json({ 
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS',
                details: 'Incorrect password'
            });
        }

        // Determine redirect URL based on user role
        let redirectUrl = '/';
        if (user.role === 'tutor') {
            redirectUrl = '/tutor_dashboard.html';
        } else if (user.role === 'student') {
            redirectUrl = '/student_dashboard.html';
        }

        // Prepare user data for response (exclude sensitive info)
        const userData = {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };

        // Add role-specific data
        if (user.role === 'tutor') {
            userData.subject = user.subject;
            userData.availability = user.availability;
            userData.students = user.students || [];
        } else if (user.role === 'student' && user.tutorId) {
            // For students, include tutor info if assigned
            const tutor = await db.collection('users').findOne(
                { _id: new ObjectId(user.tutorId) },
                { projection: { name: 1, username: 1, subject: 1 } }
            );
            if (tutor) {
                userData.tutor = tutor;
            }
        }

        res.json({ 
            message: 'Login successful',
            redirect: redirectUrl,
            user: userData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error during login',
            code: 'SERVER_ERROR'
        });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log('\n=== Server Started ===');
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
    console.log(`   Also available at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log(`- GET  /api/assigned-tutor/:studentUsername`);
    console.log('- POST /api/tutors');
    console.log('- POST /api/login');
    console.log('====================\n');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});
