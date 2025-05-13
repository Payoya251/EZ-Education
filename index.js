require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const uri = "mongodb+srv://anthonyventura2324:36kgQwCf6zqWEiDa@smartkidstutoring.jahng0c.mongodb.net/SmartKidsTutoring?retryWrites=true&w=majority";
const dbName = "SmartKidsTutoring";

if (!uri) {
    console.error("❌ MONGODB_URI environment variable not set!");
    process.exit(1);
}

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

    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
    }
}
connectDB();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'Homepage.html'));
});

// Unified Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        let user = await db.collection("users").findOne({ email });
        let userType = 'student';

        if (!user) {
            user = await db.collection("tutors").findOne({ email });
            userType = 'tutor';
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        res.status(200).json({
            message: 'Login successful!',
            redirect: `${userType}_dashboard.html`,
            username: user.username,
            userType: userType
        });

    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

// Student Signup Route
app.post('/api/signup', async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const existingUser = await db.collection("users").findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(409).json({
                message: existingUser.username === username
                    ? 'Username already exists'
                    : 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.collection("users").insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            role: 'student',
            createdAt: new Date(),
            tutorUsername: null
        });

        res.status(201).json({ message: 'Student account created successfully!' });
    } catch (err) {
        console.error("Error creating student account:", err);
        res.status(500).json({ message: 'Server error. Try again later.' });
    }
});

// Tutor Registration Route
app.post('/api/tutors', async (req, res) => {
    const { name, email, username, password, subject, availability, message } = req.body;

    if (!name || !email || !username || !password) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        const existingTutor = await db.collection("tutors").findOne({
            $or: [{ username }, { email }]
        });

        if (existingTutor) {
            return res.status(409).json({
                message: existingTutor.username === username
                    ? 'Username already exists'
                    : 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.collection("tutors").insertOne({
            name,
            email,
            username,
            password: hashedPassword,
            subject,
            availability,
            message,
            role: 'tutor',
            createdAt: new Date(),
            students: [] // Start with no enrolled students
        });

        res.status(201).json({ message: 'Tutor account created successfully!' });
    } catch (err) {
        console.error("Error saving tutor application:", err);
        res.status(500).json({ message: 'Server error. Try again later.' });
    }
});

// NEW: Tutor searches for student
app.get('/api/search-student/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const student = await db.collection('users').findOne({ username });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        res.status(200).json({
            name: student.name,
            username: student.username,
            email: student.email,
            tutorUsername: student.tutorUsername || null
        });
    } catch (err) {
        console.error("Error searching for student:", err); // Added error logging
        res.status(500).json({ message: 'Server error' });
    }
});

// NEW: Tutor enrolls student
app.post('/api/enroll-student', async (req, res) => {
    const { tutorUsername, studentUsername } = req.body;
    console.log('➡️ /api/enroll-student called with:', { tutorUsername, studentUsername });

    try {
        let tutor = await db.collection('tutors').findOne({ username: tutorUsername }); // Changed 'const' to 'let'
        console.log('🔍 Found tutor:', tutor);
        const student = await db.collection('users').findOne({ username: studentUsername });
        console.log('🔍 Found student:', student);

        if (!tutor || !student) {
            console.log('❌ Tutor or student not found in database.');
            return res.status(404).json({ message: 'Tutor or student not found' });
        }

        if (student.tutorUsername) {
            console.log('⚠️ Student is already enrolled with:', student.tutorUsername);
            return res.status(400).json({ message: 'This student is already enrolled with another tutor.' });
        }

        const existingEnrollment = await db.collection('enrollments').findOne({ tutorUsername: tutorUsername, studentUsername: studentUsername });
        console.log('📝 Existing enrollment:', existingEnrollment);
        if (existingEnrollment) {
            return res.status(409).json({ message: 'Student is already enrolled by this tutor.' });
        }

        // More robust check to ensure tutor.students is an array before checking length
        if (!tutor || !tutor.students || !Array.isArray(tutor.students)) {
            console.log('⚠️ Tutor object or tutor.students is undefined or not an array. Initializing to empty array.');
            await db.collection('tutors').updateOne(
                { username: tutorUsername },
                { $set: { students: [] } }
            );
            const updatedTutor = await db.collection('tutors').findOne({ username: tutorUsername });
            tutor = updatedTutor; // Now this assignment is valid because 'tutor' is 'let'
        }

        if (tutor.students && tutor.students.length >= 3) {
            console.log('🛑 Tutor has reached enrollment limit.');
            return res.status(400).json({ message: 'Tutor has already enrolled 3 students.' });
        }

        // Update tutor's student list (for potential quick access)
        const updateTutorResult = await db.collection('tutors').updateOne(
            { username: tutorUsername },
            { $push: { students: studentUsername } }
        );
        console.log('⬆️ Updated tutor result:', updateTutorResult);

        // Update student's tutor assignment
        const updateStudentResult = await db.collection('users').updateOne(
            { username: studentUsername },
            { $set: { tutorUsername: tutorUsername } }
        );
        console.log('⬆️ Updated student result:', updateStudentResult);

        // Create an enrollment record
        const insertEnrollmentResult = await db.collection('enrollments').insertOne({ tutorUsername, studentUsername, enrollmentDate: new Date() });
        console.log('➕ Created enrollment record:', insertEnrollmentResult.insertedId);

        res.status(200).json({ message: 'Student enrolled successfully!' });

    } catch (err) {
        console.error("🔥 Error enrolling student:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// NEW: Get tutor's students
app.get('/api/tutor-students/:tutorUsername', async (req, res) => {
    const { tutorUsername } = req.params;
    try {
        const tutor = await db.collection('tutors').findOne({ username: tutorUsername });
        if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

        // Fetch students from the 'users' collection where their username is in the tutor's 'students' array
        const students = await db.collection('users').find({ username: { $in: tutor.students || [] } }).toArray(); // Added null check for tutor.students
        res.status(200).json({ students });
    } catch (err) {
        console.error("Error fetching tutor's students:", err); // Added error logging
        res.status(500).json({ message: 'Server error' });
    }
});

// NEW: Get student's tutor
app.get('/api/student-tutor/:studentUsername', async (req, res) => {
    const { studentUsername } = req.params;
    try {
        const student = await db.collection('users').findOne({ username: studentUsername });
        if (!student || !student.tutorUsername) {
            return res.status(404).json({ message: 'Tutor not assigned yet' });
        }

        const tutor = await db.collection('tutors').findOne({ username: student.tutorUsername });
        if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

        res.status(200).json({
            name: tutor.name,
            email: tutor.email,
            subject: tutor.subject,
            availability: tutor.availability,
            message: tutor.message
        });
    } catch (err) {
        console.error("Error fetching student's tutor:", err); // Added error logging
        res.status(500).json({ message: 'Server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        database: db ? 'Connected' : 'Disconnected',
        collections: {
            users: true,
            tutors: true,
            enrollments: true // Ensure 'enrollments' is in the health check
        }
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    try {
        await client.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});
