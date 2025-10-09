use std::sync::Arc;

use reqwest::Url;
use starknet::{
    core::types::Felt,
    providers::{JsonRpcClient, jsonrpc::HttpTransport},
};

use crate::{orderbook::OrderbookProvider, settings::Settings};

mod coingecko;
mod orderbook;
mod primitives;
mod registry;
mod server;
mod settings;

const SETTINGS_FILE_NAME: &str = "settings.json";

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().init();

    let settings = Settings::from_json(SETTINGS_FILE_NAME);

    let asset_to_coin_id_map = settings
        .supported_assets
        .iter()
        .map(|asset| (asset.symbol.clone(), asset.coingecko_id.clone()))
        .collect();

    let coingecko = coingecko::CoingeckoFiatProvider::new(
        Url::parse(&settings.coingecko.price_api_url).expect("Invalid price API URL"),
        asset_to_coin_id_map,
        settings.coingecko.api_key,
        settings.coingecko.update_interval_secs,
        settings.coingecko.cache_ttl_secs,
    );

    let coingecko = Arc::new(coingecko);
    let coingecko_clone = Arc::clone(&coingecko);
    tokio::spawn(async move {
        coingecko_clone.start().await;
    });

    let provider: JsonRpcClient<HttpTransport> = JsonRpcClient::new(HttpTransport::new(
        Url::parse(settings.rpc_url.as_str()).expect("Invalid RPC URL"),
    ));

    let vault_registry = registry::VaultRegistry::new(
        Felt::from_hex_unchecked(settings.vault_registry_address.as_str()),
        provider,
    );

    let orderbook = OrderbookProvider::from_db_url(&settings.db_url)
        .await
        .expect("Failed to create orderbook provider");

    let server = server::Server::new(
        settings.port,
        coingecko,
        settings.supported_assets,
        settings.vesu_api_base_url,
        Arc::new(vault_registry),
        Arc::new(orderbook),
    );
    server.run().await;
}
