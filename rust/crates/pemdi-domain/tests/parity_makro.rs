//! Parity with the TypeScript oracle: every line of `tests/parity/makro-hitung.cases` must give the
//! same value here. Protected path: weaken nothing here to get green (AGENTS.md).
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::indexing_slicing,
    reason = "test code"
)]

use pemdi_domain::makro::{capaian, kategori, laju, laju_baik, Polaritas};
use serde_json::Value;

/// `PARITY_CASES` points at another case file (unseen cases at review, `scripts/oracle/unseen.sh`);
/// by default the committed file is read.
fn cases() -> String {
    let path = std::env::var("PARITY_CASES").unwrap_or_else(|_| {
        concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../../tests/parity/makro-hitung.cases"
        )
        .to_owned()
    });
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("cannot read {path}: {e}"))
}

fn num(v: &Value) -> f64 {
    v.as_f64().expect("number argument")
}

fn pol(v: &Value) -> Polaritas {
    if v.as_str() == Some("turun") {
        Polaritas::Turun
    } else {
        Polaritas::Naik
    }
}

/// Numbers compare by value (so 1 and 1.0, 0 and -0 are equal); non-finite ones travel as strings.
fn same(expected: &Value, got: &Value) -> bool {
    match (expected, got) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        _ => expected == got,
    }
}

fn number(x: f64) -> Value {
    if x.is_finite() {
        serde_json::json!(x)
    } else if x.is_nan() {
        Value::String("NaN".into())
    } else if x > 0.0 {
        Value::String("Infinity".into())
    } else {
        Value::String("-Infinity".into())
    }
}

#[test]
fn makro_hitung_matches_oracle() {
    let mut failures = Vec::new();
    let mut count = 0;
    let cases = cases();
    for line in cases
        .lines()
        .filter(|l| !l.starts_with('#') && !l.trim().is_empty())
    {
        let (input, expected) = line.split_once(" => ").expect("case line has ' => '");
        let input: Value = serde_json::from_str(input).unwrap();
        let expected: Value = serde_json::from_str(expected).unwrap();
        let a = input["args"].as_array().unwrap();
        let got = match input["fn"].as_str().unwrap() {
            "laju" => number(laju(num(&a[0]), num(&a[1]))),
            "lajuBaik" => laju_baik(num(&a[0]), pol(&a[1])).map_or(Value::Null, Value::Bool),
            "capaian" => number(capaian(num(&a[0]), num(&a[1]), pol(&a[2]))),
            "kategori" => Value::String(kategori(num(&a[0])).label().into()),
            other => panic!("no Rust port for {other}"),
        };
        count += 1;
        if !same(&expected, &got) {
            failures.push(format!("{line}\n    got {got}"));
        }
    }
    assert!(count > 0, "no cases read");
    assert!(
        failures.is_empty(),
        "{} of {count} cases differ:\n{}",
        failures.len(),
        failures.join("\n")
    );
}
