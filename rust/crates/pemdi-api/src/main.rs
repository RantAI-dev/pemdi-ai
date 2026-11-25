//! Pemdi-AI API server. The only place that reads environment variables and wires adapters into
//! use cases. Each route module registers its own routes (no central route table).

use pemdi_api::{config, routes, state};

use std::process::ExitCode;

#[tokio::main]
async fn main() -> ExitCode {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    let config = config::Config::from_env();
    let app = routes::router().with_state(state::AppState::new(&config));
    let listener = match tokio::net::TcpListener::bind(&config.addr).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!(addr = %config.addr, error = %e, "cannot bind");
            return ExitCode::FAILURE;
        }
    };
    tracing::info!(addr = %config.addr, "pemdi-api listening");
    if let Err(e) = axum::serve(listener, app).await {
        tracing::error!(error = %e, "server stopped");
        return ExitCode::FAILURE;
    }
    ExitCode::SUCCESS
}
