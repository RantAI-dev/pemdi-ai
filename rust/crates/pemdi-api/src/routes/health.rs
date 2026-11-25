//! `GET /api/health`.

use axum::extract::State;
use axum::routing::get;
use axum::{Json, Router};
use pemdi_contracts::Health;

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/health", get(health))
}

async fn health(State(state): State<AppState>) -> Json<Health> {
    Json(pemdi_app::health(state.lakehouse.as_ref(), env!("CARGO_PKG_VERSION")).await)
}
