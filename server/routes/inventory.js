const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, branchFilter } = require('../middleware/auth');
const { validateInventoryItem } = require('../middleware/validation');
const { formatError, formatInventoryItem, formatTransaction } = require('../utils/helpers');

// Get inventory items with pagination
router.get(['/', '/items'], authenticateToken, branchFilter, async (req, res) => {
  try {
    let query = `
      SELECT * FROM inventory_items
      WHERE branch_id = ? OR branch_id IS NULL
      ORDER BY name
    `;

    const [items] = await pool.execute(query, [req.branch_id]);

    // Format response
    const formattedItems = items.map(formatInventoryItem);

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Get single inventory item
router.get('/:id', authenticateToken, branchFilter, async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `SELECT * FROM inventory_items WHERE id = ?`;
    const params = [id];
    
    const [items] = await pool.query(query, params);
    
    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Format response
    const formattedItem = formatInventoryItem(items[0]);
    
    res.json(formattedItem);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Create inventory item
router.post('/', authenticateToken, branchFilter, validateInventoryItem, async (req, res) => {
  try {
    const { name, description, sku, barcode, quantity, price, cost, category, imageSrc } = req.body;
    
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
    
    // Format response
    const newItem = formatInventoryItem(items[0]);
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Update inventory item
router.put('/:id', authenticateToken, branchFilter, validateInventoryItem, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sku, barcode, price, cost, category, imageSrc } = req.body;
    
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
    
    // Format response
    const updatedItem = formatInventoryItem(items[0]);
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Delete inventory item
router.delete('/:id', authenticateToken, branchFilter, async (req, res) => {
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
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Get all inventory transactions with pagination
router.get('/transactions', authenticateToken, branchFilter, async (req, res) => {
  try {
    let query = `
      SELECT t.*, i.name as item_name, i.sku as item_sku, u.name as created_by_name
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.branch_id = ? OR t.branch_id IS NULL OR 1=1
      ORDER BY t.created_at DESC
      LIMIT 100
    `;

    const [transactions] = await pool.execute(query, [req.branch_id]);

    // Format response
    const formattedTransactions = transactions.map(formatTransaction);

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Create inventory transaction (adjustment)
router.post('/transactions', authenticateToken, branchFilter, async (req, res) => {
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
    
    // Format response
    const newTransaction = formatTransaction(transactions[0]);
    
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error('Error creating inventory transaction:', error);
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Create multi-item transaction (bulk purchase/sale)
router.post('/bulk-transactions', authenticateToken, branchFilter, async (req, res) => {
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
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Get transactions for an item
router.get('/items/:id/transactions', authenticateToken, branchFilter, async (req, res) => {
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
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

module.exports = router; 