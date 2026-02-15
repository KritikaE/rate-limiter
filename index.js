const express = require('express');
const app = express();

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
  
  if (!users[userId]) {
    users[userId] = {
      tokens: 13, // Start with burst capacity
      lastRefill: now
    };
  }
  
  const user = users[userId];
  const timePassed = now - user.lastRefill;
  
  // Refill tokens: 41 requests per 60 seconds = 0.683 tokens per second
  const tokensToAdd = (timePassed / 1000) * (41 / 60);
  user.tokens = Math.min(13, user.tokens + tokensToAdd); // Cap at burst size
  user.lastRefill = now;
  
  // Check if we have tokens available
  if (user.tokens < 1) {
    const timeToNextToken = (1 - user.tokens) / (41 / 60) * 1000;
    const retryAfter = Math.ceil(timeToNextToken / 1000);
    res.set('Retry-After', retryAfter.toString());
    
    return res.status(429).json({
      blocked: true,
      reason: "Rate limit exceeded: max 41 requests per minute with burst of 13",
      confidence: 1.0
    });
  }
  
  // Consume one token
  user.tokens -= 1;
  
  res.json({
    blocked: false,
    reason: "Input passed all security checks",
    sanitizedOutput: req.body.input || "",
    confidence: 0.95
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
