const jwt = require('jsonwebtoken');

const authorize = (roles = []) => {
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: 'No token provided' });

      const token = authHeader.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      next();

    } catch (err) {
      console.error(err);
      res.status(401).json({ message: 'Invalid token' });
    }
  };
};

module.exports = authorize;