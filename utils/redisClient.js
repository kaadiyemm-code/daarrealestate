const { createClient } = require('redis');

let client = null;
let isConnected = false;

const connectRedis = async () => {
  // If no REDIS_URL is set, skip Redis (graceful fallback)
  if (!process.env.REDIS_URL) {
    console.log('[Redis] REDIS_URL not set. Caching disabled.');
    return;
  }

  try {
    client = createClient({ url: process.env.REDIS_URL });

    client.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('[Redis] Connected successfully');
      isConnected = true;
    });

    client.on('disconnect', () => {
      console.log('[Redis] Disconnected');
      isConnected = false;
    });

    await client.connect();
  } catch (err) {
    console.error('[Redis] Failed to connect:', err.message);
    isConnected = false;
  }
};

// Get a cached value (returns null if Redis not available)
const getCache = async (key) => {
  if (!isConnected || !client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('[Redis] getCache error:', err.message);
    return null;
  }
};

// Set a cached value with expiry in seconds (default: 5 minutes)
const setCache = async (key, value, ttlSeconds = 300) => {
  if (!isConnected || !client) return;
  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('[Redis] setCache error:', err.message);
  }
};

// Delete a cached key (call this when data changes)
const deleteCache = async (key) => {
  if (!isConnected || !client) return;
  try {
    await client.del(key);
  } catch (err) {
    console.error('[Redis] deleteCache error:', err.message);
  }
};

// Delete multiple keys matching a pattern (e.g. "properties:*")
const deleteCachePattern = async (pattern) => {
  if (!isConnected || !client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`[Redis] Cleared ${keys.length} keys matching "${pattern}"`);
    }
  } catch (err) {
    console.error('[Redis] deleteCachePattern error:', err.message);
  }
};

module.exports = { connectRedis, getCache, setCache, deleteCache, deleteCachePattern };
