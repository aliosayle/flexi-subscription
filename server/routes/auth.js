const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../config/db');
const { JWT_SECRET, TOKEN_EXPIRY, ALGORITHM, COOKIE_MAX_AGE } = require('../config/constants');
const { validateLogin } = require('../middleware/validation');
const { formatError } = require('../utils/helpers');

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 login attempts per hour
  message: 'Too many login attempts, please try again later.'
});

// Login route
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get user from database with prepared statement
    const [users] = await pool.execute(
      'SELECT u.*, r.name as role_name, r.description as role_description, GROUP_CONCAT(DISTINCT p.name) as permissions FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN role_permissions rp ON r.id = rp.role_id LEFT JOIN permissions p ON rp.permission_id = p.id WHERE u.email = ? GROUP BY u.id',
      [email]
    );
    
    const user = users[0];
    
    // Use constant-time comparison for password check
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Get user's branches
    const [userBranches] = await pool.execute(
      `SELECT ub.branch_id, b.name, b.company_id, c.name as company_name 
       FROM user_branches ub 
       JOIN branches b ON ub.branch_id = b.id 
       JOIN companies c ON b.company_id = c.id 
       WHERE ub.user_id = ?`,
      [user.id]
    );
    
    // Create token with shorter expiration
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role_id: user.role_id,
        role_name: user.role_name,
        role_description: user.role_description,
        permissions: user.permissions,
        selected_branch_id: user.selected_branch_id
      },
      JWT_SECRET,
      { 
        expiresIn: TOKEN_EXPIRY,
        algorithm: ALGORITHM
      }
    );
    
    // Send response without sensitive data
    const { password: _, ...userWithoutPassword } = user;
    
    // Set secure cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE
    });
    
    res.json({
      ...userWithoutPassword,
      branches: userBranches,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'user']
    );
    
    // Create token
    const token = jwt.sign(
      { id: result.insertId, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Get created user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [result.insertId]
    );
    
    const user = users[0];
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      ...userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

module.exports = router; 