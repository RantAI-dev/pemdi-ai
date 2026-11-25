//! The seams between the use cases (`pemdi-app`) and the outside world (`pemdi-adapters`).
//! A use case names a trait here; it never names an HTTP client, a file path or an env variable.

use std::future::Future;

/// Why a port call failed, in the terms a use case can act on. Upstream text stays in the logs.
#[derive(Debug, thiserror::Error)]
pub enum PortError {
    #[error("not configured")]
    NotConfigured,
    #[error("upstream unavailable")]
    Unavailable,
    #[error("upstream rejected the request")]
    Rejected,
    #[error("timed out")]
    Timeout,
}

/// RantAI Lakehouse: read-only SQL, catalog and the NL2SQL copilot (`src/lib/lakehouse.ts` today).
pub trait Lakehouse: Send + Sync {
    /// Cheap reachability check for `/api/health`.
    fn ping(&self) -> impl Future<Output = Result<(), PortError>> + Send;
}
