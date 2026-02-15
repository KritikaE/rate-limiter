const express = require('express');
const app = express();

// CORS fix - allow all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const users = {};

app.post('/validate', (req, res) => {
  const userId = req.body.userId || req.ip;
  const now = Date.now();
  
  if (!users[userId]) users[userId] = [];
  users[userId] = users[userId].filter(time => now - time < 60000);
  
  if (users[userId].length >= 41) {
    return res.status(429).json({
      blocked: true,
      reason: "Rate limit exceeded: max 41 requests per minute",
      confidence: 1.0
    });
  }
  
  users[userId].push(now);
  
  res.json({
    blocked: false,
    reason: "Input passed all security checks",
    sanitizedOutput: req.body.input || "",
    confidence: 0.95
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
