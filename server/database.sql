-- Create database
CREATE DATABASE IF NOT EXISTS flexigym;
USE flexigym;

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Modify users table to include branch_id
ALTER TABLE users ADD COLUMN branch_id VARCHAR(36);
ALTER TABLE users ADD FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Modify inventory_items table to include branch_id
ALTER TABLE inventory_items ADD COLUMN branch_id VARCHAR(36);
ALTER TABLE inventory_items ADD FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Modify inventory_transactions table to include branch_id
ALTER TABLE inventory_transactions ADD COLUMN branch_id VARCHAR(36);
ALTER TABLE inventory_transactions ADD FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Modify subscribers table to include branch_id
ALTER TABLE subscribers ADD COLUMN branch_id VARCHAR(36);
ALTER TABLE subscribers ADD FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Modify subscriptions table to include branch_id
ALTER TABLE subscriptions ADD COLUMN branch_id VARCHAR(36);
ALTER TABLE subscriptions ADD FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Modify sales table to include branch_id
ALTER TABLE sales ADD COLUMN branch_id VARCHAR(36);
ALTER TABLE sales ADD FOREIGN KEY (branch_id) REFERENCES branches(id);

-- Insert default branch
INSERT INTO branches (id, name, address, phone, email) 
VALUES (UUID(), 'Main Branch', '123 Main St', '+1234567890', 'main@flexigym.com');

-- Update existing records to use the default branch
UPDATE users SET branch_id = (SELECT id FROM branches LIMIT 1);
UPDATE inventory_items SET branch_id = (SELECT id FROM branches LIMIT 1);
UPDATE inventory_transactions SET branch_id = (SELECT id FROM branches LIMIT 1);
UPDATE subscribers SET branch_id = (SELECT id FROM branches LIMIT 1);
UPDATE subscriptions SET branch_id = (SELECT id FROM branches LIMIT 1);
UPDATE sales SET branch_id = (SELECT id FROM branches LIMIT 1);

-- ... rest of the existing tables ... 