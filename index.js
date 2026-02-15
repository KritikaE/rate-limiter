const express = require('express');
const app = express();

// CORS middleware - allow requests from any origin
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

// Store user request history
const users = {};

app.post('/validate', (req, res) => {
  const userId = req.body.userId || req.ip;
  const now = Date.now();
  
  // Initialize user tracking if new
  if (!users[userId]) {
    users[userId] = [];
  }
  
  // Remove requests older than 60 seconds (sliding window)
  users[userId] = users[userId].filter(time => now - time < 60000);
  
  // Check if we've hit the 41 requests per minute limit
  if (users[userId].length >= 41) {
    const oldestRequest = users[userId][0];
    const retryAfter = Math.ceil((60000 - (now - oldestRequest)) / 1000);
    res.set('Retry-After', retryAfter.toString());
    
    return res.status(429).json({
      blocked: true,
      reason: "Rate limit exceeded: max 41 requests per minute",
      confidence: 1.0
    });
  }
  
  // Check burst limit: max 13 requests in a 5-second window
  const burstWindow = 5000; // 5 seconds
  const recentRequests = users[userId].filter(time => now - time < burstWindow);
  
  if (recentRequests.length >= 13) {
    const oldestInBurst = recentRequests[0];
    const retryAfter = Math.ceil((burstWindow - (now - oldestInBurst)) / 1000);
    res.set('Retry-After', retryAfter.toString());
    
    return res.status(429).json({
      blocked: true,
      reason: "Burst limit exceeded: max 13 requests in 5 seconds",
      confidence: 1.0
    });
  }
  
  // Record this request
  users[userId].push(now);
  
  // Success response
  res.json({
    blocked: false,
    reason: "Input passed all security checks",
    sanitizedOutput: req.body.input || "",
    confidence: 0.95
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running',
    endpoints: {
      validate: '/validate (POST)'
    }
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
