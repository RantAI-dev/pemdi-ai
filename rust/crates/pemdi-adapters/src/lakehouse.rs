//! RantAI Lakehouse over HTTP. Port of `src/lib/lakehouse.ts` (ledger row `lakehouse-client`).
//! Not ported yet: every call reports `NotConfigured`, so `/api/health` says degraded.

use pemdi_ports::{Lakehouse, PortError};

/// Settings read by the composition root from `LAKEHOUSE_URL` and friends.
#[derive(Debug, Clone)]
pub struct LakehouseHttp {
    base_url: Option<String>,
}

impl LakehouseHttp {
    #[must_use]
    pub fn new(base_url: Option<String>) -> Self {
        Self { base_url }
    }
}

impl Lakehouse for LakehouseHttp {
    async fn ping(&self) -> Result<(), PortError> {
        match self.base_url {
            // The HTTP client lands with ledger row `lakehouse-client`.
            Some(_) | None => Err(PortError::NotConfigured),
        }
    }
}
