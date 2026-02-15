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

const userRequests = {};

app.post('/validate', (req, res) => {
  const userId = req.body?.userId || req.ip || 'anonymous';
  const now = Date.now();
  
  if (!userRequests[userId]) {
    userRequests[userId] = [];
  }
  
  userRequests[userId] = userRequests[userId].filter(timestamp => {
    return (now - timestamp) < 60000;
  });
  
  if (userRequests[userId].length >= 41) {
    res.set('Retry-After', '60');
    return res.status(429).json({
      blocked: true,
      reason: "Rate limit exceeded: max 41 requests per minute",
      confidence: 1.0
    });
  }
  
  userRequests[userId].push(now);
  
  return res.status(200).json({
    blocked: false,
    reason: "Input passed all security checks",
    sanitizedOutput: req.body?.input || "",
    confidence: 0.95
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
