use std::net::SocketAddr;

use axum::{Router, http::Method, routing::get};
use tower_http::cors::{AllowHeaders, Any, CorsLayer};
use tracing::info;

use crate::server::handlers::get_health;

mod handlers;

pub struct Server {
    pub port: u16,
}

impl Server {
    pub fn new(port: u16) -> Self {
        Self { port }
    }

    pub async fn run(&self) {
        let cors = CorsLayer::new()
            .allow_methods(vec![Method::GET])
            .allow_origin(Any)
            .allow_headers(AllowHeaders::any());

        let app = Router::new().route("/health", get(get_health)).layer(cors);

        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        info!("Listening on http://{}", addr);

        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    }
}
