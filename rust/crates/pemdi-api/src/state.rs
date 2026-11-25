//! Shared state handed to every handler: the adapters, built once.

use std::sync::Arc;

use pemdi_adapters::lakehouse::LakehouseHttp;

use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub lakehouse: Arc<LakehouseHttp>,
}

impl AppState {
    pub fn new(config: &Config) -> Self {
        Self {
            lakehouse: Arc::new(LakehouseHttp::new(config.lakehouse_url.clone())),
        }
    }
}
