const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, branchFilter } = require('../middleware/auth');
const { formatError } = require('../utils/helpers');

// Get all sales
router.get('/', authenticateToken, branchFilter, async (req, res) => {
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
    const { statusCode, response } = formatError('Server error', error);
    res.status(statusCode).json(response);
  }
});

// Get sales summary (for reporting)
router.get('/summary', authenticateToken, async (req, res) => {
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
    
    const [results] = await pool.execute(query, queryParams);
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    const { statusCode, response } = formatError('Failed to fetch sales summary', error);
    res.status(statusCode).json(response);
  }
});

// Get sales by date range
router.get('/by-date', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const [sales] = await pool.execute(`
      SELECT * FROM sales
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
    `, [startDate, endDate]);
    
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales by date:', error);
    const { statusCode, response } = formatError('Failed to fetch sales by date', error);
    res.status(statusCode).json(response);
  }
});

// Get sale details with items
router.get('/:id', authenticateToken, async (req, res) => {
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
    const { statusCode, response } = formatError('Failed to fetch sale details', error);
    res.status(statusCode).json(response);
  }
});

// Create a new sale
router.post('/', authenticateToken, branchFilter, async (req, res) => {
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
          [saleId, item.itemId, item.quantity, item.price, item.totalPrice]
        );
        
        // Update inventory quantity
        await connection.query(
          'UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?',
          [item.quantity, item.itemId]
        );
        
        // Record inventory transaction
        await connection.query(
          'INSERT INTO inventory_transactions (item_id, type, quantity, price, total_amount, notes, created_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            item.itemId, 
            'sale', 
            item.quantity, 
            item.price, 
            item.totalPrice, 
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
    const { statusCode, response } = formatError('Error processing sale', error);
    res.status(statusCode).json(response);
  }
});

module.exports = router; 