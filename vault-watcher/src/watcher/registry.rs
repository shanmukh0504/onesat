use bigdecimal::num_bigint;
use eyre::Result;
use sqlx::types::BigDecimal;
use starknet::{
    accounts::{Account, SingleOwnerAccount},
    core::{
        types::{Call, Felt, InvokeTransactionResult},
        utils::get_selector_from_name,
    },
    providers::{JsonRpcClient, jsonrpc::HttpTransport},
    signers::LocalWallet,
};

use crate::watcher::errors::StarknetError;

#[derive(Clone)]
pub struct VaultRegistry {
    pub address: Felt,
    account: SingleOwnerAccount<JsonRpcClient<HttpTransport>, LocalWallet>,
}

impl VaultRegistry {
    /// Creates a new StarknetERC20 instance
    ///
    /// # Arguments
    /// * `address` - The ERC20 contract address
    /// * `account` - The account to interact with the contract
    pub fn new(
        address: Felt,
        account: SingleOwnerAccount<JsonRpcClient<HttpTransport>, LocalWallet>,
    ) -> Self {
        Self { address, account }
    }

    /// Executes a transaction on the contract
    ///
    /// # Arguments
    /// * `calls` - Vector of calls to execute
    async fn execute(&self, calls: Vec<Call>) -> Result<InvokeTransactionResult> {
        let tx = self.account.execute_v3(calls);
        let res = tx
            .gas_estimate_multiplier(3.0)
            .gas_price_estimate_multiplier(3.0)
            .send()
            .await
            .map_err(|e| StarknetError::TransactionFailed(e.to_string()))?;
        Ok(res)
    }

    pub async fn deploy_vault(
        &self,
        user: &Felt,
        deposit_id: &Felt,
        action: u128,
        amount: &BigDecimal,
        token: &Felt,
        target: &Felt,
    ) -> Result<String, StarknetError> {
        let (amount_low, amount_high) = bigdecimal_to_i128s(amount)?;
        let calldata = vec![
            user.clone(),
            deposit_id.clone(),
            Felt::from(action),
            Felt::from(amount_low),
            Felt::from(amount_high),
            token.clone(),
            target.clone(),
        ];
        let result = self
            .execute(vec![Call {
                to: self.address,
                calldata,
                selector: get_selector_from_name("deploy_vault").unwrap(),
            }])
            .await?;
        let result = result.transaction_hash;
        Ok(result.to_hex_string())
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
