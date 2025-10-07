use std::sync::Arc;

use axum::extract::{Query, State};
use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::Value;

use crate::{
    coingecko::CoingeckoFiatProvider,
    primitives::{ApiResult, Asset, Response},
};

pub struct HandlerState {
    pub coingecko: Arc<CoingeckoFiatProvider>,
    pub supported_assets: Vec<Asset>,
    pub vesu_api_base_url: String,
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

#[derive(Deserialize)]
pub struct VesuPositionsQuery {
    #[serde(rename = "walletAddress")]
    pub wallet_address: String,
}

#[derive(Deserialize)]
pub struct VesuPositionsResponse {
    pub data: Value,
}

pub async fn vesu_positions(
    Query(query): Query<VesuPositionsQuery>,
    State(state): State<Arc<HandlerState>>,
) -> ApiResult<Value> {
    let url = format!("{}/positions", state.vesu_api_base_url);
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .query(&[("walletAddress", query.wallet_address)])
        .send()
        .await
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    let body = response
        .text()
        .await
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    let data: VesuPositionsResponse = serde_json::from_str(&body)
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    Ok(Response::ok(data.data))
}

pub async fn vesu_history(
    Query(query): Query<VesuPositionsQuery>,
    State(state): State<Arc<HandlerState>>,
) -> ApiResult<Value> {
    let url = format!(
        "{}/users/{}/history",
        state.vesu_api_base_url, query.wallet_address
    );
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    let body = response
        .text()
        .await
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    let data: VesuPositionsResponse = serde_json::from_str(&body)
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    Ok(Response::ok(data.data))
}

#[derive(Deserialize)]
pub struct VesuPoolsQuery {
    #[serde(rename = "poolAddress")]
    pub pool_address: Option<String>,
}

pub async fn vesu_pools(
    Query(query): Query<VesuPoolsQuery>,
    State(state): State<Arc<HandlerState>>,
) -> ApiResult<Value> {
    let url = match query.pool_address {
        Some(pool_address) => format!("{}/pools/{}", state.vesu_api_base_url, pool_address),
        None => format!("{}/pools", state.vesu_api_base_url),
    };
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    let body = response
        .text()
        .await
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    let data: VesuPositionsResponse = serde_json::from_str(&body)
        .map_err(|e| Response::error(e.to_string(), StatusCode::INTERNAL_SERVER_ERROR))?;
    Ok(Response::ok(data.data))
}
