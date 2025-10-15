use std::{str::FromStr, sync::Arc, time::Duration};

use starknet::{
    core::types::Felt,
    providers::{JsonRpcClient, jsonrpc::HttpTransport},
};
use tracing::{error, info, warn};
mod erc20;
mod errors;
pub mod registry;

use crate::{
    orderbook::OrderbookProvider,
    primitives::DepositResponse,
    watcher::{erc20::ERC20, registry::VaultRegistry},
};

/// Default polling interval in seconds
const DEFAULT_POLLING_INTERVAL: u64 = 10;

/// Deposit status for querying pending deposits
const DEPOSIT_STATUS_CREATED: &str = "created";

/// Deposit status after vault is deployed
const DEPOSIT_STATUS_DEPOSITED: &str = "deposited";

/// Default chain ID for vault deployment
const DEFAULT_ACTION: u128 = 1;

/// Handles monitoring and processing of vault deposits
pub struct VaultWatcher {
    pub orderbook: Arc<OrderbookProvider>,
    polling_interval: u64,
    provider: JsonRpcClient<HttpTransport>,
    registry: Arc<VaultRegistry>,
}

impl VaultWatcher {
    /// Creates a new VaultWatcher instance
    ///
    /// # Arguments
    /// * `orderbook` - Arc reference to the orderbook provider
    /// * `registry` - Arc reference to the vault registry
    /// * `provider` - JSON-RPC client for Starknet
    /// * `polling_interval` - Optional custom polling interval in seconds
    pub fn new(
        orderbook: Arc<OrderbookProvider>,
        registry: Arc<VaultRegistry>,
        provider: JsonRpcClient<HttpTransport>,
        polling_interval: Option<u64>,
    ) -> Self {
        Self {
            orderbook,
            provider,
            polling_interval: polling_interval.unwrap_or(DEFAULT_POLLING_INTERVAL),
            registry,
        }
    }

    /// Starts the vault watcher main loop
    ///
    /// Continuously polls for new deposits and processes them
    pub async fn start(&self) {
        loop {
            match self.process_pending_deposits().await {
                Ok(count) => {
                    if count > 0 {
                        info!(processed = count, "Successfully processed deposits");
                    }
                }
                Err(e) => {
                    error!(error = ?e, "Error in deposit processing cycle");
                }
            }

            tokio::time::sleep(Duration::from_secs(self.polling_interval)).await;
        }
    }

    /// Fetches and processes all pending deposits
    async fn process_pending_deposits(&self) -> Result<usize, Box<dyn std::error::Error>> {
        let deposits = self
            .orderbook
            .get_deposits_by_status(DEPOSIT_STATUS_CREATED)
            .await?;

        info!(deposits_count = deposits.len(), "Found pending deposits");

        if deposits.is_empty() {
            return Ok(0);
        }

        let mut processed = 0;
        for deposit in deposits {
            if let Err(e) = self.process_deposit(&deposit).await {
                error!(
                    deposit_id = %deposit.deposit_id,
                    error = ?e,
                    "Failed to process deposit"
                );
            } else {
                processed += 1;
            }
        }

        Ok(processed)
    }

    /// Processes a single deposit by verifying balance and deploying vault
    async fn process_deposit(
        &self,
        deposit: &DepositResponse,
    ) -> Result<(), Box<dyn std::error::Error>> {
        info!(
            deposit_id = %deposit.deposit_id,
            user = %deposit.user_address,
            "Processing deposit"
        );

        self.verify_deposit_balance(deposit).await?;
        self.deploy_vault(deposit).await?;

        info!(deposit_id = %deposit.deposit_id, "Deposit processed successfully");
        Ok(())
    }

    /// Verifies that the deposit address has sufficient balance
    async fn verify_deposit_balance(
        &self,
        deposit: &DepositResponse,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let token_address = Self::parse_address(&deposit.token, "token")?;
        let deposit_address = Self::parse_address(&deposit.deposit_address, "deposit")?;

        let erc20 = erc20::StarknetERC20::new(token_address, self.provider.clone());
        let balance = erc20.balance_of(deposit_address).await?;

        info!(
            deposit_id = %deposit.deposit_id,
            balance = %balance,
            required = %deposit.amount,
            "Checked deposit balance"
        );

        let balance_decimal = bigdecimal::BigDecimal::from_str(&balance.to_string())?;

        if balance_decimal < deposit.amount {
            warn!(
                deposit_id = %deposit.deposit_id,
                balance = %balance_decimal,
                required = %deposit.amount,
                "Insufficient balance for deposit"
            );
            return Err("Insufficient balance".into());
        }

        Ok(())
    }

    /// Deploys a vault for the given deposit
    async fn deploy_vault(
        &self,
        deposit: &DepositResponse,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let user_address = Self::parse_address(&deposit.user_address, "user")?;
        let token_address = Self::parse_address(&deposit.token, "token")?;
        let target_address = Self::parse_address(&deposit.target_address, "target")?;
        let deposit_id = Self::parse_address(&deposit.deposit_id, "deposit_id")?;
        info!(
            deposit_id = %deposit.deposit_id,
            user = %deposit.user_address,
            "Deploying vault"
        );

        let tx_hash = self
            .registry
            .deploy_vault(
                &user_address,
                &deposit_id,
                DEFAULT_ACTION,
                &deposit.amount,
                &token_address,
                &target_address,
            )
            .await
            .map_err(|e| format!("Failed to deploy vault: {}", e))?;

        info!(
            deposit_id = %deposit.deposit_id,
            tx_hash = %tx_hash,
            "Vault deployed successfully"
        );

        // Update deposit status to 'deposited' and save the transaction hash
        self.orderbook
            .update_deposit_status_and_tx_hash(
                &deposit.deposit_id,
                DEPOSIT_STATUS_DEPOSITED,
                &tx_hash,
            )
            .await
            .map_err(|e| {
                format!(
                    "Failed to update deposit status and transaction hash: {}",
                    e
                )
            })?;

        info!(
            deposit_id = %deposit.deposit_id,
            status = DEPOSIT_STATUS_DEPOSITED,
            tx_hash = %tx_hash,
            "Deposit status and transaction hash updated"
        );

        Ok(())
    }

    /// Helper function to parse hex string addresses to Felt
    fn parse_address(
        address_hex: &str,
        field_name: &str,
    ) -> Result<Felt, Box<dyn std::error::Error>> {
        Felt::from_hex(address_hex).map_err(|e| {
            format!(
                "Failed to parse {} address '{}': {}",
                field_name, address_hex, e
            )
            .into()
        })
    }
}
