//! Pure domain rules for Pemdi-AI. Nothing here reads a file, the network or the clock, so every
//! function can be checked against the TypeScript oracle (`scripts/oracle/`) case by case.
//!
//! Ported modules are listed in `docs/port/ledger.md`. Names stay close to the TypeScript source
//! until cutover, so the two can be compared.

pub mod makro;
