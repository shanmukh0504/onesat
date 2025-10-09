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
}
