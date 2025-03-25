-- Cash Drawer Transactions Table
CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('sale', 'adjustment', 'count')),
    amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
); 