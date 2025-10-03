use crate::settings::Settings;

mod settings;

const SETTINGS_FILE: &str = "Settings.toml";

fn main() {
    let settings = Settings::from_toml(SETTINGS_FILE);
    dbg!(&settings);
}
