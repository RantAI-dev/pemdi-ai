//! The request id every error body carries: the caller's `X-Request-Id` when safe, else a new one.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::http::HeaderMap;

use crate::api_error::sent_request_id;

static NEXT: AtomicU64 = AtomicU64::new(0);

/// Unique within a process run and sortable by time; no extra dependency for a UUID.
pub fn request_id(headers: &HeaderMap) -> String {
    if let Some(sent) = sent_request_id(headers) {
        return sent.to_owned();
    }
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_nanos());
    format!("req-{nanos:x}-{:x}", NEXT.fetch_add(1, Ordering::Relaxed))
}
