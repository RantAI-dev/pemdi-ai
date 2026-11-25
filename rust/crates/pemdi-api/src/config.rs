//! Configuration from the environment, read once at start. Names follow `.env.example`.

pub struct Config {
    /// `PEMDI_API_ADDR`, default `0.0.0.0:3200`.
    pub addr: String,
    /// `LAKEHOUSE_URL`; absent means the lakehouse adapter reports not configured.
    pub lakehouse_url: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            addr: std::env::var("PEMDI_API_ADDR").unwrap_or_else(|_| "0.0.0.0:3200".to_owned()),
            lakehouse_url: std::env::var("LAKEHOUSE_URL")
                .ok()
                .filter(|v| !v.is_empty()),
        }
    }
}
