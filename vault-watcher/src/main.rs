use std::sync::Arc;

use crate::{orderbook::OrderbookProvider, settings::Settings, watcher::VaultWatcher};

mod orderbook;
mod primitives;
mod settings;
mod watcher;

const SETTINGS_FILE: &str = "settings.json";

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().init();

    let settings = Settings::from_json(SETTINGS_FILE);

    let orderbook = OrderbookProvider::from_db_url(&settings.db_url)
        .await
        .expect("Failed to create orderbook provider");

    let watcher = VaultWatcher::new(Arc::new(orderbook), settings.polling_interval);

    watcher.start().await;
}
