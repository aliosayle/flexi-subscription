require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flexigym',
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

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware
app.use(express.json());

// Simple test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get user from database
    const [users] = await pool.execute(
      'SELECT u.*, r.name as role_name, r.description as role_description, GROUP_CONCAT(DISTINCT p.name) as permissions FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN role_permissions rp ON r.id = rp.role_id LEFT JOIN permissions p ON rp.permission_id = p.id WHERE u.email = ? GROUP BY u.id',
      [email]
    );
    
    const user = users[0];
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role_id: user.role_id,
        role_name: user.role_name,
        role_description: user.role_description,
        permissions: user.permissions
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Send response without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      ...userWithoutPassword,
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
    const [result] = await pool.query(
      'INSERT INTO packages (name, description, days, price, features, is_popular) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || '', days, price, JSON.stringify(features), isPopular || false]
    );
    
    // Get the newly created package
    const [packages] = await pool.query('SELECT * FROM packages WHERE id = ?', [result.insertId]);
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
    const [existingPackages] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
    
    if (existingPackages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Update package
    await pool.query(
      'UPDATE packages SET name = ?, description = ?, days = ?, price = ?, features = ?, is_popular = ? WHERE id = ?',
      [name, description || '', days, price, JSON.stringify(features), isPopular || false, id]
    );
    
    // Get updated package
    const [packages] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
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
    const [existingPackages] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
    
    if (existingPackages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Delete package
    await pool.query('DELETE FROM packages WHERE id = ?', [id]);
    
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//
// INVENTORY ROUTES
//

// Get all inventory items
app.get('/api/inventory/items', async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT * FROM inventory_items
      ORDER BY name ASC
    `);
    
    // Format response
    const formattedItems = items.map(item => ({
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
    }));
    
    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single inventory item
app.get('/api/inventory/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [items] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    
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

// Create inventory item
app.post('/api/inventory/items', async (req, res) => {
  try {
    const { name, description, sku, barcode, quantity, price, cost, category, imageSrc } = req.body;
    
    // Validate required fields
    if (!name || !sku || price === undefined || cost === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if SKU already exists
    const [existingSku] = await pool.query('SELECT * FROM inventory_items WHERE sku = ?', [sku]);
    if (existingSku.length > 0) {
      return res.status(400).json({ message: 'Item with this SKU already exists' });
    }
    
    // Insert new item
    const [result] = await pool.query(
      'INSERT INTO inventory_items (name, description, sku, barcode, quantity, price, cost, category, image_src) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', sku, barcode || '', quantity || 0, price, cost, category || '', imageSrc || '']
    );
    
    const itemId = result.insertId;
    
    // If there's an initial quantity, create a beginning transaction
    if (quantity && quantity > 0) {
      await pool.query(
        'INSERT INTO inventory_transactions (item_id, type, quantity, price, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [itemId, 'beginning', quantity, cost, cost * quantity, 'Initial inventory']
      );
    }
    
    // Get the newly created item
    const [items] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
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

// Update inventory item
app.put('/api/inventory/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sku, barcode, price, cost, category, imageSrc } = req.body;
    
    // Validate required fields
    if (!name || !sku || price === undefined || cost === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if item exists
    const [existingItems] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (existingItems.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if SKU already exists (for another item)
    const [existingSku] = await pool.query('SELECT * FROM inventory_items WHERE sku = ? AND id != ?', [sku, id]);
    if (existingSku.length > 0) {
      return res.status(400).json({ message: 'Another item with this SKU already exists' });
    }
    
    // Update item (don't update quantity here, that's handled via transactions)
    await pool.query(
      'UPDATE inventory_items SET name = ?, description = ?, sku = ?, barcode = ?, price = ?, cost = ?, category = ?, image_src = ? WHERE id = ?',
      [name, description || '', sku, barcode || '', price, cost, category || '', imageSrc || '', id]
    );
    
    // Get updated item
    const [items] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
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

// Delete inventory item
app.delete('/api/inventory/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const [existingItems] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (existingItems.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Delete item (transactions will be deleted via CASCADE)
    await pool.query('DELETE FROM inventory_items WHERE id = ?', [id]);
    
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
    const [existingItems] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (existingItems.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Get transactions
    const [transactions] = await pool.query(`
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

// Get all inventory transactions
app.get('/api/inventory/transactions', async (req, res) => {
  try {
    // Get transactions with item and user info
    const [transactions] = await pool.query(`
      SELECT t.*, i.name as item_name, i.sku as item_sku, u.name as created_by_name
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);
    
    // Format response
    const formattedTransactions = transactions.map(transaction => ({
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
    }));
    
    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create inventory transaction (adjustment)
app.post('/api/inventory/transactions', async (req, res) => {
  try {
    const { itemId, type, quantity, price, notes, customerSupplier, paymentStatus } = req.body;
    
    // Validate required fields
    if (!itemId || !type || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if item exists
    const [existingItems] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
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
    const [result] = await pool.query(
      'INSERT INTO inventory_transactions (item_id, type, quantity, price, total_amount, notes, customer_supplier, payment_status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [itemId, type, quantity, transactionPrice, totalAmount, notes || '', customerSupplier || '', paymentStatus || '', 1] // Assuming user id 1 for now
    );
    
    // Update item quantity
    await pool.query('UPDATE inventory_items SET quantity = ? WHERE id = ?', [newQuantity, itemId]);
    
    // Get the newly created transaction
    const [transactions] = await pool.query(`
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
    res.status(500).json({ error: 'Failed to create inventory transaction' });
  }
});

// Create multi-item transaction (bulk purchase/sale)
app.post('/api/inventory/bulk-transactions', async (req, res) => {
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
        const [existingItems] = await connection.query('SELECT * FROM inventory_items WHERE id = ?', [itemId]);
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
        const [result] = await connection.query(
          'INSERT INTO inventory_transactions (item_id, type, quantity, price, total_amount, notes, customer_supplier, payment_status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [itemId, type, quantity, transactionPrice, totalAmount, notes || '', customerSupplier || '', paymentStatus || '', 1] // Assuming user id 1
        );
        
        // Update item quantity
        await connection.query('UPDATE inventory_items SET quantity = ? WHERE id = ?', [newQuantity, itemId]);
        
        // Get the newly created transaction
        const [transactions] = await connection.query(`
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
          price: transaction.price ? parseFloat(transaction.price) : null,
          totalAmount: parseFloat(transaction.total_amount),
          notes: transaction.notes || '',
          customerSupplier: transaction.customer_supplier || '',
          paymentStatus: transaction.payment_status || '',
          createdAt: transaction.created_at
        });
      }
      
      // Commit the transaction
      await connection.commit();
      
      res.status(201).json(createdTransactions);
    } catch (error) {
      // Rollback the transaction
      await connection.rollback();
      throw error;
    } finally {
      // Release the connection
      connection.release();
    }
  } catch (error) {
    console.error('Error creating bulk inventory transaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POS/Sales APIs

// Get all sales
app.get('/api/sales', async (req, res) => {
  try {
    const [sales] = await pool.query(`
      SELECT * FROM sales
      ORDER BY created_at DESC
    `);
    
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get sales by date range
app.get('/api/sales/by-date', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const [sales] = await pool.query(`
      SELECT * FROM sales
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
    `, [startDate, endDate]);
    
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
    
    // Get sale details
    const [sales] = await pool.query(`
      SELECT * FROM sales
      WHERE id = ?
    `, [id]);
    
    if (sales.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const sale = sales[0];
    
    // Get sale items
    const [saleItems] = await pool.query(`
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
app.post('/api/sales', async (req, res) => {
  // Start a transaction to ensure all operations succeed or fail together
  const connection2 = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'flexigym'
  });
  
  await connection2.beginTransaction();
  
  try {
    const { 
      items, 
      subtotal, 
      tax, 
      discount = 0, 
      total, 
      paymentMethod,
      customer_id = null,
      customer_name = null,
      customer_email = null,
      created_by = null
    } = req.body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item' });
    }
    
    if (!subtotal || !tax || !total || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert sale record
    const [saleResult] = await connection2.query(`
      INSERT INTO sales 
      (subtotal, tax, discount, total, payment_method, customer_id, customer_name, customer_email, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [subtotal, tax, discount, total, paymentMethod, customer_id, customer_name, customer_email, created_by]);
    
    const saleId = saleResult.insertId;
    
    // Insert each sale item and create inventory transactions
    for (const item of items) {
      // Add sale item
      await connection2.query(`
        INSERT INTO sale_items 
        (sale_id, item_id, quantity, price, total)
        VALUES (?, ?, ?, ?, ?)
      `, [saleId, item.itemId, item.quantity, item.price, item.totalPrice]);
      
      // Update inventory quantity
      await connection2.query(`
        UPDATE inventory_items
        SET quantity = quantity - ?
        WHERE id = ?
      `, [item.quantity, item.itemId]);
      
      // Create inventory transaction for the sale
      await connection2.query(`
        INSERT INTO inventory_transactions 
        (item_id, type, quantity, price, total_amount, notes, created_by)
        VALUES (?, 'sale', ?, ?, ?, ?, ?)
      `, [item.itemId, item.quantity, item.price, item.totalPrice, `Sale ID: ${saleId}`, created_by]);
    }
    
    // Commit the transaction
    await connection2.commit();
    
    res.status(201).json({ 
      success: true, 
      message: 'Sale created successfully',
      saleId 
    });
  } catch (error) {
    // Rollback if there's an error
    await connection2.rollback();
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  } finally {
    connection2.end();
  }
});

// Get sales summary (for reporting)
app.get('/api/sales/summary', async (req, res) => {
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
    `;
    
    const queryParams = [];
    
    if (startDate && endDate) {
      query += ` WHERE created_at BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    }
    
    query += ` GROUP BY ${groupBy} ORDER BY created_at ASC`;
    
    const [results] = await pool.query(query, queryParams);
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales summary' });
  }
});

// Get all users with their roles and permissions
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(`
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
    const [roles] = await pool.query(`
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
    
    await pool.query(
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
      await connection.query(
        'DELETE FROM role_permissions WHERE role_id = ?',
        [roleId]
      );
      
      // Add new permissions
      if (permissions && permissions.length > 0) {
        const values = permissions.map(permissionId => [roleId, permissionId]);
        await connection.query(
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
    const [users] = await pool.query(
      'SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "admin"'
    );
    
    if (users[0].count <= 1) {
      const [userToDelete] = await pool.query(
        'SELECT r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
        [userId]
      );
      
      if (userToDelete[0]?.role_name === 'admin') {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }
    
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
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
    const [existingUsers] = await pool.query(
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
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role_id]
    );
    
    // Get created user with role and permissions
    const [users] = await pool.query(`
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
app.get('/api/subscribers', authenticateToken, async (req, res) => {
  try {
    const [subscribers] = await pool.query(`
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
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    
    res.json(subscribers);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create subscriber
app.post('/api/subscribers', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, date_of_birth, gender, emergency_contact, emergency_phone } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Check if email already exists
    if (email) {
      const [existingSubscribers] = await pool.query(
        'SELECT * FROM subscribers WHERE email = ?',
        [email]
      );
      
      if (existingSubscribers.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    
    // Insert new subscriber
    const [result] = await pool.query(
      'INSERT INTO subscribers (name, email, phone, address, date_of_birth, gender, emergency_contact, emergency_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email || null, phone || null, address || null, date_of_birth || null, gender || null, emergency_contact || null, emergency_phone || null]
    );
    
    // Get the newly created subscriber
    const [subscribers] = await pool.query(`
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
    const [existingSubscribers] = await pool.query('SELECT * FROM subscribers WHERE id = ?', [id]);
    if (existingSubscribers.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Check if email already exists (for another subscriber)
    if (email) {
      const [existingSubscribers] = await pool.query(
        'SELECT * FROM subscribers WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existingSubscribers.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }
    
    // Update subscriber
    await pool.query(
      'UPDATE subscribers SET name = ?, email = ?, phone = ?, address = ?, date_of_birth = ?, gender = ?, emergency_contact = ?, emergency_phone = ? WHERE id = ?',
      [name, email || null, phone || null, address || null, date_of_birth || null, gender || null, emergency_contact || null, emergency_phone || null, id]
    );
    
    // Get updated subscriber
    const [subscribers] = await pool.query(`
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
    const [existingSubscribers] = await pool.query('SELECT * FROM subscribers WHERE id = ?', [id]);
    if (existingSubscribers.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Delete subscriber (subscriptions will be deleted via CASCADE)
    await pool.query('DELETE FROM subscribers WHERE id = ?', [id]);
    
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
    const [existingSubscribers] = await pool.query('SELECT * FROM subscribers WHERE id = ?', [id]);
    if (existingSubscribers.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Get subscriptions with package details
    const [subscriptions] = await pool.query(`
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
    const [existingSubscribers] = await pool.query('SELECT * FROM subscribers WHERE id = ?', [subscriber_id]);
    if (existingSubscribers.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Get package details
    const [packages] = await pool.query('SELECT * FROM packages WHERE id = ?', [package_id]);
    if (packages.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    const pkg = packages[0];
    
    // Calculate end date based on package days
    const end_date = new Date(start_date);
    end_date.setDate(end_date.getDate() + pkg.days);
    
    // Insert subscription
    const [result] = await pool.query(
      'INSERT INTO subscriptions (subscriber_id, package_id, start_date, end_date, total_amount, payment_method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [subscriber_id, package_id, start_date, end_date, pkg.price, payment_method, notes || null, req.user.id]
    );
    
    // Get the newly created subscription with package details
    const [subscriptions] = await pool.query(`
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
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // Get total users
    const [usersResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    const totalUsers = usersResult[0].total;

    // Get total sales and revenue
    const [salesResult] = await pool.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total), 0) as total_revenue
      FROM sales
      WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
    `);
    const { total_sales, total_revenue } = salesResult[0];

    // Get total inventory items
    const [inventoryResult] = await pool.query('SELECT COUNT(*) as total FROM inventory_items');
    const totalInventory = inventoryResult[0].total;

    res.json({
      totalUsers,
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
app.get('/api/dashboard/recent-activities', authenticateToken, async (req, res) => {
  try {
    // Get recent sales
    const [sales] = await pool.query(`
      SELECT 
        'sale' as type,
        created_at,
        total as amount,
        payment_method,
        customer_name,
        customer_email
      FROM sales
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Get recent inventory transactions
    const [inventoryTransactions] = await pool.query(`
      SELECT 
        'inventory' as type,
        t.created_at,
        t.total_amount as amount,
        t.type as transaction_type,
        i.name as item_name,
        t.quantity
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

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
app.get('/api/dashboard/sales-by-month', authenticateToken, async (req, res) => {
  try {
    const [sales] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_sales
      FROM sales
      WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    res.json(sales.map(sale => ({
      ...sale,
      total_sales: parseFloat(sale.total_sales)
    })));
  } catch (error) {
    console.error('Error fetching sales by month:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get low stock items
app.get('/api/dashboard/low-stock', authenticateToken, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT 
        id,
        name,
        sku,
        quantity,
        price,
        cost
      FROM inventory_items
      WHERE quantity <= 10
      ORDER BY quantity ASC
      LIMIT 5
    `);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 