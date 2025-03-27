require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

// Security middleware
app.use(helmet()); // Adds various HTTP headers for security
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(morgan('combined')); // Logging

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 login attempts per hour
  message: 'Too many login attempts, please try again later.'
});

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://192.168.10.70:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse JSON bodies with size limit
app.use(express.json({ limit: '10kb' }));

// Database connection with SSL in production
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'flexigym',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();

// JWT secret with better security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

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

// Input validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Enhanced login route with validation and rate limiting
app.post('/api/auth/login', authLimiter, validateLogin, async (req, res) => {
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
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );
    
    // Send response without sensitive data
    const { password: _, ...userWithoutPassword } = user;
    
    // Set secure cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
    
    res.json({
      ...userWithoutPassword,
      branches: userBranches,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Package routes
// Get all packages
app.get('/api/packages', authenticateToken, branchFilter, async (req, res) => {
  try {
    const [packages] = await pool.query('SELECT * FROM packages WHERE branch_id = ? OR branch_id IS NULL', [req.branch_id]);
    
    // Parse features from JSON string to array with error handling
    const formattedPackages = packages.map(pkg => {
      let parsedFeatures = [];
      try {
        if (pkg.features) {
          // Try to parse as JSON first
          try {
            parsedFeatures = JSON.parse(pkg.features);
          } catch (jsonErr) {
            // If JSON parsing fails, try to split by newlines
            parsedFeatures = String(pkg.features)
              .split('\n')
              .map(feature => feature.trim())
              .filter(feature => feature.length > 0);
          }
        }
      } catch (err) {
        console.error(`Error parsing features for package ${pkg.id}:`, err);
        parsedFeatures = [];
      }
      
      return {
        id: pkg.id.toString(),
        name: pkg.name,
        description: pkg.description || '',
        days: pkg.days,
        price: parseFloat(pkg.price),
        features: parsedFeatures,
        isPopular: pkg.is_popular === 1,
        branchId: pkg.branch_id ? pkg.branch_id.toString() : null,
        createdAt: pkg.created_at,
        updatedAt: pkg.updated_at
      };
    });
    
    res.json(formattedPackages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single package
app.get('/api/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [packages] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
    
    if (packages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    const pkg = packages[0];
    
    // Parse features from JSON string to array with error handling
    let parsedFeatures = [];
    try {
      if (pkg.features) {
        // Try to parse as JSON first
        try {
          parsedFeatures = JSON.parse(pkg.features);
        } catch (jsonErr) {
          // If JSON parsing fails, try to split by newlines
          parsedFeatures = String(pkg.features)
            .split('\n')
            .map(feature => feature.trim())
            .filter(feature => feature.length > 0);
        }
      }
    } catch (err) {
      console.error(`Error parsing features for package ${pkg.id}:`, err);
      parsedFeatures = [];
    }
    
    // Format response
    const formattedPackage = {
      id: pkg.id.toString(),
      name: pkg.name,
      description: pkg.description || '',
      days: pkg.days,
      price: parseFloat(pkg.price),
      features: parsedFeatures,
      isPopular: pkg.is_popular === 1,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at
    };
    
    res.json(formattedPackage);
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create package
app.post('/api/packages', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { name, description, days, price, features, isPopular, branch_id } = req.body;
    
    // Validate required fields
    if (!name || !days || price === undefined || !features || !Array.isArray(features)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Use the branch_id from request or from the branchFilter middleware
    const branchId = branch_id || req.branch_id;
    
    // Insert new package
    const [result] = await pool.execute(
      'INSERT INTO packages (name, description, days, price, features, is_popular, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', days, price, JSON.stringify(features), isPopular || false, branchId]
    );
    
    // Get the newly created package
    const [packages] = await pool.execute('SELECT * FROM packages WHERE id = ?', [result.insertId]);
    const pkg = packages[0];
    
    // Parse features from JSON string to array with error handling
    let parsedFeatures = [];
    try {
      if (pkg.features) {
        // Try to parse as JSON first
        try {
          parsedFeatures = JSON.parse(pkg.features);
        } catch (jsonErr) {
          // If JSON parsing fails, try to split by newlines
          parsedFeatures = pkg.features.split('\n')
            .map(feature => feature.trim())
            .filter(feature => feature.length > 0);
        }
      }
    } catch (err) {
      console.error(`Error parsing features for package ${pkg.id}:`, err);
      parsedFeatures = [];
    }
    
    // Format response
    const newPackage = {
      id: pkg.id.toString(),
      name: pkg.name,
      description: pkg.description || '',
      days: pkg.days,
      price: parseFloat(pkg.price),
      features: parsedFeatures,
      isPopular: pkg.is_popular === 1,
      branchId: pkg.branch_id ? pkg.branch_id.toString() : null,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at
    };
    
    res.status(201).json(newPackage);
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update package
app.put('/api/packages/:id', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, days, price, features, isPopular, branch_id } = req.body;
    
    // Validate required fields
    if (!name || !days || price === undefined || !features || !Array.isArray(features)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Use the branch_id from request or from the branchFilter middleware
    const branchId = branch_id || req.branch_id;
    
    // Check if package exists and belongs to this branch
    const [existingPackages] = await pool.execute(
      'SELECT * FROM packages WHERE id = ? AND (branch_id = ? OR branch_id IS NULL)', 
      [id, req.branch_id]
    );
    
    if (existingPackages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Update package
    await pool.execute(
      'UPDATE packages SET name = ?, description = ?, days = ?, price = ?, features = ?, is_popular = ?, branch_id = ? WHERE id = ?',
      [name, description || '', days, price, JSON.stringify(features), isPopular || false, branchId, id]
    );
    
    // Get updated package
    const [packages] = await pool.execute('SELECT * FROM packages WHERE id = ?', [id]);
    const pkg = packages[0];
    
    // Parse features from JSON string to array with error handling
    let parsedFeatures = [];
    try {
      if (pkg.features) {
        // Try to parse as JSON first
        try {
          parsedFeatures = JSON.parse(pkg.features);
        } catch (jsonErr) {
          // If JSON parsing fails, try to split by newlines
          parsedFeatures = pkg.features.split('\n')
            .map(feature => feature.trim())
            .filter(feature => feature.length > 0);
        }
      }
    } catch (err) {
      console.error(`Error parsing features for package ${pkg.id}:`, err);
      parsedFeatures = [];
    }
    
    // Format response
    const updatedPackage = {
      id: pkg.id.toString(),
      name: pkg.name,
      description: pkg.description || '',
      days: pkg.days,
      price: parseFloat(pkg.price),
      features: parsedFeatures,
      isPopular: pkg.is_popular === 1,
      branchId: pkg.branch_id ? pkg.branch_id.toString() : null,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at
    };
    
    res.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete package
app.delete('/api/packages/:id', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if package exists and belongs to this branch
    const [existingPackages] = await pool.execute(
      'SELECT * FROM packages WHERE id = ? AND (branch_id = ? OR branch_id IS NULL)', 
      [id, req.branch_id]
    );
    
    if (existingPackages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Delete package
    await pool.execute('DELETE FROM packages WHERE id = ?', [id]);
    
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//
// INVENTORY ROUTES
//

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

// Get inventory items with pagination
app.get(['/api/inventory', '/api/inventory/items'], authenticateToken, branchFilter, async (req, res) => {
  try {
    let query = `
      SELECT * FROM inventory_items
      WHERE branch_id = ? OR branch_id IS NULL
      ORDER BY name
    `;

    const [items] = await pool.execute(query, [req.branch_id]);

    // Format response
    const formattedItems = items.map(item => ({
      id: item.id.toString(),
      name: item.name,
      description: item.description || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      quantity: parseInt(item.quantity) || 0,
      price: parseFloat(item.price) || 0,
      cost: parseFloat(item.cost) || 0,
      category: item.category || 'Uncategorized',
      imageSrc: item.image_src || 'https://placehold.co/100x100',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  }
});

// Get single inventory item - add support for new endpoint pattern
app.get('/api/inventory/:id', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `SELECT * FROM inventory_items WHERE id = ?`;
    const params = [id];
    
    const [items] = await pool.query(query, params);
    
    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const item = items[0];
    
    // Format response
    const formattedItem = {
      id: item.id.toString(),
      name: item.name,
      description: item.description || '',
      sku: item.sku,
      barcode: item.barcode || '',
      quantity: item.quantity,
      price: parseFloat(item.price),
      cost: parseFloat(item.cost),
      category: item.category || '',
      imageSrc: item.image_src || 'https://placehold.co/100x100',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };
    
    res.json(formattedItem);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create inventory item - add support for new endpoint pattern
app.post('/api/inventory', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { name, description, sku, barcode, quantity, price, cost, category, imageSrc } = req.body;
    
    // Validate required fields
    if (!name || price === undefined || cost === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Generate a default SKU if not provided
    const itemSku = sku || `ITEM-${Date.now()}`;
    
    // Check if SKU already exists
    const [existingSku] = await pool.execute('SELECT * FROM inventory_items WHERE sku = ?', [itemSku]);
    if (existingSku.length > 0) {
      return res.status(400).json({ message: 'Item with this SKU already exists' });
    }
    
    // Insert new item
    const [result] = await pool.execute(
      'INSERT INTO inventory_items (name, description, sku, barcode, quantity, price, cost, category, image_src, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', itemSku, barcode || '', quantity || 0, price, cost, category || '', imageSrc || '', req.branch_id || null]
    );
    
    const itemId = result.insertId;
    
    // If there's an initial quantity, create a beginning transaction
    if (quantity && quantity > 0) {
      await pool.execute(
        'INSERT INTO inventory_transactions (item_id, type, quantity, price, total_amount, notes, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [itemId, 'beginning', quantity, cost, cost * quantity, 'Initial inventory', req.branch_id || null]
      );
    }
    
    // Get the newly created item
    const [items] = await pool.execute('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
    const item = items[0];
    
    // Format response
    const newItem = {
      id: item.id.toString(),
      name: item.name,
      description: item.description || '',
      sku: item.sku,
      barcode: item.barcode || '',
      quantity: item.quantity,
      price: parseFloat(item.price),
      cost: parseFloat(item.cost),
      category: item.category || '',
      imageSrc: item.image_src || 'https://placehold.co/100x100',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update inventory item - add support for new endpoint pattern
app.put('/api/inventory/:id', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sku, barcode, price, cost, category, imageSrc } = req.body;
    
    // Validate required fields
    if (!name || price === undefined || cost === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if item exists and belongs to the user's branch or is shared
    let query = 'SELECT * FROM inventory_items WHERE id = ?';
    const params = [id];
    
    if (req.branch_id) {
      query += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(req.branch_id);
    }
    
    const [existingItems] = await pool.query(query, params);
    if (existingItems.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Use existing SKU if not provided
    const itemSku = sku || existingItems[0].sku;
    
    // Check if SKU already exists (for another item)
    const [existingSku] = await pool.execute('SELECT * FROM inventory_items WHERE sku = ? AND id != ?', [itemSku, id]);
    if (existingSku.length > 0) {
      return res.status(400).json({ message: 'Another item with this SKU already exists' });
    }
    
    // Update item (don't update quantity here, that's handled via transactions)
    await pool.execute(
      'UPDATE inventory_items SET name = ?, description = ?, sku = ?, barcode = ?, price = ?, cost = ?, category = ?, image_src = ? WHERE id = ?',
      [name, description || '', itemSku, barcode || '', price, cost, category || '', imageSrc || '', id]
    );
    
    // Get updated item
    const [items] = await pool.execute('SELECT * FROM inventory_items WHERE id = ?', [id]);
    const item = items[0];
    
    // Format response
    const updatedItem = {
      id: item.id.toString(),
      name: item.name,
      description: item.description || '',
      sku: item.sku,
      barcode: item.barcode || '',
      quantity: item.quantity,
      price: parseFloat(item.price),
      cost: parseFloat(item.cost),
      category: item.category || '',
      imageSrc: item.image_src || 'https://placehold.co/100x100',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete inventory item - add support for new endpoint pattern
app.delete('/api/inventory/:id', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists and belongs to the user's branch or is shared
    let query = 'SELECT * FROM inventory_items WHERE id = ?';
    const params = [id];
    
    if (req.branch_id) {
      query += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(req.branch_id);
    }
    
    const [existingItems] = await pool.query(query, params);
    if (existingItems.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Delete item (transactions will be deleted via CASCADE)
    await pool.execute('DELETE FROM inventory_items WHERE id = ?', [id]);
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transactions for an item
app.get('/api/inventory/items/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const [existingItems] = await pool.execute('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (existingItems.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Get transactions
    const [transactions] = await pool.execute(`
      SELECT t.*, u.name as created_by_name
      FROM inventory_transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.item_id = ?
      ORDER BY t.created_at DESC
    `, [id]);
    
    // Format response
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id.toString(),
      itemId: transaction.item_id.toString(),
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price ? parseFloat(transaction.price) : null,
      totalAmount: parseFloat(transaction.total_amount),
      notes: transaction.notes || '',
      customerSupplier: transaction.customer_supplier || '',
      paymentStatus: transaction.payment_status || '',
      createdBy: transaction.created_by ? transaction.created_by.toString() : null,
      createdByName: transaction.created_by_name || 'System',
      createdAt: transaction.created_at
    }));
    
    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching item transactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all inventory transactions with pagination
app.get(['/api/inventory/transactions', '/api/transactions'], authenticateToken, branchFilter, async (req, res) => {
  try {
    let query = `
      SELECT t.*, i.name as item_name, i.sku as item_sku, u.name as created_by_name
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.branch_id = ? OR t.branch_id IS NULL)
      ORDER BY t.created_at DESC
      LIMIT 100
    `;

    const [transactions] = await pool.execute(query, [req.branch_id]);

    // Format response
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id.toString(),
      itemId: transaction.item_id.toString(),
      itemName: transaction.item_name,
      itemSku: transaction.item_sku,
      type: transaction.type,
      quantity: parseInt(transaction.quantity) || 0,
      price: transaction.price ? parseFloat(transaction.price) : null,
      totalAmount: parseFloat(transaction.total_amount) || 0,
      notes: transaction.notes || '',
      customerSupplier: transaction.customer_supplier || '',
      paymentStatus: transaction.payment_status || '',
      createdBy: transaction.created_by ? transaction.created_by.toString() : null,
      createdByName: transaction.created_by_name || 'System',
      createdAt: transaction.created_at
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  }
});

// Create inventory transaction (adjustment)
app.post(['/api/inventory/transactions', '/api/transactions'], authenticateToken, branchFilter, async (req, res) => {
  try {
    const { itemId, type, quantity, price, notes, customerSupplier, paymentStatus, created_by } = req.body;
    
    // Validate required fields
    if (!itemId || !type || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if item exists
    const [existingItems] = await pool.execute('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
    if (existingItems.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const item = existingItems[0];
    const currentQuantity = item.quantity;
    let newQuantity = currentQuantity;
    
    // Calculate new quantity based on transaction type
    if (type === 'purchase' || type === 'adjustment_in') {
      newQuantity = currentQuantity + quantity;
    } else if (type === 'sale' || type === 'adjustment_out') {
      newQuantity = currentQuantity - quantity;
      if (newQuantity < 0) {
        return res.status(400).json({ message: 'Insufficient quantity available' });
      }
    }
    
    // Calculate total amount
    const transactionPrice = price || (type === 'sale' ? item.price : item.cost);
    const totalAmount = transactionPrice * quantity;
    
    // Create transaction
    const [result] = await pool.execute(
      'INSERT INTO inventory_transactions (item_id, type, quantity, price, total_amount, notes, customer_supplier, payment_status, created_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [itemId, type, quantity, transactionPrice, totalAmount, notes || '', customerSupplier || '', paymentStatus || '', created_by || null, req.branch_id || null]
    );
    
    // Update item quantity
    await pool.execute('UPDATE inventory_items SET quantity = ? WHERE id = ?', [newQuantity, itemId]);
    
    // Get the newly created transaction
    const [transactions] = await pool.execute(`
      SELECT t.*, i.name as item_name, i.sku as item_sku, u.name as created_by_name
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `, [result.insertId]);
    
    const transaction = transactions[0];
    
    // Format response
    const newTransaction = {
      id: transaction.id.toString(),
      itemId: transaction.item_id.toString(),
      itemName: transaction.item_name,
      itemSku: transaction.item_sku,
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price ? parseFloat(transaction.price) : null,
      totalAmount: parseFloat(transaction.total_amount),
      notes: transaction.notes || '',
      customerSupplier: transaction.customer_supplier || '',
      paymentStatus: transaction.payment_status || '',
      createdBy: transaction.created_by ? transaction.created_by.toString() : null,
      createdByName: transaction.created_by_name || 'System',
      createdAt: transaction.created_at
    };
    
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error('Error creating inventory transaction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  }
});

// Create multi-item transaction (bulk purchase/sale)
app.post(['/api/inventory/bulk-transactions', '/api/bulk-transactions'], authenticateToken, branchFilter, async (req, res) => {
  try {
    const { type, items, notes, customerSupplier, paymentStatus } = req.body;
    
    // Validate required fields
    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate transaction type
    if (type !== 'purchase' && type !== 'sale') {
      return res.status(400).json({ message: 'Invalid transaction type for bulk operation' });
    }
    
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const createdTransactions = [];
      
      for (const item of items) {
        const { itemId, quantity, price } = item;
        
        if (!itemId || !quantity || quantity <= 0) {
          throw new Error('Invalid item data');
        }
        
        // Check if item exists
        const [existingItems] = await connection.execute('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
        if (existingItems.length === 0) {
          throw new Error(`Item with ID ${itemId} not found`);
        }
        
        const inventoryItem = existingItems[0];
        const currentQuantity = inventoryItem.quantity;
        let newQuantity = currentQuantity;
        
        // Calculate new quantity based on transaction type
        if (type === 'purchase') {
          newQuantity = currentQuantity + quantity;
        } else {
          newQuantity = currentQuantity - quantity;
          if (newQuantity < 0) {
            throw new Error(`Insufficient quantity available for ${inventoryItem.name}`);
          }
        }
        
        // Calculate total amount
        const transactionPrice = price || (type === 'sale' ? inventoryItem.price : inventoryItem.cost);
        const totalAmount = transactionPrice * quantity;
        
        // Create transaction
        const [result] = await connection.execute(
          'INSERT INTO inventory_transactions (item_id, type, quantity, price, total_amount, notes, customer_supplier, payment_status, created_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [itemId, type, quantity, transactionPrice, totalAmount, notes || '', customerSupplier || '', paymentStatus || '', req.user?.id || null, req.branch_id || null]
        );
        
        // Update item quantity
        await connection.execute('UPDATE inventory_items SET quantity = ? WHERE id = ?', [newQuantity, itemId]);
        
        // Get the newly created transaction
        const [transactions] = await connection.execute(`
          SELECT t.*, i.name as item_name, i.sku as item_sku
          FROM inventory_transactions t
          JOIN inventory_items i ON t.item_id = i.id
          WHERE t.id = ?
        `, [result.insertId]);
        
        const transaction = transactions[0];
        
        // Format response
        createdTransactions.push({
          id: transaction.id.toString(),
          itemId: transaction.item_id.toString(),
          itemName: transaction.item_name,
          itemSku: transaction.item_sku,
          type: transaction.type,
          quantity: transaction.quantity,
          price: parseFloat(transaction.price),
          totalAmount: parseFloat(transaction.total_amount),
          notes: transaction.notes || '',
          customerSupplier: transaction.customer_supplier || '',
          paymentStatus: transaction.payment_status || '',
          createdAt: transaction.created_at
        });
      }
      
      // Commit transaction
      await connection.commit();
      
      res.status(201).json({
        success: true,
        transactions: createdTransactions
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating bulk transaction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  }
});

// POS/Sales APIs

// Get all sales
app.get('/api/sales', authenticateToken, branchFilter, async (req, res) => {
  try {
    let query = `
      SELECT s.*, u.name as created_by_name 
      FROM sales s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If branch_id is set, filter by it
    if (req.branch_id) {
      query += ` AND (s.branch_id = ? OR s.branch_id IS NULL)`;
      params.push(req.branch_id);
    }
    
    query += ` ORDER BY s.created_at DESC`;
    
    const [sales] = await pool.query(query, params);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales summary (for reporting)
app.get('/api/sales/summary', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    
    let groupBy;
    let dateFormat;
    
    // Define grouping based on period
    switch (period) {
      case 'daily':
        groupBy = 'DATE(created_at)';
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        groupBy = 'YEARWEEK(created_at)';
        dateFormat = '%Y-%u';
        break;
      case 'monthly':
        groupBy = 'MONTH(created_at), YEAR(created_at)';
        dateFormat = '%Y-%m';
        break;
      default:
        groupBy = 'DATE(created_at)';
        dateFormat = '%Y-%m-%d';
    }
    
    // Build query with optional date range
    let query = `
      SELECT 
        DATE_FORMAT(created_at, '${dateFormat}') as period,
        COUNT(*) as count,
        SUM(subtotal) as subtotal,
        SUM(tax) as tax,
        SUM(total) as total,
        SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_total,
        SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_total
      FROM sales
      WHERE (branch_id = ? OR branch_id IS NULL)
    `;
    
    const queryParams = [req.branch_id];
    
    if (startDate && endDate) {
      query += ` AND created_at BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    }
    
    query += ` GROUP BY ${groupBy} ORDER BY created_at ASC`;
    
    const [results] = await pool.execute(query, queryParams);
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales summary' });
  }
});

// Get sales by date range
app.get('/api/sales/by-date', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const [sales] = await pool.execute(`
      SELECT * FROM sales
      WHERE created_at BETWEEN ? AND ?
      AND (branch_id = ? OR branch_id IS NULL)
      ORDER BY created_at DESC
    `, [startDate, endDate, req.branch_id]);
    
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales by date:', error);
    res.status(500).json({ error: 'Failed to fetch sales by date' });
  }
});

// Get sale details with items
app.get('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's a number to ensure we're not matching 'summary' or other routes
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Get sale details
    const [sales] = await pool.execute(`
      SELECT * FROM sales
      WHERE id = ?
    `, [id]);
    
    if (sales.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = sales[0];
    
    // Get sale items
    const [saleItems] = await pool.execute(`
      SELECT si.*, i.name, i.sku, i.barcode
      FROM sale_items si
      JOIN inventory_items i ON si.item_id = i.id
      WHERE si.sale_id = ?
    `, [id]);
    
    // Return sale with items
    res.json({
      ...sale,
      items: saleItems
    });
  } catch (error) {
    console.error('Error fetching sale details:', error);
    res.status(500).json({ error: 'Failed to fetch sale details' });
  }
});

// Create a new sale
app.post('/api/sales', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { 
      items, 
      subtotal, 
      tax, 
      discount, 
      total, 
      payment_method, 
      customer_id, 
      customer_name,
      customer_email
    } = req.body;
    
    // Validate data
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided for sale' });
    }
    
    if (!payment_method) {
      return res.status(400).json({ message: 'Payment method is required' });
    }
    
    // Get user ID from token
    const userID = req.user.id;
    
    // Begin transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create sale record
      const [result] = await connection.query(
        'INSERT INTO sales (subtotal, tax, discount, total, payment_method, customer_id, customer_name, customer_email, created_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          subtotal, 
          tax, 
          discount || 0, 
          total, 
          payment_method, 
          customer_id || null, 
          customer_name || null,
          customer_email || null, 
          userID,
          req.branch_id || null
        ]
      );
      
      const saleId = result.insertId;
      
      // Process each item
      for (const item of items) {
        // Add item to sale_items
        await connection.query(
          'INSERT INTO sale_items (sale_id, item_id, quantity, price, total) VALUES (?, ?, ?, ?, ?)',
          [saleId, item.id, item.quantity, item.price, item.total]
        );
        
        // Update inventory quantity
        await connection.query(
          'UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?',
          [item.quantity, item.id]
        );
        
        // Record inventory transaction
        await connection.query(
          'INSERT INTO inventory_transactions (item_id, type, quantity, price, total_amount, notes, created_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            item.id, 
            'sale', 
            item.quantity, 
            item.price, 
            item.total, 
            `Sale #${saleId}`,
            userID,
            req.branch_id || null
          ]
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      res.status(201).json({ 
        id: saleId,
        message: 'Sale completed successfully'
      });
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error processing sale:', error);
    res.status(500).json({ message: 'Error processing sale', error: error.message });
  }
});

// Get all users with their roles and permissions
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT 
        u.*,
        r.name as role_name,
        r.description as role_description,
        GROUP_CONCAT(DISTINCT p.name) as permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all roles with their permissions
app.get('/api/roles', authenticateToken, async (req, res) => {
  try {
    const [roles] = await pool.execute(`
      SELECT 
        r.*,
        GROUP_CONCAT(DISTINCT p.name) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
      ORDER BY r.name
    `);
    
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Update user role
app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
  try {
    const { roleId } = req.body;
    const userId = req.params.id;
    
    await pool.execute(
      'UPDATE users SET role_id = ? WHERE id = ?',
      [roleId, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Update role permissions
app.put('/api/roles/:id/permissions', authenticateToken, async (req, res) => {
  try {
    const { permissions } = req.body;
    const roleId = req.params.id;
    
    const connection = await pool.getConnection();
    
    try {
      // Start transaction
      await connection.beginTransaction();
      
      // Remove existing permissions
      await connection.execute(
        'DELETE FROM role_permissions WHERE role_id = ?',
        [roleId]
      );
      
      // Add new permissions
      if (permissions && permissions.length > 0) {
        const values = permissions.map(permissionId => [roleId, permissionId]);
        await connection.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
          [values]
        );
      }
      
      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow deleting the last admin
    const [users] = await pool.execute(
      'SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "admin"'
    );
    
    if (users[0].count <= 1) {
      const [userToDelete] = await pool.execute(
        'SELECT r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
        [userId]
      );
      
      if (userToDelete[0]?.role_name === 'admin') {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }
    
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Create new user
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { name, email, password, role_id } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
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
      'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role_id]
    );
    
    // Get created user with role and permissions
    const [users] = await pool.execute(`
      SELECT 
        u.*,
        r.name as role_name,
        r.description as role_description,
        GROUP_CONCAT(DISTINCT p.name) as permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = ?
      GROUP BY u.id
    `, [result.insertId]);
    
    if (!users || users.length === 0) {
      throw new Error('Failed to retrieve created user');
    }
    
    const user = users[0];
    const { password: _, ...userWithoutPassword } = user;
    
    // Format response
    const newUser = {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      role_description: user.role_description,
      permissions: user.permissions,
      created_at: user.created_at
    };
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  }
});

// Subscriber routes
// Get all subscribers
app.get('/api/subscribers', authenticateToken, branchFilter, async (req, res) => {
  try {
    const [subscribers] = await pool.execute(`
      SELECT 
        s.*,
        COUNT(DISTINCT sub.id) as total_subscriptions,
        MAX(sub.end_date) as latest_end_date,
        CASE 
          WHEN MAX(sub.end_date) > CURRENT_DATE THEN 'active'
          WHEN MAX(sub.end_date) < CURRENT_DATE THEN 'expired'
          ELSE 'no_subscription'
        END as current_status
      FROM subscribers s
      LEFT JOIN subscriptions sub ON s.id = sub.subscriber_id
      WHERE s.branch_id = ? OR s.branch_id IS NULL
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [req.branch_id]);
    
    res.json(subscribers);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create subscriber
app.post('/api/subscribers', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { name, email, phone, address, date_of_birth, gender, emergency_contact, emergency_phone } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Check if email already exists
    if (email) {
      const [existingSubscribers] = await pool.execute(
        'SELECT * FROM subscribers WHERE email = ?',
        [email]
      );
      
      if (existingSubscribers.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    
    // Insert new subscriber with branch_id
    const [result] = await pool.execute(
      'INSERT INTO subscribers (name, email, phone, address, date_of_birth, gender, emergency_contact, emergency_phone, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email || null, phone || null, address || null, date_of_birth || null, gender || null, emergency_contact || null, emergency_phone || null, req.branch_id]
    );
    
    // Get the newly created subscriber
    const [subscribers] = await pool.execute(`
      SELECT 
        s.*,
        COUNT(DISTINCT sub.id) as total_subscriptions,
        MAX(sub.end_date) as latest_end_date,
        CASE 
          WHEN MAX(sub.end_date) > CURRENT_DATE THEN 'active'
          WHEN MAX(sub.end_date) < CURRENT_DATE THEN 'expired'
          ELSE 'no_subscription'
        END as current_status
      FROM subscribers s
      LEFT JOIN subscriptions sub ON s.id = sub.subscriber_id
      WHERE s.id = ?
      GROUP BY s.id
    `, [result.insertId]);
    
    res.status(201).json(subscribers[0]);
  } catch (error) {
    console.error('Error creating subscriber:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update subscriber
app.put('/api/subscribers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, date_of_birth, gender, emergency_contact, emergency_phone } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Check if subscriber exists
    const [existingSubscribers] = await pool.execute('SELECT * FROM subscribers WHERE id = ?', [id]);
    if (existingSubscribers.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Check if email already exists (for another subscriber)
    if (email) {
      const [existingSubscribers] = await pool.execute(
        'SELECT * FROM subscribers WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existingSubscribers.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    
    // Update subscriber
    await pool.execute(
      'UPDATE subscribers SET name = ?, email = ?, phone = ?, address = ?, date_of_birth = ?, gender = ?, emergency_contact = ?, emergency_phone = ? WHERE id = ?',
      [name, email || null, phone || null, address || null, date_of_birth || null, gender || null, emergency_contact || null, emergency_phone || null, id]
    );
    
    // Get updated subscriber
    const [subscribers] = await pool.execute(`
      SELECT 
        s.*,
        COUNT(DISTINCT sub.id) as total_subscriptions,
        MAX(sub.end_date) as latest_end_date,
        CASE 
          WHEN MAX(sub.end_date) > CURRENT_DATE THEN 'active'
          WHEN MAX(sub.end_date) < CURRENT_DATE THEN 'expired'
          ELSE 'no_subscription'
        END as current_status
      FROM subscribers s
      LEFT JOIN subscriptions sub ON s.id = sub.subscriber_id
      WHERE s.id = ?
      GROUP BY s.id
    `, [id]);
    
    res.json(subscribers[0]);
  } catch (error) {
    console.error('Error updating subscriber:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete subscriber
app.delete('/api/subscribers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if subscriber exists
    const [existingSubscribers] = await pool.execute('SELECT * FROM subscribers WHERE id = ?', [id]);
    if (existingSubscribers.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Delete subscriber (subscriptions will be deleted via CASCADE)
    await pool.execute('DELETE FROM subscribers WHERE id = ?', [id]);
    
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get subscriber's subscriptions
app.get('/api/subscribers/:id/subscriptions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if subscriber exists
    const [existingSubscribers] = await pool.execute('SELECT * FROM subscribers WHERE id = ?', [id]);
    if (existingSubscribers.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Get subscriptions with package details
    const [subscriptions] = await pool.execute(`
      SELECT 
        sub.*,
        p.name as package_name,
        p.days as package_days,
        p.price as package_price
      FROM subscriptions sub
      JOIN packages p ON sub.package_id = p.id
      WHERE sub.subscriber_id = ?
      ORDER BY sub.created_at DESC
    `, [id]);
    
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriber subscriptions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create subscription
app.post('/api/subscriptions', authenticateToken, async (req, res) => {
  try {
    const { subscriber_id, package_id, start_date, payment_method, notes } = req.body;
    
    // Validate required fields
    if (!subscriber_id || !package_id || !start_date || !payment_method) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if subscriber exists
    const [existingSubscribers] = await pool.execute('SELECT * FROM subscribers WHERE id = ?', [subscriber_id]);
    if (existingSubscribers.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Get package details
    const [packages] = await pool.execute('SELECT * FROM packages WHERE id = ?', [package_id]);
    if (packages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    const pkg = packages[0];
    
    // Calculate end date based on package days
    const end_date = new Date(start_date);
    end_date.setDate(end_date.getDate() + pkg.days);
    
    // Insert subscription
    const [result] = await pool.execute(
      'INSERT INTO subscriptions (subscriber_id, package_id, start_date, end_date, total_amount, payment_method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [subscriber_id, package_id, start_date, end_date, pkg.price, payment_method, notes || null, req.user.id]
    );
    
    // Get the newly created subscription with package details
    const [subscriptions] = await pool.execute(`
      SELECT 
        sub.*,
        p.name as package_name,
        p.days as package_days,
        p.price as package_price
      FROM subscriptions sub
      JOIN packages p ON sub.package_id = p.id
      WHERE sub.id = ?
    `, [result.insertId]);
    
    res.status(201).json(subscriptions[0]);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dashboard routes
// Get dashboard statistics
app.get('/api/dashboard/stats', authenticateToken, branchFilter, async (req, res) => {
  try {
    // Get total subscribers for this branch
    const [subscribersResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM subscribers WHERE branch_id = ? OR branch_id IS NULL',
      [req.branch_id]
    );
    const totalSubscribers = subscribersResult[0].total;

    // Get total sales and revenue for this branch
    const [salesResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total), 0) as total_revenue
      FROM sales
      WHERE (branch_id = ? OR branch_id IS NULL)
      AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
    `, [req.branch_id]);
    const { total_sales, total_revenue } = salesResult[0];

    // Get total inventory items for this branch
    const [inventoryResult] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM inventory_items i
      LEFT JOIN inventory_transactions t ON i.id = t.item_id
      WHERE t.branch_id = ? OR t.branch_id IS NULL
      GROUP BY i.id
    `, [req.branch_id]);
    
    const totalInventory = inventoryResult.length;

    res.json({
      totalSubscribers,
      totalSales: total_sales,
      totalInventory,
      totalRevenue: parseFloat(total_revenue)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent activities
app.get('/api/dashboard/recent-activities', authenticateToken, branchFilter, async (req, res) => {
  try {
    // Get recent sales for this branch
    const [sales] = await pool.execute(`
      SELECT 
        'sale' as type,
        created_at,
        total as amount,
        payment_method,
        customer_name,
        customer_email
      FROM sales
      WHERE branch_id = ? OR branch_id IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `, [req.branch_id]);

    // Get recent inventory transactions for this branch
    const [inventoryTransactions] = await pool.execute(`
      SELECT 
        'inventory' as type,
        t.created_at,
        t.total_amount as amount,
        t.type as transaction_type,
        i.name as item_name,
        t.quantity
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      WHERE t.branch_id = ? OR t.branch_id IS NULL
      ORDER BY t.created_at DESC
      LIMIT 5
    `, [req.branch_id]);

    // Combine and sort by date
    const activities = [...sales, ...inventoryTransactions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get sales by month
app.get('/api/dashboard/sales-by-month', authenticateToken, branchFilter, async (req, res) => {
  try {
    // Force MySQL to use the date value correctly
    const [sales] = await pool.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_sales
      FROM sales
      WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
      AND (branch_id = ? OR branch_id IS NULL)
      GROUP BY month
      ORDER BY month ASC
    `, [req.branch_id]);

    // If there's only one data point, add more data points for the graph
    if (sales.length <= 1) {
      // Get current date and calculate the past 6 months
      const today = new Date();
      const monthsData = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Check if we have data for this month
        const existingData = sales.find(sale => sale.month === monthStr);
        
        if (existingData) {
          monthsData.push({
            ...existingData,
            total_sales: parseFloat(existingData.total_sales)
          });
        } else {
          // Add empty data for this month
          monthsData.push({
            month: monthStr,
            count: 0,
            total_sales: 0
          });
        }
      }
      
      res.json(monthsData);
    } else {
      // Return the existing data with proper type conversion
      res.json(sales.map(sale => ({
        ...sale,
        total_sales: parseFloat(sale.total_sales)
      })));
    }
  } catch (error) {
    console.error('Error fetching sales by month:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get low stock items
app.get('/api/dashboard/low-stock', authenticateToken, branchFilter, async (req, res) => {
  try {
    const [items] = await pool.execute(`
      SELECT 
        i.id,
        i.name,
        i.sku,
        i.quantity,
        i.price,
        i.cost
      FROM inventory_items i
      LEFT JOIN inventory_transactions t ON i.id = t.item_id
      WHERE i.quantity <= 10
      AND (t.branch_id = ? OR t.branch_id IS NULL)
      GROUP BY i.id
      ORDER BY i.quantity ASC
      LIMIT 5
    `, [req.branch_id]);

    res.json(items.map(item => ({
      ...item,
      price: parseFloat(item.price),
      cost: parseFloat(item.cost)
    })));
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Companies routes
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    const [companies] = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    
    // Convert binary logo data to base64 for frontend display
    const processedCompanies = companies.map(company => {
      if (company.logo) {
        company.logo = company.logo.toString('base64');
      }
      return company;
    });
    
    res.json(processedCompanies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

app.post('/api/companies', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const { name, registration_number, vat_number, address, id_nat, logo_type } = req.body;
    const logo = req.file ? req.file.buffer : null;

    const [result] = await pool.query(
      'INSERT INTO companies (name, registration_number, vat_number, address, id_nat, logo, logo_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, registration_number, vat_number, address, id_nat, logo, logo_type]
    );

    res.status(201).json({ id: result.insertId, message: 'Company created successfully' });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

app.put('/api/companies/:id', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, registration_number, vat_number, address, id_nat, logo_type } = req.body;
    const logo = req.file ? req.file.buffer : null;

    let query = 'UPDATE companies SET name = ?, registration_number = ?, vat_number = ?, address = ?, id_nat = ?, logo_type = ?';
    let params = [name, registration_number, vat_number, address, id_nat, logo_type];

    if (logo) {
      query += ', logo = ?';
      params.push(logo);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    res.json({ message: 'Company updated successfully' });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

app.delete('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM companies WHERE id = ?', [id]);
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// ======================= BRANCH ROUTES =======================

// Get all branches with company names
app.get('/api/branches', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.name as company_name
      FROM branches b
      JOIN companies c ON b.company_id = c.id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Get a single branch by ID
app.get('/api/branches/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM branches WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
});

// Create a new branch
app.post('/api/branches', authenticateToken, async (req, res) => {
  try {
    const { name, company_id, address, phone, email, manager_name, is_main } = req.body;
    
    // Validate required fields
    if (!name || !company_id) {
      return res.status(400).json({ error: 'Name and company ID are required' });
    }
    
    // Check if company exists
    const [companyRows] = await pool.query('SELECT id FROM companies WHERE id = ?', [company_id]);
    if (companyRows.length === 0) {
      return res.status(400).json({ error: 'Company does not exist' });
    }
    
    // If this is set as main branch, update all other branches of this company to not be main
    if (is_main) {
      await pool.query('UPDATE branches SET is_main = 0 WHERE company_id = ?', [company_id]);
    }
    
    // Insert new branch
    const [result] = await pool.query(
      'INSERT INTO branches (name, company_id, address, phone, email, manager_name, is_main) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, company_id, address, phone, email, manager_name, is_main ? 1 : 0]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Branch created successfully' });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// Update a branch
app.put('/api/branches/:id', authenticateToken, async (req, res) => {
  try {
    const { name, company_id, address, phone, email, manager_name, is_main } = req.body;
    const branchId = req.params.id;
    
    // Validate required fields
    if (!name || !company_id) {
      return res.status(400).json({ error: 'Name and company ID are required' });
    }
    
    // Check if company exists
    const [companyRows] = await pool.query('SELECT id FROM companies WHERE id = ?', [company_id]);
    if (companyRows.length === 0) {
      return res.status(400).json({ error: 'Company does not exist' });
    }
    
    // Check if branch exists
    const [branchRows] = await pool.query('SELECT id FROM branches WHERE id = ?', [branchId]);
    if (branchRows.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    // If this is set as main branch, update all other branches of this company to not be main
    if (is_main) {
      await pool.query('UPDATE branches SET is_main = 0 WHERE company_id = ? AND id != ?', [company_id, branchId]);
    }
    
    // Update branch
    await pool.query(
      'UPDATE branches SET name = ?, company_id = ?, address = ?, phone = ?, email = ?, manager_name = ?, is_main = ? WHERE id = ?',
      [name, company_id, address, phone, email, manager_name, is_main ? 1 : 0, branchId]
    );
    
    res.json({ message: 'Branch updated successfully' });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

// Delete a branch
app.delete('/api/branches/:id', authenticateToken, async (req, res) => {
  try {
    const branchId = req.params.id;
    
    // Check if branch exists
    const [rows] = await pool.query('SELECT * FROM branches WHERE id = ?', [branchId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    await pool.query('DELETE FROM branches WHERE id = ?', [branchId]);
    
    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

// ======================= USER-BRANCH ROUTES =======================

// Get user's branches
app.get('/api/users/:userId/branches', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's branches with company info
    const [branches] = await pool.query(`
      SELECT ub.id, ub.user_id, ub.branch_id, 
             b.name as branch_name, b.is_main, 
             c.id as company_id, c.name as company_name
      FROM user_branches ub
      JOIN branches b ON ub.branch_id = b.id
      JOIN companies c ON b.company_id = c.id
      WHERE ub.user_id = ?
      ORDER BY c.name, b.name
    `, [userId]);
    
    res.json(branches);
  } catch (error) {
    console.error('Error fetching user branches:', error);
    res.status(500).json({ error: 'Failed to fetch user branches' });
  }
});

// Assign branch to user
app.post('/api/users/:userId/branches', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { branchId } = req.body;
    
    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }
    
    // Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if branch exists
    const [branches] = await pool.query('SELECT id FROM branches WHERE id = ?', [branchId]);
    if (branches.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    // Check if assignment already exists
    const [existingAssignments] = await pool.query(
      'SELECT id FROM user_branches WHERE user_id = ? AND branch_id = ?',
      [userId, branchId]
    );
    
    if (existingAssignments.length > 0) {
      return res.status(400).json({ error: 'Branch already assigned to this user' });
    }
    
    // Create assignment
    await pool.query(
      'INSERT INTO user_branches (user_id, branch_id) VALUES (?, ?)',
      [userId, branchId]
    );
    
    res.status(201).json({ message: 'Branch assigned to user successfully' });
  } catch (error) {
    console.error('Error assigning branch to user:', error);
    res.status(500).json({ error: 'Failed to assign branch to user' });
  }
});

// Remove branch assignment from user
app.delete('/api/users/:userId/branches/:branchId', authenticateToken, async (req, res) => {
  try {
    const { userId, branchId } = req.params;
    
    // Check if assignment exists
    const [existingAssignments] = await pool.query(
      'SELECT id FROM user_branches WHERE user_id = ? AND branch_id = ?',
      [userId, branchId]
    );
    
    if (existingAssignments.length === 0) {
      return res.status(404).json({ error: 'Branch assignment not found' });
    }
    
    // Delete assignment
    await pool.query(
      'DELETE FROM user_branches WHERE user_id = ? AND branch_id = ?',
      [userId, branchId]
    );
    
    // If this was the user's selected branch, unset it
    await pool.query(
      'UPDATE users SET selected_branch_id = NULL WHERE id = ? AND selected_branch_id = ?',
      [userId, branchId]
    );
    
    res.json({ message: 'Branch assignment removed successfully' });
  } catch (error) {
    console.error('Error removing branch assignment:', error);
    res.status(500).json({ error: 'Failed to remove branch assignment' });
  }
});

// Set user's selected branch
app.put('/api/users/:userId/selected-branch', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { branchId } = req.body;
    
    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }
    
    // Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if branch exists
    const [branches] = await pool.query('SELECT id FROM branches WHERE id = ?', [branchId]);
    if (branches.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    // Check if branch is assigned to user
    const [assignments] = await pool.query(
      'SELECT id FROM user_branches WHERE user_id = ? AND branch_id = ?',
      [userId, branchId]
    );
    
    if (assignments.length === 0) {
      return res.status(400).json({ error: 'Branch is not assigned to this user' });
    }
    
    // Update user's selected branch
    await pool.query(
      'UPDATE users SET selected_branch_id = ? WHERE id = ?',
      [branchId, userId]
    );
    
    res.json({ message: 'Selected branch updated successfully' });
  } catch (error) {
    console.error('Error updating selected branch:', error);
    res.status(500).json({ error: 'Failed to update selected branch' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server with error handling
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    pool.end(() => {
      console.log('Database connection closed.');
      process.exit(0);
    });
  });
});

// Simple direct endpoint for inventory transactions
app.get('/api/transactions-direct', authenticateToken, branchFilter, async (req, res) => {
  try {
    let query = `
      SELECT t.*, i.name as item_name, i.sku as item_sku, u.name as created_by_name
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.branch_id = ? OR t.branch_id IS NULL)  
      ORDER BY t.created_at DESC
      LIMIT 100
    `;

    const [transactions] = await pool.execute(query, [req.branch_id]);

    // Format response
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id.toString(),
      itemId: transaction.item_id.toString(),
      itemName: transaction.item_name,
      itemSku: transaction.item_sku,
      type: transaction.type,
      quantity: parseInt(transaction.quantity) || 0,
      price: transaction.price ? parseFloat(transaction.price) : null,
      totalAmount: parseFloat(transaction.total_amount) || 0,
      notes: transaction.notes || '',
      customerSupplier: transaction.customer_supplier || '',
      paymentStatus: transaction.payment_status || '',
      createdBy: transaction.created_by ? transaction.created_by.toString() : null,
      createdByName: transaction.created_by_name || 'System',
      createdAt: transaction.created_at
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  }
}); 