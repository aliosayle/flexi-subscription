const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get current cash drawer balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const result = await db.get(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN type = 'sale' OR type = 'adjustment' THEN amount
          WHEN type = 'count' THEN -amount
        END
      ), 0) as balance
      FROM cash_drawer_transactions
    `);
    res.json({ balance: result.balance });
  } catch (error) {
    console.error('Error getting cash drawer balance:', error);
    res.status(500).json({ error: 'Failed to get cash drawer balance' });
  }
});

// Get cash drawer transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    let query = `
      SELECT ct.*, u.username as created_by_name
      FROM cash_drawer_transactions ct
      JOIN users u ON ct.created_by = u.id
    `;
    
    if (date) {
      query += ` WHERE DATE(ct.created_at) = DATE(?)`;
    }
    
    query += ` ORDER BY ct.created_at DESC`;
    
    const transactions = await db.all(query, date ? [date] : []);
    res.json(transactions);
  } catch (error) {
    console.error('Error getting cash drawer transactions:', error);
    res.status(500).json({ error: 'Failed to get cash drawer transactions' });
  }
});

// Add a new cash drawer transaction
router.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const { type, amount, notes } = req.body;
    const userId = req.user.id;

    if (!type || !amount) {
      return res.status(400).json({ error: 'Type and amount are required' });
    }

    if (!['sale', 'adjustment', 'count'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const result = await db.run(
      `INSERT INTO cash_drawer_transactions (type, amount, notes, created_by)
       VALUES (?, ?, ?, ?)`,
      [type, amount, notes, userId]
    );

    res.json({
      id: result.lastID,
      type,
      amount,
      notes,
      created_by: userId,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding cash drawer transaction:', error);
    res.status(500).json({ error: 'Failed to add cash drawer transaction' });
  }
});

module.exports = router; 