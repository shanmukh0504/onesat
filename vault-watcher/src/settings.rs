use std::{fs::File, io::BufReader};

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct Settings {
    pub db_url: String,
    pub polling_interval: Option<u64>,
    pub rpc_url: String,
    pub vault_registry_address: String,
    pub private_key: String,
    pub account_address: String,
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
