//! The dependency direction between workspace crates (docs/adr/0002-rust-crate-layout.md).
//! Adding a crate means adding it here; changing a row is the owner's decision.
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    reason = "test code"
)]

use std::collections::BTreeMap;
use std::process::Command;

/// crate -> the workspace crates it may depend on.
const ALLOWED: &[(&str, &[&str])] = &[
    ("pemdi-domain", &[]),
    ("pemdi-contracts", &[]),
    ("pemdi-ports", &["pemdi-domain"]),
    (
        "pemdi-app",
        &["pemdi-domain", "pemdi-ports", "pemdi-contracts"],
    ),
    (
        "pemdi-adapters",
        &["pemdi-domain", "pemdi-ports", "pemdi-contracts"],
    ),
    (
        "pemdi-api",
        &[
            "pemdi-app",
            "pemdi-adapters",
            "pemdi-contracts",
            "pemdi-ports",
        ],
    ),
    ("pemdi-boundary", &[]),
];

#[test]
fn crates_depend_only_downwards() {
    let out = Command::new(env!("CARGO"))
        .args(["metadata", "--format-version", "1", "--no-deps"])
        .current_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/../.."))
        .output()
        .expect("cargo metadata runs");
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let meta: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    let allowed: BTreeMap<_, _> = ALLOWED.iter().copied().collect();

    let mut problems = Vec::new();
    for pkg in meta["packages"].as_array().unwrap() {
        let name = pkg["name"].as_str().unwrap();
        let Some(ok) = allowed.get(name) else {
            problems.push(format!(
                "{name}: not in ALLOWED; add it with the layers it may use"
            ));
            continue;
        };
        for dep in pkg["dependencies"].as_array().unwrap() {
            let d = dep["name"].as_str().unwrap();
            let dev = dep["kind"].as_str() == Some("dev");
            if d.starts_with("pemdi-") && !dev && !ok.contains(&d) {
                problems.push(format!("{name} -> {d}: not allowed; move the code down a layer or pass it through a port"));
            }
        }
    }
    assert!(
        problems.is_empty(),
        "layer violations:\n{}",
        problems.join("\n")
    );
}
