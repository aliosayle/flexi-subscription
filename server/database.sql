-- Cash Drawer Transactions Table
CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('sale', 'adjustment', 'count') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
); 