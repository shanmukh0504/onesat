use crate::watcher::errors::StarknetError;
use async_trait::async_trait;
use eyre::Result;
use starknet::{
    core::{
        types::{BlockId, BlockTag, Felt, FunctionCall, U256},
        utils::get_selector_from_name,
    },
    providers::{JsonRpcClient, Provider, jsonrpc::HttpTransport},
};

/// ERC20 token interface for Starknet
///
/// This trait defines the standard functions for interacting with ERC20 tokens
/// on the Starknet network.;
#[async_trait]
pub trait ERC20 {
    /// Returns the balance of the specified account
    ///
    /// # Arguments
    /// * `account` - The address to query the balance of
    async fn balance_of(&self, account: Felt) -> Result<U256, StarknetError>;
}

#[derive(Clone)]
pub struct StarknetERC20 {
    pub address: Felt,
    provider: JsonRpcClient<HttpTransport>,
}

impl StarknetERC20 {
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
}

#[async_trait]
impl ERC20 for StarknetERC20 {
    /// Get balance of an address
    ///
    /// # Arguments
    /// * `address` - The address to check balance for
    async fn balance_of(&self, account: Felt) -> Result<U256, StarknetError> {
        let res = self.call_contract("balance_of", vec![account]).await?;
        if res.len() != 2 {
            return Err(StarknetError::InvalidResponse(format!(
                "Invalid Balance response. Expected 2 , got {}",
                res.len()
            )));
        }
        felts_to_u256(&res[0], &res[1])
            .map_err(|e| StarknetError::InvalidDataFormat(format!("Invalid balance format: {}", e)))
    }
}

/// Converts two Starknet field elements (Felts) into a U256 number
///
/// # Arguments
///
/// * `low` - The lower 128 bits of the U256 number as a Felt
/// * `high` - The higher 128 bits of the U256 number as a Felt
///
/// # Returns
///
/// * `Result<U256>` - The combined U256 number or an error if conversion fails
///
/// # Examples
///
/// ```
/// use starknet_crypto::Felt;
/// let low = Felt::from(123u64);
/// let high = Felt::from(456u64);
/// let result = felts_to_u256(&low, &high).unwrap();
/// ```
pub fn felts_to_u256(low: &Felt, high: &Felt) -> eyre::Result<U256> {
    // Convert the low Felt to a u128 by parsing its decimal string representation
    let low_u128 = u128::from_str_radix(&low.to_string(), 10)?;

    // Convert the high Felt to a u128 by parsing its decimal string representation
    let high_u128 = u128::from_str_radix(&high.to_string(), 10)?;

    // Combine the low and high u128 values into a U256 number
    Ok(U256::from_words(low_u128, high_u128))
}
