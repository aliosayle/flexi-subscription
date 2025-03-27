const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

// Enhanced authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get user information from token
function getUserFromToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Branch filter middleware
function branchFilter(req, res, next) {
  const user = getUserFromToken(req);
  if (!user) return next();
  
  // Set branch_id for filtering
  req.branch_id = user.selected_branch_id;
  next();
}

module.exports = {
  authenticateToken,
  getUserFromToken,
  branchFilter
}; 