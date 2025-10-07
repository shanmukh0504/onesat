use serde::{Deserialize, Serialize};
use std::{fs::File, io::BufReader};

use crate::primitives::Asset;

#[derive(Serialize, Deserialize)]
pub struct CoingeckoSettings {
    pub price_api_url: String,
    pub api_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub update_interval_secs: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_ttl_secs: Option<u64>,
}

#[derive(Serialize, Deserialize)]
pub struct Settings {
    // Port number on which the server will listen
    pub port: u16,
    // Coingecko settings
    pub coingecko: CoingeckoSettings,
    // Supported assets
    pub supported_assets: Vec<Asset>,
    // Vesu protocol API base URL
    pub vesu_api_base_url: String,
}

impl Settings {
    /// Loads settings from a JSON file.
    /// Will panic if any required configuration variables are missing.
    pub fn from_json(file_path: &str) -> Self {
        let file = File::open(file_path).expect("Failed to open JSON settings file");
        let reader = BufReader::new(file);
        serde_json::from_reader(reader).expect("Failed to parse JSON settings file")
    }
}
