const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get all companies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [companies] = await db.query('SELECT * FROM companies ORDER BY created_at DESC');
    // Convert logo blobs to base64 strings
    companies.forEach(company => {
      if (company.logo) {
        company.logo = company.logo.toString('base64');
      }
    });
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get a single company
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [company] = await db.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (company.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    if (company[0].logo) {
      company[0].logo = company[0].logo.toString('base64');
    }
    res.json(company[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Create a new company
router.post('/', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const { name, registration_number, vat_number, address, id_net } = req.body;
    const logo = req.file ? req.file.buffer : null;

    // Check for duplicate registration number, VAT number, or ID Net
    const [existing] = await db.query(
      'SELECT * FROM companies WHERE registration_number = ? OR vat_number = ? OR id_net = ?',
      [registration_number, vat_number, id_net]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Registration number, VAT number, or ID Net already exists' });
    }

    const [result] = await db.query(
      'INSERT INTO companies (name, registration_number, vat_number, address, id_net, logo) VALUES (?, ?, ?, ?, ?, ?)',
      [name, registration_number, vat_number, address, id_net, logo]
    );

    const [newCompany] = await db.query('SELECT * FROM companies WHERE id = ?', [result.insertId]);
    if (newCompany[0].logo) {
      newCompany[0].logo = newCompany[0].logo.toString('base64');
    }
    res.status(201).json(newCompany[0]);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update a company
router.put('/:id', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const { name, registration_number, vat_number, address, id_net } = req.body;
    const logo = req.file ? req.file.buffer : null;

    // Check for duplicate registration number, VAT number, or ID Net (excluding current company)
    const [existing] = await db.query(
      'SELECT * FROM companies WHERE (registration_number = ? OR vat_number = ? OR id_net = ?) AND id != ?',
      [registration_number, vat_number, id_net, req.params.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Registration number, VAT number, or ID Net already exists' });
    }

    let query = 'UPDATE companies SET name = ?, registration_number = ?, vat_number = ?, address = ?, id_net = ?';
    let params = [name, registration_number, vat_number, address, id_net];

    if (logo) {
      query += ', logo = ?';
      params.push(logo);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await db.query(query, params);

    const [updatedCompany] = await db.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (updatedCompany[0].logo) {
      updatedCompany[0].logo = updatedCompany[0].logo.toString('base64');
    }
    res.json(updatedCompany[0]);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete a company
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

module.exports = router; 