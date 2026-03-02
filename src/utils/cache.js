const Redis = require('ioredis');

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({ host: '127.0.0.1', port: 6379 });

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Cache get error:', err.message);
    return null;
  }
}

async function setCache(key, value, ttl = 300) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    console.error('Cache set error:', err.message);
  }
}

async function deleteCache(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('Cache delete error:', err.message);
  }
}

module.exports = { getCache, setCache, deleteCache };
