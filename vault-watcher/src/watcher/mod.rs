use std::{str::FromStr, sync::Arc, time::Duration};

use starknet::{
    core::types::Felt,
    providers::{JsonRpcClient, jsonrpc::HttpTransport},
};
use tracing::info;
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

pub struct VaultWatcher {
    pub orderbook: Arc<OrderbookProvider>,
    polling_interval: u64,
    provider: JsonRpcClient<HttpTransport>,
    registry: Arc<VaultRegistry>,
}

impl VaultWatcher {
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

    pub async fn start(&self) {
        loop {
            let deposits = match self.orderbook.get_deposits_by_status("created").await {
                Ok(deposits) => deposits,
                Err(e) => {
                    tracing::error!("Error getting deposits: {:?}", e);
                    continue;
                }
            };

            info!(deposits_count = deposits.len(), "Found deposits");

            if deposits.is_empty() {
                tokio::time::sleep(Duration::from_secs(self.polling_interval)).await;
                continue;
            }

            for deposit in deposits {
                self.process_deposit(deposit).await;
            }
            tokio::time::sleep(Duration::from_secs(self.polling_interval)).await;
        }
    }

    async fn process_deposit(&self, deposit: DepositResponse) {
        let token = deposit.token.clone();

        let token_address = match Felt::from_hex(&token) {
            Ok(address) => address,
            Err(e) => {
                tracing::error!("Error parsing token address: {:?}", e);
                return;
            }
        };

        let erc20 = erc20::StarknetERC20::new(token_address, self.provider.clone());

        let deposit_address = match Felt::from_hex(&deposit.deposit_address) {
            Ok(address) => address,
            Err(e) => {
                tracing::error!("Error parsing deposit address: {:?}", e);
                return;
            }
        };

        let balance = match erc20.balance_of(deposit_address).await {
            Ok(balance) => balance,
            Err(e) => {
                tracing::error!("Error getting balance: {:?}", e);
                return;
            }
        };

        tracing::info!("Balance: {:?}", balance);

        let balance = match bigdecimal::BigDecimal::from_str(&balance.to_string()) {
            Ok(amount) => amount,
            Err(e) => {
                tracing::error!("Error parsing amount: {:?}", e);
                return;
            }
        };

        if balance < deposit.amount {
            tracing::error!("Insufficient balance for deposit: {:?}", deposit.deposit_id);
            return;
        }

        self.deploy_vault(deposit).await;
    }

    async fn deploy_vault(&self, deposit: DepositResponse) {
        let user_address = match Felt::from_hex(&deposit.user_address) {
            Ok(address) => address,
            Err(e) => {
                tracing::error!("Error parsing user address: {:?}", e);
                return;
            }
        };

        let token_address = match Felt::from_hex(&deposit.token) {
            Ok(address) => address,
            Err(e) => {
                tracing::error!("Error parsing token address: {:?}", e);
                return;
            }
        };

        let target_address = match Felt::from_hex(&deposit.target_address) {
            Ok(address) => address,
            Err(e) => {
                tracing::error!("Error parsing target address: {:?}", e);
                return;
            }
        };

        let tx_hash = match self
            .registry
            .deploy_vault(
                &user_address,
                1 as u128,
                &deposit.amount,
                &token_address,
                &target_address,
            )
            .await
        {
            Ok(tx_hash) => tx_hash,
            Err(e) => {
                tracing::error!("Error deploying vault: {:?}", e);
                return;
            }
        };

        tracing::info!("Vault deployed: {:?}", tx_hash);
    }
}
