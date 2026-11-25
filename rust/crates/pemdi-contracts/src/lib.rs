//! What crosses the HTTP boundary between the Rust API and the Next.js UI. Types only: no logic,
//! no I/O. Fields are camelCase on the wire (`docs/conventions.md`). While the port runs, each
//! response keeps the exact shape the TypeScript route returns today (`docs/port/README.md`, step 1).

use serde::{Deserialize, Serialize};

/// `GET /api/health`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub status: HealthStatus,
    pub version: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HealthStatus {
    Ok,
    Degraded,
}

/// The list envelope every new list endpoint returns.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub data: Vec<T>,
    pub next_cursor: Option<String>,
}
