use bigdecimal::{BigDecimal, num_bigint};
use eyre::Result;
use starknet::{
    core::{
        types::{BlockId, BlockTag, Felt, FunctionCall},
        utils::get_selector_from_name,
    },
    providers::{JsonRpcClient, Provider, jsonrpc::HttpTransport},
};

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

    /// Error when the Starknet provider encounters an issue
    #[error("Provider error: {0}")]
    ProviderError(String),

    /// Catches any other error types not explicitly handled above
    #[error(transparent)]
    Other(#[from] eyre::Error),
}

#[derive(Clone)]
pub struct VaultRegistry {
    pub address: Felt,
    provider: JsonRpcClient<HttpTransport>,
}

impl VaultRegistry {
    /// Creates a new StarknetERC20 instance
    ///
    /// # Arguments
    /// * `address` - The ERC20 contract address
    /// * `account` - The account to interact with the contract
    pub fn new(address: Felt, provider: JsonRpcClient<HttpTransport>) -> Self {
        Self { address, provider }
    }

    /// Makes a read-only call to the contract
    ///
    /// # Arguments
    /// * `selector` - The function selector
    /// * `calldata` - The call data as vector of Felts
    async fn call_contract(
        &self,
        selector: &str,
        calldata: Vec<Felt>,
    ) -> Result<Vec<Felt>, StarknetError> {
        let execution_call = FunctionCall {
            contract_address: self.address,
            calldata,
            entry_point_selector: get_selector_from_name(selector).map_err(|e| {
                StarknetError::ContractCallFailed(format!("Invalid selector: {}", e))
            })?,
        };

        self.provider
            .call(execution_call, BlockId::Tag(BlockTag::Latest))
            .await
            .map_err(|e| StarknetError::ProviderError(e.to_string()))
    }

    /// Predicts the deposit address for a given set of parameters
    ///
    /// # Arguments
    /// * `user` - The user's wallet address
    /// * `action` - The action type identifier
    /// * `amount` - The deposit amount
    /// * `token` - The token contract address
    /// * `target` - The target address for the deposit
    ///
    /// # Returns
    /// The predicted deposit address as a Felt
    pub async fn predict_address(
        &self,
        user: &Felt,
        action: u128,
        amount: &BigDecimal,
        token: &Felt,
        target: &Felt,
    ) -> Result<Felt, StarknetError> {
        let (amount_low, amount_high) = bigdecimal_to_i128s(amount)?;
        let calldata = vec![
            user.clone(),
            Felt::from(action),
            Felt::from(amount_low),
            Felt::from(amount_high),
            token.clone(),
            target.clone(),
        ];
        let result = self.call_contract("predict_address", calldata).await?;

        // The contract should return the predicted address as the first element
        result.first().cloned().ok_or_else(|| {
            StarknetError::InvalidResponse("Empty response from predict_address".to_string())
        })
    }
}

/// Converts a BigDecimal value into a tuple of two i128 values
///
/// # Arguments
///
/// * `value` - A reference to a BigDecimal value to be converted
///
/// # Returns
///
/// * `Result<(i128, i128)>` - A Result containing a tuple of:
///   - First element: Lower 128 bits as i128
///   - Second element: Upper 128 bits as i128
///   Or an error if the conversion fails
pub fn bigdecimal_to_i128s(value: &BigDecimal) -> Result<(i128, i128)> {
    let (bigint, scale) = value.as_bigint_and_exponent();

    let adjusted_bigint = if scale < 0 {
        bigint * num_bigint::BigInt::from(10).pow(-scale as u32)
    } else if scale > 0 {
        bigint / num_bigint::BigInt::from(10).pow(scale as u32)
    } else {
        bigint
    };

    let bytes = adjusted_bigint.to_bytes_le().1;

    let mut padded_bytes = vec![0u8; 32];
    for (i, &byte) in bytes.iter().enumerate().take(32) {
        padded_bytes[i] = byte;
    }

    let low = i128::from_le_bytes(
        padded_bytes[0..16]
            .try_into()
            .map_err(|e| eyre::eyre!("Failed to convert low bytes to array: {}", e))?,
    );
    let high = i128::from_le_bytes(
        padded_bytes[16..32]
            .try_into()
            .map_err(|e| eyre::eyre!("Failed to convert high bytes to array: {}", e))?,
    );

    Ok((low, high))
}
