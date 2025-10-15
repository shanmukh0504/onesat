use eyre::Result;
use sqlx::{Pool, Postgres};

use crate::primitives::DepositResponse;

#[derive(Clone)]
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
        Ok(Self::new(pool))
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

    /// Updates the status of a deposit
    ///
    /// # Arguments
    /// * `deposit_id` - The deposit ID to update
    /// * `new_status` - The new status to set ("created", "initiated", or "deposited")
    ///
    /// # Returns
    /// Result indicating success or failure
    #[allow(dead_code)]
    pub async fn update_deposit_status(&self, deposit_id: &str, new_status: &str) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE deposits
            SET status = $1
            WHERE deposit_id = $2
            "#,
        )
        .bind(new_status)
        .bind(deposit_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Updates the transaction hash for a deposit
    ///
    /// # Arguments
    /// * `deposit_id` - The deposit ID to update
    /// * `tx_hash` - The transaction hash to set
    ///
    /// # Returns
    /// Result indicating success or failure
    #[allow(dead_code)]
    pub async fn update_deposit_tx_hash(&self, deposit_id: &str, tx_hash: &str) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE deposits
            SET deposit_tx_hash = $1
            WHERE deposit_id = $2
            "#,
        )
        .bind(tx_hash)
        .bind(deposit_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Updates both the status and transaction hash for a deposit
    ///
    /// # Arguments
    /// * `deposit_id` - The deposit ID to update
    /// * `new_status` - The new status to set ("created", "initiated", or "deposited")
    /// * `tx_hash` - The transaction hash to set
    ///
    /// # Returns
    /// Result indicating success or failure
    pub async fn update_deposit_status_and_tx_hash(
        &self,
        deposit_id: &str,
        new_status: &str,
        tx_hash: &str,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE deposits
            SET status = $1, deposit_tx_hash = $2
            WHERE deposit_id = $3
            "#,
        )
        .bind(new_status)
        .bind(tx_hash)
        .bind(deposit_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
