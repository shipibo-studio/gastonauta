-- =====================================================
-- Gastonauta Database Schema for Supabase
-- Migration: 001_initial_schema
-- Stores email notifications from Banco de Chile
-- and parsed transaction data
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main transactions table
CREATE TABLE IF NOT EXISTS transactions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Email metadata
    email_date TIMESTAMP WITH TIME ZONE,
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    message_id VARCHAR(255) UNIQUE,
    subject VARCHAR(500),
    
    -- Raw email content
    body_raw TEXT,
    body_plain TEXT,
    body_html TEXT,
    
    -- Parsed transaction data
    customer_name VARCHAR(255),
    amount DECIMAL(12, 2),
    account_last4 VARCHAR(4),
    merchant VARCHAR(255),
    transaction_date TIMESTAMP WITH TIME ZONE,
    
    -- Email source tracking
    sender_bank VARCHAR(100) DEFAULT 'Banco de Chile',
    email_type VARCHAR(50) DEFAULT 'transaction_notification',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_email_date ON transactions(email_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_message_id ON transactions(message_id);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_name ON transactions(customer_name);

-- Composite index for monthly summaries (transaction_date + amount)
CREATE INDEX IF NOT EXISTS idx_transactions_date_amount ON transactions(transaction_date, amount);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Categories table for future categorization
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default categories for banking transactions
INSERT INTO categories (name, color, icon) VALUES
    ('Supermercado', '#22c55e', 'shopping-cart'),
    ('Combustible', '#f97316', 'fuel'),
    ('Restaurante', '#ec4899', 'utensils'),
    ('Transporte', '#3b82f6', 'car'),
    ('Servicios', '#8b5cf6', 'zap'),
    ('Entretenimiento', '#f43f5e', 'gamepad-2'),
    ('Otros', '#6b7280', 'circle-help')
ON CONFLICT (name) DO NOTHING;

-- Monthly summary view for dashboard
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
    DATE_TRUNC('month', transaction_date) AS month,
    COUNT(*) AS total_transactions,
    SUM(amount) AS total_amount,
    AVG(amount) AS average_amount,
    MAX(amount) AS max_transaction,
    MIN(amount) AS min_transaction
FROM transactions
WHERE transaction_date IS NOT NULL
GROUP BY DATE_TRUNC('month', transaction_date)
ORDER BY month DESC;

-- Daily transactions view
CREATE OR REPLACE VIEW daily_transactions AS
SELECT 
    DATE(transaction_date) AS date,
    COUNT(*) AS count,
    SUM(amount) AS total
FROM transactions
WHERE transaction_date IS NOT NULL
GROUP BY DATE(transaction_date)
ORDER BY date DESC;

-- RLS (Row Level Security) - Optional for additional security
-- Uncomment if needed:
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own transactions" ON transactions
--     FOR SELECT USING (true);
-- CREATE POLICY "Users can insert own transactions" ON transactions
--     FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update own transactions" ON transactions
--     FOR UPDATE USING (true);
-- CREATE POLICY "Users can delete own transactions" ON transactions
--     FOR DELETE USING (true);

-- Comments for documentation
COMMENT ON TABLE transactions IS 'Stores email transaction notifications from Banco de Chile and parsed transaction data';
COMMENT ON COLUMN transactions.email_date IS 'Timestamp when the email was received';
COMMENT ON COLUMN transactions.customer_name IS 'Name extracted from the email body';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in Chilean pesos';
COMMENT ON COLUMN transactions.account_last4 IS 'Last 4 digits of the account used';
COMMENT ON COLUMN transactions.merchant IS 'Merchant/store name where the transaction was made';
COMMENT ON COLUMN transactions.transaction_date IS 'Date and time when the transaction occurred';
