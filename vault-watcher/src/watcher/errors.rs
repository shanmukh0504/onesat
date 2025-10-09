use thiserror::Error;

/// Custom error types for Starknet interactions
///
/// This enum represents various errors that can occur during Starknet
/// contract interactions and transactions.
#[derive(Error, Debug)]
pub enum StarknetError {
    /// Error when receiving an invalid or unexpected response
    /// from the Starknet network
    #[error("Invalid response: {0}")]
    InvalidResponse(String),

    /// Error when a contract call fails during execution
    #[error("Contract call failed: {0}")]
    ContractCallFailed(String),

    /// Error when a transaction fails to execute
    #[error("Transaction execution failed: {0}")]
    TransactionFailed(String),

    /// Error when data cannot be properly formatted or parsed
    #[error("Invalid data format: {0}")]
    InvalidDataFormat(String),

    /// Error when the Starknet provider encounters an issue
    #[error("Provider error: {0}")]
    ProviderError(String),

    /// Catches any other error types not explicitly handled above
    #[error(transparent)]
    Other(#[from] eyre::Error),
}
