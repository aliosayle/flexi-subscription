-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    vat_number VARCHAR(50) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    id_net VARCHAR(50) NOT NULL UNIQUE,
    logo MEDIUMBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance
CREATE INDEX idx_registration_number ON companies(registration_number);
CREATE INDEX idx_vat_number ON companies(vat_number);
CREATE INDEX idx_id_net ON companies(id_net); 