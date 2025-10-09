# Database Migrations

This directory contains SQL migrations for the OneSat API database.

## Structure

Migrations are numbered and include both "up" (apply) and "down" (rollback) files:

- `YYYYMMDDHHMMSS_description.up.sql` - Creates/modifies database objects
- `YYYYMMDDHHMMSS_description.down.sql` - Reverses the changes

## Automatic Migration

Migrations run automatically when the `OrderbookProvider` is initialized via `from_db_url()`.

The application will:
1. Connect to the database
2. Check for pending migrations
3. Apply any new migrations in order
4. Log the results

## Manual Migration (Development)

### Using sqlx-cli

Install sqlx-cli:
```bash
cargo install sqlx-cli --no-default-features --features postgres
```

### Create a new migration:
```bash
sqlx migrate add <description>
```

### Run migrations manually:
```bash
sqlx migrate run --database-url "postgresql://user:password@localhost/dbname"
```

### Revert last migration:
```bash
sqlx migrate revert --database-url "postgresql://user:password@localhost/dbname"
```

### Check migration status:
```bash
sqlx migrate info --database-url "postgresql://user:password@localhost/dbname"
```

## Current Migrations

### 20241009000001_create_deposits_table

Creates the `deposits` table for tracking user deposit operations.

**Fields:**
- `deposit_id` - Unique 32-byte identifier as hex string (TEXT PRIMARY KEY)
- `user_address` - User's wallet address (TEXT)
- `action` - Action type identifier (BIGINT)
- `amount` - Deposit amount (NUMERIC)
- `token` - Token contract address (TEXT)
- `target_address` - Target address for deposit (TEXT)
- `deposit_address` - Generated deposit address from registry contract (TEXT)
- `status` - Current status: 'created', 'initiated', or 'deposited' (TEXT)
- `created_at` - Timestamp when deposit was created (TIMESTAMP WITH TIME ZONE)
- `updated_at` - Timestamp when deposit was last updated (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- Primary key on `deposit_id`
- Index on `user_address` for user queries
- Index on `status` for filtering by status
- Index on `created_at` for sorting
- Composite index on `(user_address, status)` for combined queries

