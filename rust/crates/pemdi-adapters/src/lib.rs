//! Adapters: one module per outside system, each implementing a trait from `pemdi-ports`.
//! Only this crate and the composition root may know URLs, credentials or file paths.

pub mod lakehouse;
