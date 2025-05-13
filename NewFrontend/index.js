/* ver 1.0
const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World from SmartKidsTutoring!');
});

// Use folder Frontend to use the html code from there
//app.use(express.static(path.join(__dirname, 'Frontend')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`App listening on port ${port}`);
});
*/


// ver 1.1
const express = require('express');
const path = require('path');
const app = express();

const port = process.env.PORT || 3000;

// Serve static files from the Frontend folder
app.use(express.static(path.join(__dirname, 'Frontend')));

// Explicitly serve index.html for the root path AFTER setting up static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Frontend', 'index.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`App listening on port ${port}`);
});
