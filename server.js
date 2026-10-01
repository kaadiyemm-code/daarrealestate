require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./utils/redisClient');
const https = require('https');
const http = require('http');

// Connect to Database
connectDB();

// Connect to Redis (optional - only if REDIS_URL is set)
connectRedis();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} (${HOST})`);

  // Self-ping every 10 minutes to prevent Render free tier from sleeping
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL;
  if (RENDER_URL) {
    const pingInterval = 10 * 60 * 1000; // 10 minutes
    const requester = RENDER_URL.startsWith('https') ? https : http;

    setInterval(() => {
      requester.get(`${RENDER_URL}/api/properties?limit=1`, (res) => {
        console.log(`[Self-Ping] ✅ Server awake - Status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log(`[Self-Ping] ⚠️ Ping failed: ${err.message}`);
      });
    }, pingInterval);

    console.log(`[Self-Ping] 🔄 Auto-ping enabled every 10 minutes → ${RENDER_URL}`);
  } else {
    console.log('[Self-Ping] No RENDER_EXTERNAL_URL set — self-ping disabled (local mode)');
  }
});

// Export for serverless platforms (e.g., Vercel)
module.exports = app;

