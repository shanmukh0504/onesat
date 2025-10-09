use std::sync::Arc;

use starknet::{
    accounts::{ExecutionEncoding, SingleOwnerAccount},
    core::types::Felt,
    providers::{JsonRpcClient, Provider, Url, jsonrpc::HttpTransport},
    signers::{LocalWallet, SigningKey},
};

use crate::{
    orderbook::OrderbookProvider,
    settings::Settings,
    watcher::{VaultWatcher, registry::VaultRegistry},
};

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

    let provider: JsonRpcClient<HttpTransport> = JsonRpcClient::new(HttpTransport::new(
        Url::parse(&settings.rpc_url).expect("Invalid RPC URL"),
    ));

    let signer = LocalWallet::from(SigningKey::from_secret_scalar(
        Felt::from_hex(&settings.private_key).expect("Invalid private key"),
    ));

    let address = Felt::from_hex(&settings.account_address).expect("Invalid account address");

    let chain_id = provider.chain_id().await.expect("Failed to get chain id");

    let account: SingleOwnerAccount<JsonRpcClient<HttpTransport>, LocalWallet> =
        SingleOwnerAccount::new(
            provider.clone(),
            signer.clone(),
            address,
            chain_id,
            ExecutionEncoding::New,
        );

    let vault_registry = VaultRegistry::new(
        Felt::from_hex(&settings.vault_registry_address).expect("Invalid vault registry address"),
        account,
    );

    let watcher = VaultWatcher::new(
        Arc::new(orderbook),
        Arc::new(vault_registry),
        provider,
        settings.polling_interval,
    );

    watcher.start().await;
}
