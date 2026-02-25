const { client } = require('../utils/cache');

function rateLimiter(maxRequests = 100, windowSeconds = 15 * 60) {
  return async (req, res, next) => {
    try {
      const ip  = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const key = `rate_limit:${ip}`;

      const current = await client.incr(key);

      if (current === 1) {
        await client.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        return res.status(429).json({
          message: 'Too many requests. Please slow down and try again later.',
        });
      }

      res.setHeader('X-RateLimit-Limit',     maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      next();

    } catch (err) {
      console.error('Rate limiter error:', err);
      next();
    }
  };
}

module.exports = rateLimiter;
