-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
    deposit_id BYTEA PRIMARY KEY,
    user_address TEXT NOT NULL,
    action BIGINT NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    token TEXT NOT NULL,
    target_address TEXT NOT NULL,
    deposit_address TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('created', 'initiated', 'deposited')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_address for faster queries
CREATE INDEX idx_deposits_user_address ON deposits(user_address);

-- Create index on status for faster filtering
CREATE INDEX idx_deposits_status ON deposits(status);

-- Create index on created_at for sorting
CREATE INDEX idx_deposits_created_at ON deposits(created_at DESC);

-- Create composite index for user queries
CREATE INDEX idx_deposits_user_status ON deposits(user_address, status);

