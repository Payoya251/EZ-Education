const express = require('express');
const User = require('./models/User'); // Import the User model

const router = express.Router();

router.post('/api/tutors', async (req, res) => {
  const { name, email, username, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Save the new user
    await User.save({ name, email, username, password });

    // Send success response
    res.status(201).json({ message: 'Account created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
