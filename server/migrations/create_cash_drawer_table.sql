CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('add', 'remove', 'sale', 'reset') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
); 