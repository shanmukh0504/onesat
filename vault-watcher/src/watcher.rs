use std::{sync::Arc, time::Duration};

use tracing::info;

use crate::orderbook::OrderbookProvider;

/// Default polling interval in seconds
const DEFAULT_POLLING_INTERVAL: u64 = 10;

pub struct VaultWatcher {
    pub orderbook: Arc<OrderbookProvider>,
    polling_interval: u64,
}

impl VaultWatcher {
    pub fn new(orderbook: Arc<OrderbookProvider>, polling_interval: Option<u64>) -> Self {
        Self {
            orderbook,
            polling_interval: polling_interval.unwrap_or(DEFAULT_POLLING_INTERVAL),
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
                continue;
            }

            for deposit in deposits {
                println!("Deposit: {:?}", deposit);
            }
            tokio::time::sleep(Duration::from_secs(self.polling_interval)).await;
        }
    }
}
