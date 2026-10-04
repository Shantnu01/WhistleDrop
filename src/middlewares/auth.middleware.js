const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Check if moderator exists in DB
    const { rows } = await db.query('SELECT id FROM moderators WHERE id = $1', [decoded.id]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Unauthorized: Invalid moderator' });
    }

    req.moderatorId = rows[0].id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
};

module.exports = { authenticate };
