use std::sync::Arc;

use axum::extract::State;
use reqwest::StatusCode;

use crate::{
    coingecko::CoingeckoFiatProvider,
    primitives::{ApiResult, Asset, Response},
};

pub struct HandlerState {
    pub coingecko: Arc<CoingeckoFiatProvider>,
    pub supported_assets: Vec<Asset>,
}

/// Health check endpoint that returns the service status
///
/// # Returns
/// * A static string indicating the service is online
pub async fn get_health() -> &'static str {
    "Online"
}

pub async fn supported_assets(State(state): State<Arc<HandlerState>>) -> ApiResult<Vec<Asset>> {
    let prices = state
        .coingecko
        .get_all_prices()
        .await
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    let supported_assets = state
        .supported_assets
        .iter()
        .map(|asset| {
            let price = match prices.get(asset.coingecko_id.as_str()) {
                Some(price) => Some(price.clone()),
                None => None,
            };
            Asset {
                name: asset.name.clone(),
                symbol: asset.symbol.clone(),
                decimals: asset.decimals,
                coingecko_id: asset.coingecko_id.clone(),
                address: asset.address.clone(),
                price: price,
            }
        })
        .collect();
    Ok(Response::ok(supported_assets))
}
