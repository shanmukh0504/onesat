use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;

/// Status of a deposit operation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "text", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum DepositStatus {
    /// Initial state when deposit is created
    Created,
    /// User has initiated the deposit transaction
    Initiated,
    /// Deposit has been confirmed on-chain
    Deposited,
}

impl std::fmt::Display for DepositStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DepositStatus::Created => write!(f, "created"),
            DepositStatus::Initiated => write!(f, "initiated"),
            DepositStatus::Deposited => write!(f, "deposited"),
        }
    }
}

/// Response containing deposit details
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct DepositResponse {
    /// Unique deposit identifier (32 bytes as hex string)
    #[sqlx(skip)]
    pub deposit_id: String,
    /// User's wallet address
    pub user_address: String,
    /// Action type identifier
    #[sqlx(try_from = "i64")]
    pub action: u128,
    /// Deposit amount
    #[serde(serialize_with = "serialize_bigdecimal_as_string")]
    pub amount: BigDecimal,
    /// Token contract address
    pub token: String,
    /// Target address for the deposit
    pub target_address: String,
    /// Generated deposit address from registry
    pub deposit_address: String,
    /// Current status of the deposit
    pub status: DepositStatus,
    /// Timestamp when deposit was created
    #[sqlx(rename = "created_at")]
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// Custom serializer for BigDecimal to ensure it's serialized as a plain string
fn serialize_bigdecimal_as_string<S>(value: &BigDecimal, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&value.to_string())
}
