require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    // Create database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS flexigym');
    console.log('Database created or already exists');

    // Use the database
    await connection.query('USE flexigym');

    // Drop tables in correct order
    await connection.query('DROP TABLE IF EXISTS sale_items');
    await connection.query('DROP TABLE IF EXISTS sales');
    await connection.query('DROP TABLE IF EXISTS inventory_transactions');
    await connection.query('DROP TABLE IF EXISTS inventory_items');
    await connection.query('DROP TABLE IF EXISTS role_permissions');
    await connection.query('DROP TABLE IF EXISTS users');
    await connection.query('DROP TABLE IF EXISTS permissions');
    await connection.query('DROP TABLE IF EXISTS roles');
    console.log('Dropped existing tables');

    // Create roles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Roles table created');

    // Create permissions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Permissions table created');

    // Create role_permissions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT,
        permission_id INT,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);
    console.log('Role permissions table created');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
      )
    `);
    console.log('Users table created');

    // Create inventory_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        sku VARCHAR(50) NOT NULL UNIQUE,
        barcode VARCHAR(100),
        quantity INT NOT NULL DEFAULT 0,
        price DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2) NOT NULL,
        category VARCHAR(50),
        image_src TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Inventory items table created');

    // Create inventory_transactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_id INT NOT NULL,
        type ENUM('purchase', 'sale', 'adjustment_in', 'adjustment_out', 'beginning') NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2),
        total_amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        customer_supplier VARCHAR(100),
        payment_status VARCHAR(50),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Inventory transactions table created');

    // Create sales table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT PRIMARY KEY AUTO_INCREMENT,
        subtotal DECIMAL(10, 2) NOT NULL,
        tax DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0,
        total DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('cash', 'card') NOT NULL,
        customer_id INT,
        customer_name VARCHAR(100),
        customer_email VARCHAR(100),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Sales table created');

    // Create sale_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sale_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT
      )
    `);
    console.log('Sale items table created');

    // Insert default roles
    await connection.query(`
      INSERT INTO roles (name, description) VALUES 
      ('admin', 'Full system access'),
      ('manager', 'Can manage inventory, sales, and reports'),
      ('staff', 'Basic access for daily operations')
    `);
    console.log('Default roles created');

    // Insert default permissions
    await connection.query(`
      INSERT INTO permissions (name, description) VALUES 
      ('manage_users', 'Can manage users and roles'),
      ('manage_inventory', 'Can manage inventory items and transactions'),
      ('manage_sales', 'Can process sales and view reports'),
      ('view_reports', 'Can view reports and analytics')
    `);
    console.log('Default permissions created');

    // Assign permissions to roles
    const [roles] = await connection.query('SELECT id, name FROM roles');
    const [permissions] = await connection.query('SELECT id, name FROM permissions');

    // Create a map of role names to IDs
    const roleMap = roles.reduce((map, role) => {
      map[role.name] = role.id;
      return map;
    }, {});

    // Create a map of permission names to IDs
    const permissionMap = permissions.reduce((map, permission) => {
      map[permission.name] = permission.id;
      return map;
    }, {});

    // Assign all permissions to admin
    const adminPermissions = permissions.map(permission => [roleMap.admin, permission.id]);
    if (adminPermissions.length > 0) {
      await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [adminPermissions]);
    }

    // Assign specific permissions to manager
    const managerPermissions = [
      [roleMap.manager, permissionMap.manage_inventory],
      [roleMap.manager, permissionMap.manage_sales],
      [roleMap.manager, permissionMap.view_reports]
    ];
    await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [managerPermissions]);

    // Assign basic permissions to staff
    const staffPermissions = [
      [roleMap.staff, permissionMap.manage_sales]
    ];
    await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [staffPermissions]);

    console.log('Role permissions assigned');

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(`
      INSERT INTO users (name, email, password, role_id) 
      SELECT 'Admin User', 'admin@example.com', ?, r.id 
      FROM roles r 
      WHERE r.name = 'admin'
    `, [hashedPassword]);
    console.log('Default admin user created');

    console.log('Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase(); 