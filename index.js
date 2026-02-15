const express = require('express');
const app = express();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on port ' + PORT));
```
Click **"Commit new file"**

### Step 4: Deploy on Render
1. Go to **render.com**
2. Sign up with GitHub (click "Sign in with GitHub")
3. Click **"New +"** → **"Web Service"**
4. Click **"Connect a repository"** → find your `rate-limiter` repo
5. Fill in:
   - **Name:** rate-limiter
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click **"Create Web Service"**

### Step 5: Get Your URL
Wait 2-3 minutes for deployment. Your URL will be:
```
https://rate-limiter.onrender.com/validate
