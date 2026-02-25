const redis = require('ioredis');

const client = new redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

client.on('connect', () => console.log('Redis connected'));
client.on('error',   (err) => console.error('Redis error:', err));

async function setCache(key, value, ttl = 60) {
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    console.error('Cache set error:', err);
  }
}

async function getCache(key) {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Cache get error:', err);
    return null;
  }
}

async function deleteCache(key) {
  try {
    await client.del(key);
  } catch (err) {
    console.error('Cache delete error:', err);
  }
}

module.exports = { setCache, getCache, deleteCache, client };
