-- Create the deposits table with new schema
CREATE TABLE IF NOT EXISTS deposits (
    deposit_id TEXT PRIMARY KEY,
    user_address TEXT NOT NULL,
    action BIGINT NOT NULL,
    amount DECIMAL NOT NULL,
    token TEXT NOT NULL,
    target_address TEXT NOT NULL,
    deposit_address TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('created', 'initiated', 'deposited')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deposit_tx_hash TEXT,
    atomiq_swap_id TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_deposits_user_address ON deposits(user_address);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at);
