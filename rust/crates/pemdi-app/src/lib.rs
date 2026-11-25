//! Use cases. Each takes its ports as generic parameters, so tests pass fakes and the composition
//! root (`pemdi-api`) passes the real adapters.

use pemdi_contracts::{Health, HealthStatus};
use pemdi_ports::Lakehouse;

/// `GET /api/health`: ok when the lakehouse answers, degraded otherwise. Never fails.
pub async fn health<L: Lakehouse>(lakehouse: &L, version: &str) -> Health {
    let status = match lakehouse.ping().await {
        Ok(()) => HealthStatus::Ok,
        Err(_) => HealthStatus::Degraded,
    };
    Health {
        status,
        version: version.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::panic, reason = "test code")]

    use super::*;
    use pemdi_ports::PortError;
    use std::pin::pin;
    use std::task::{Context, Poll, Waker};

    struct Up;
    impl Lakehouse for Up {
        async fn ping(&self) -> Result<(), PortError> {
            Ok(())
        }
    }

    struct Down;
    impl Lakehouse for Down {
        async fn ping(&self) -> Result<(), PortError> {
            Err(PortError::Unavailable)
        }
    }

    /// The fakes never wait, so one poll finishes the use case; no runtime needed.
    fn now<F: std::future::Future>(f: F) -> F::Output {
        match pin!(f).poll(&mut Context::from_waker(Waker::noop())) {
            Poll::Ready(v) => v,
            Poll::Pending => panic!("fake port should not wait"),
        }
    }

    #[test]
    fn health_is_ok_when_lakehouse_answers() {
        assert_eq!(now(health(&Up, "t")).status, HealthStatus::Ok);
    }

    #[test]
    fn health_is_degraded_when_lakehouse_is_down() {
        assert_eq!(now(health(&Down, "t")).status, HealthStatus::Degraded);
    }
}
