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
app.get('/api/packages', async (req, res) => {
  try {
    const [packages] = await pool.query('SELECT * FROM packages');
    
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
app.post('/api/packages', async (req, res) => {
  try {
    const { name, description, days, price, features, isPopular } = req.body;
    
    // Validate required fields
    if (!name || !days || price === undefined || !features || !Array.isArray(features)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Insert new package
    const [result] = await pool.execute(
      'INSERT INTO packages (name, description, days, price, features, is_popular) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || '', days, price, JSON.stringify(features), isPopular || false]
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
app.put('/api/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, days, price, features, isPopular } = req.body;
    
    // Validate required fields
    if (!name || !days || price === undefined || !features || !Array.isArray(features)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if package exists
    const [existingPackages] = await pool.execute('SELECT * FROM packages WHERE id = ?', [id]);
    
    if (existingPackages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Update package
    await pool.execute(
      'UPDATE packages SET name = ?, description = ?, days = ?, price = ?, features = ?, is_popular = ? WHERE id = ?',
      [name, description || '', days, price, JSON.stringify(features), isPopular || false, id]
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
app.delete('/api/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if package exists
    const [existingPackages] = await pool.execute('SELECT * FROM packages WHERE id = ?', [id]);
    
    if (existingPackages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Delete package
    await pool.execute('DELETE FROM packages WHERE id = ?', [id]);
    
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ message: 'Server error' });
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
app.get('/api/inventory/transactions', authenticateToken, async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const branch_id = user?.selected_branch_id;
    
    let query = `
      SELECT t.*, i.name as item_name, i.sku as item_sku, u.name as created_by_name
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.branch_id = ? OR t.branch_id IS NULL OR 1=1)
      ORDER BY t.created_at DESC
      LIMIT 100
    `;

    const [transactions] = await pool.execute(query, [branch_id || null]);

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

// Also add a standalone /api/transactions endpoint for the new URL pattern
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const user = getUserFromToken(req);
    const branch_id = user?.selected_branch_id;
    
    let query = `
      SELECT t.*, i.name as item_name, i.sku as item_sku, u.name as created_by_name
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.branch_id = ? OR t.branch_id IS NULL OR 1=1)
      ORDER BY t.created_at DESC
      LIMIT 100
    `;

    const [transactions] = await pool.execute(query, [branch_id || null]);

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