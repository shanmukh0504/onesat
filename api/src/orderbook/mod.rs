use bigdecimal::BigDecimal;
use eyre::Result;
use sqlx::{Pool, Postgres};

use crate::primitives::DepositResponse;

pub struct OrderbookProvider {
    pub pool: Pool<Postgres>,
}

impl OrderbookProvider {
    pub fn new(pool: Pool<Postgres>) -> Self {
        OrderbookProvider { pool }
    }

    pub async fn from_db_url(db_url: &str) -> Result<Self> {
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(2000)
            .connect(db_url)
            .await?;
        sqlx::migrate!("./migrations").run(&pool).await?;
        Ok(Self::new(pool))
    }

    /// Creates a new deposit record in the database
    ///
    /// # Arguments
    /// * `deposit_id` - Unique deposit identifier as hex string
    /// * `user_address` - User's wallet address
    /// * `action` - Action type identifier
    /// * `amount` - Deposit amount
    /// * `token` - Token contract address
    /// * `target_address` - Target address for the deposit
    /// * `deposit_address` - Generated deposit address from registry contract
    ///
    /// # Returns
    /// The created deposit record
    pub async fn create_deposit(
        &self,
        deposit_id: &str,
        user_address: &str,
        action: u128,
        amount: &BigDecimal,
        token: &str,
        target_address: &str,
        deposit_address: &str,
    ) -> Result<DepositResponse> {
        let deposit = sqlx::query_as::<_, DepositResponse>(
            r#"
            INSERT INTO deposits (
                deposit_id, user_address, action, amount, 
                token, target_address, deposit_address, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING 
                deposit_id,
                user_address,
                action,
                amount,
                token,
                target_address,
                deposit_address,
                status,
                created_at
            "#,
        )
        .bind(deposit_id)
        .bind(user_address)
        .bind(action as i64)
        .bind(amount)
        .bind(token)
        .bind(target_address)
        .bind(deposit_address)
        .bind("created")
        .fetch_one(&self.pool)
        .await?;

        Ok(deposit)
    }

    /// Retrieves a deposit by its ID
    ///
    /// # Arguments
    /// * `deposit_id` - The deposit ID as a hex string (with or without 0x prefix)
    ///
    /// # Returns
    /// The deposit record if found, None otherwise
    pub async fn get_deposit(&self, deposit_id: &str) -> Result<Option<DepositResponse>> {
        let deposit = sqlx::query_as::<_, DepositResponse>(
            r#"
            SELECT 
                deposit_id,
                user_address,
                action,
                amount,
                token,
                target_address,
                deposit_address,
                status,
                created_at
            FROM deposits
            WHERE deposit_id = $1
            "#,
        )
        .bind(deposit_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(deposit)
    }

    /// Retrieves all deposits with a specific status
    ///
    /// # Arguments
    /// * `status` - The status to filter by ("created", "initiated", or "deposited")
    ///
    /// # Returns
    /// A list of deposits matching the status
    pub async fn get_deposits_by_status(&self, status: &str) -> Result<Vec<DepositResponse>> {
        let deposits = sqlx::query_as::<_, DepositResponse>(
            r#"
            SELECT 
                deposit_id,
                user_address,
                action,
                amount,
                token,
                target_address,
                deposit_address,
                status,
                created_at
            FROM deposits
            WHERE status = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(status)
        .fetch_all(&self.pool)
        .await?;

        Ok(deposits)
    }
}
