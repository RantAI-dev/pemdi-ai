//! Route modules. Each exposes `routes()`; this file only merges them and adds the fallback.

mod health;

use axum::http::HeaderMap;
use axum::response::Response;
use axum::Router;

use crate::api_error::ApiError;
use crate::error_codes::ErrorCode;
use crate::request_id::request_id;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().merge(health::routes()).fallback(not_found)
}

async fn not_found(headers: HeaderMap) -> Response {
    ApiError::new(ErrorCode::NotFound).into_response(&request_id(&headers))
}
