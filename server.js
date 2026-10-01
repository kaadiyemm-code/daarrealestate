require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./utils/redisClient');

// Connect to Database
connectDB();

// Connect to Redis (optional - only if REDIS_URL is set)
connectRedis();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} (${HOST})`);
});

// Export for serverless platforms (e.g., Vercel)
module.exports = app;

