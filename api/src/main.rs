use crate::settings::Settings;

mod server;
mod settings;

const SETTINGS_FILE: &str = "Settings.toml";

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().init();

    let settings = Settings::from_toml(SETTINGS_FILE);

    let server = server::Server::new(settings.port);
    server.run().await;
}
