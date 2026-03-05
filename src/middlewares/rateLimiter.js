const Redis = require('ioredis');

let redis;

try {
  redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { lazyConnect: true })
    : new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: true });

  redis.on('error', () => {});
} catch (e) {
  redis = null;
}

function rateLimiter(maxRequests = 100, windowSeconds = 15 * 60) {
  return async (req, res, next) => {
    if (!redis) return next();

    try {
      const key = `rl:${req.ip}`;
      const current = await redis.incr(key);
      if (current === 1) await redis.expire(key, windowSeconds);

      if (current > maxRequests) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
      }

      next();
    } catch (err) {
      next();
    }
  };
}

module.exports = rateLimiter;
