use std::{net::SocketAddr, sync::Arc};

use axum::{Router, http::Method, routing::get};
use tower_http::cors::{AllowHeaders, Any, CorsLayer};
use tracing::info;

use crate::server::handler::{HandlerState, get_health};

mod handler;

pub struct Server {
    pub port: u16,
    pub handler_state: Arc<HandlerState>,
}

impl Server {
    pub fn new(port: u16) -> Self {
        let handler_state = Arc::new(HandlerState {});
        Self {
            port,
            handler_state,
        }
    }

    pub async fn run(&self) {
        let cors = CorsLayer::new()
            .allow_methods(vec![Method::GET])
            .allow_origin(Any)
            .allow_headers(AllowHeaders::any());

        let app = Router::new()
            .route("/health", get(get_health))
            .layer(cors)
            .with_state(Arc::clone(&self.handler_state));

        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        info!("Listening on http://{}", addr);

        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    }
}
