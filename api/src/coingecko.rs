use std::{collections::HashMap, time::Duration};

use bigdecimal::BigDecimal;
use eyre::Result;
use moka::future::Cache;
use reqwest::{Client, Url};
use tracing::{error, info};

/// HTTP request timeout for Coingecko API calls in seconds
const CG_REQUEST_TIMEOUT_SECS: u64 = 10;

/// Default currency for price queries (USD)
const CG_PRICE_API_CURRENCY: &str = "usd";

/// HTTP header name for Coingecko API key authentication
const CG_API_KEY_HEADER: &str = "x-cg-api-key";

/// Default interval between price updates in seconds
const CG_PRICE_UPDATE_INTERVAL_SECS: u64 = 30;

/// Maximum number of price entries to store in cache
const CG_PRICE_CACHE_SIZE: u64 = 1000;

/// Default cache time-to-live for price entries in seconds
const CG_PRICE_CACHE_TTL_SECS: u64 = 120;

/// A fiat provider that fetches token prices from the Coingecko API.
///
/// This provider maintains an in-memory cache of prices and periodically updates
/// them in the background. It supports mapping internal asset IDs to Coingecko
/// coin IDs for flexible asset identification.
///
/// # Example
///
/// ```rust
/// use std::collections::HashMap;
/// use url::Url;
/// use garden::primitives::AssetId;
///
/// let api_url = Url::parse("https://api.coingecko.com/api/v3/simple/price").unwrap();
/// let mut asset_map = HashMap::new();
/// asset_map.insert(AssetId::from_str("bitcoin_regtest:bitcoin").unwrap(), "bitcoin".to_string());
///
/// let provider = CoingeckoFiatProvider::new(
///     api_url,
///     asset_map,
///     KeyRotator::new(vec!["your-api-key".to_string()]),
///     Some(60), // Update interval in seconds
///     Some(120), // Cache TTL in seconds
/// );
/// ```
pub struct CoingeckoFiatProvider {
    client: Client,
    price_api_url: Url,
    asset_to_coin_id_map: HashMap<String, String>,
    api_key: String,
    price_update_interval_secs: u64,
    cache: Cache<String, BigDecimal>,
}

impl CoingeckoFiatProvider {
    /// Creates a new CoingeckoFiatProvider instance.
    ///
    /// # Arguments
    ///
    /// * `price_api_url` - The base URL for the Coingecko price API
    /// * `asset_to_coin_id_map` - Mapping from internal AssetId to Coingecko coin ID
    /// * `api_keys` - Coingecko API keys for authentication
    /// * `update_interval_secs` - Optional interval between price updates in seconds.
    ///   If None, uses the default value of 60 seconds.
    /// * `cache_ttl_secs` - Optional cache time-to-live in seconds.
    ///   If None, uses the default value of 120 seconds.
    ///
    /// # Returns
    ///
    /// A new `CoingeckoFiatProvider` instance with configured HTTP client and cache.
    ///
    /// # Panics
    ///
    /// This function will panic if the HTTP client fails to build.
    pub fn new(
        price_api_url: Url,
        asset_to_coin_id_map: HashMap<String, String>,
        api_key: String,
        update_interval_secs: Option<u64>,
        cache_ttl_secs: Option<u64>,
    ) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(CG_REQUEST_TIMEOUT_SECS))
            .build()
            .expect("Failed to build http client");

        let cache = Cache::builder()
            .time_to_live(Duration::from_secs(
                cache_ttl_secs.unwrap_or(CG_PRICE_CACHE_TTL_SECS),
            ))
            .max_capacity(CG_PRICE_CACHE_SIZE)
            .build();

        Self {
            client,
            price_api_url,
            asset_to_coin_id_map,
            api_key,
            price_update_interval_secs: update_interval_secs
                .unwrap_or(CG_PRICE_UPDATE_INTERVAL_SECS),
            cache,
        }
    }

    /// Starts the background price update loop.
    ///
    /// This method runs indefinitely, periodically fetching and updating prices
    /// for all configured assets. It logs errors but continues running even if
    /// individual price updates fail.
    ///
    /// # Note
    ///
    /// This is a blocking method that should typically be spawned in a separate
    /// task using `tokio::spawn`.
    pub async fn start(&self) {
        info!("Starting Coingecko fiat provider");
        loop {
            if let Err(e) = self.update_prices().await {
                error!("Failed to update prices: {}", e);
            };
            tokio::time::sleep(Duration::from_secs(self.price_update_interval_secs)).await;
        }
    }

    /// Updates prices for all configured assets.
    ///
    /// This method fetches current prices from the Coingecko API for all assets
    /// defined in the asset-to-coin-id mapping and stores them in the cache.
    ///
    /// # Returns
    ///
    /// * `Ok(())` if all prices were successfully fetched and cached
    /// * `Err` if there was an error fetching prices from the API
    async fn update_prices(&self) -> Result<()> {
        let coin_ids = self
            .asset_to_coin_id_map
            .values()
            .cloned()
            .collect::<Vec<String>>();

        let prices = self.fetch_prices(coin_ids).await?;

        for (coin_id, price) in prices {
            let usd_price = match price.get(CG_PRICE_API_CURRENCY) {
                Some(price) => price,
                None => {
                    error!(coin_id, "USD price not found in Coingecko response");
                    continue;
                }
            };
            self.cache.insert(coin_id, usd_price.clone()).await;
        }
        Ok(())
    }

    /// Fetches prices from the Coingecko API for the specified coin IDs.
    ///
    /// # Arguments
    ///
    /// * `coin_ids` - Vector of Coingecko coin IDs to fetch prices for
    ///
    /// # Returns
    ///
    /// * `Ok(HashMap)` - A map where keys are coin IDs and values are maps of
    ///   currency to price (e.g., {"bitcoin": {"usd": 50000.0}})
    /// * `Err` if the request fails or response cannot be parsed
    async fn fetch_prices(
        &self,
        coin_ids: Vec<String>,
    ) -> Result<HashMap<String, HashMap<String, BigDecimal>>> {
        if coin_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let ids_param = coin_ids.join(",");

        let req = self
            .client
            .get(self.price_api_url.as_str())
            .query(&[
                ("ids", ids_param),
                ("vs_currencies", CG_PRICE_API_CURRENCY.to_string()),
            ])
            .header(CG_API_KEY_HEADER, self.api_key.clone());

        let response = req.send().await?;

        let status = response.status();

        if !status.is_success() {
            let error_message = response.text().await.unwrap_or_default();
            return Err(eyre::eyre!(
                "Request failed ({}): {}",
                status,
                error_message
            ));
        }

        let body = response
            .text()
            .await
            .map_err(|e| eyre::eyre!("Failed to read response body: {}", e))?;
        let prices: HashMap<String, HashMap<String, BigDecimal>> = serde_json::from_str(&body)
            .map_err(|e| eyre::eyre!("Failed to parse response: {}", e))?;
        Ok(prices)
    }

    pub async fn get_all_prices(&self) -> Result<HashMap<String, BigDecimal>> {
        let prices = self
            .cache
            .iter()
            .map(|(coin_id, price)| (coin_id.as_ref().clone(), price.clone()))
            .collect::<HashMap<String, BigDecimal>>();
        Ok(prices)
    }
}

#[cfg(test)]
mod tests {
    use bigdecimal::Zero;

    use super::*;

    const CG_PRICE_API_URL: &str = "https://api.coingecko.com/api/v3/simple/price";
    const CG_API_KEY: &str = "<API_KEY>";

    fn create_test_provider() -> CoingeckoFiatProvider {
        let assets = HashMap::from([
            ("bitcoin_regtest:bitcoin".to_string(), "bitcoin".to_string()),
            (
                "ethereum_regtest:ethereum".to_string(),
                "ethereum".to_string(),
            ),
        ]);

        CoingeckoFiatProvider::new(
            Url::parse(CG_PRICE_API_URL).unwrap(),
            assets,
            CG_API_KEY.to_string(),
            Some(1),
            Some(5),
        )
    }

    #[tokio::test]
    async fn test_coingecko_fiat_fetch() {
        let _ = tracing_subscriber::fmt().try_init();
        let provider = create_test_provider();

        let coin_ids = vec!["bitcoin".to_string(), "ethereum".to_string()];
        let prices = provider
            .fetch_prices(coin_ids)
            .await
            .expect("Failed to fetch prices, verify Coingecko API_KEY");

        // Should have prices for both coins
        assert!(prices.contains_key("bitcoin"));
        assert!(prices.contains_key("ethereum"));

        // Check that USD prices exist and are positive
        if let Some(bitcoin_prices) = prices.get("bitcoin") {
            if let Some(usd_price) = bitcoin_prices.get("usd") {
                assert!(*usd_price > BigDecimal::zero());
            }
        }

        if let Some(ethereum_prices) = prices.get("ethereum") {
            if let Some(usd_price) = ethereum_prices.get("usd") {
                assert!(*usd_price > BigDecimal::zero());
            }
        }
    }
}
