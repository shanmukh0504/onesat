use std::{net::SocketAddr, sync::Arc};

use axum::{Router, http::Method, routing::get};
use tower_http::cors::{AllowHeaders, Any, CorsLayer};
use tracing::info;

use crate::{
    coingecko::CoingeckoFiatProvider,
    primitives::Asset,
    server::handler::{HandlerState, get_health, supported_assets, vesu_history, vesu_positions},
};

mod handler;

pub struct Server {
    pub port: u16,
    pub handler_state: Arc<HandlerState>,
}

impl Server {
    pub fn new(
        port: u16,
        coingecko: Arc<CoingeckoFiatProvider>,
        supported_assets: Vec<Asset>,
        vesu_api_base_url: String,
    ) -> Self {
        let handler_state = Arc::new(HandlerState {
            coingecko,
            supported_assets,
            vesu_api_base_url,
        });
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
            .route("/assets", get(supported_assets))
            .nest(
                "/vesu",
                Router::new()
                    .route("/postions", get(vesu_positions))
                    .route("/history", get(vesu_history)),
            )
            .layer(cors)
            .with_state(Arc::clone(&self.handler_state));

        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        info!("Listening on http://{}", addr);

        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    }
}
