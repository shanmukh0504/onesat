use config::{Config, ConfigError, File};

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct Settings {}

impl Settings {
    /// Loads settings from a TOML file.
    /// Will panic if any required configuration variables are missing.
    pub fn from_toml(path: &str) -> Self {
        match Self::try_from_toml(path) {
            Ok(settings) => settings,
            Err(e) => {
                eprintln!("Failed to load settings from {path}: {e}");
                panic!("Missing required configuration variables in {path}");
            }
        }
    }

    /// Attempts to load settings from a TOML file, returning a Result.
    fn try_from_toml(path: &str) -> Result<Self, ConfigError> {
        let config = Config::builder()
            .add_source(File::with_name(path))
            .build()?;
        config.try_deserialize()
    }
}
