# ADR 0002 — Susunan crate Rust dan arah dependensi

- **Status:** Diterima (owner, 2026-11-25)
- **Backlog:** `PORT-0`
- **Tanggal:** 2026-11-25

## Konteks

Guidelines meminta batas berdasarkan crate: inti murni tanpa I/O, crate port, crate adapter, dan
satu composition root, dijaga oleh test yang membaca `cargo metadata`. Kode lama mencampur
hitungan, akses berkas, dan pemanggilan jaringan dalam modul yang sama (mis. `src/lib/sinkron.ts`),
sehingga sulit diuji tanpa lakehouse sungguhan.

## Keputusan — tujuh crate, dependensi hanya ke bawah

```text
pemdi-api ──► pemdi-app ──► pemdi-ports ──► pemdi-domain
   │             │
   │             └────────► pemdi-contracts
   └──► pemdi-adapters ──► pemdi-ports
pemdi-boundary  (test saja: menegakkan tabel di bawah)
```

| Crate | Isi | Boleh bergantung pada |
|---|---|---|
| `pemdi-domain` | Aturan murni: kerangka indikator, `hitungIndeks`, makro, SPM, PROSN. Tanpa I/O, tanpa serde | — |
| `pemdi-contracts` | Tipe request/response HTTP (serde, camelCase). Tanpa logika | — |
| `pemdi-ports` | Trait untuk dunia luar: `Lakehouse`, `Llm`, `Registry`, `Sumber`, `Intake`, `Users` | domain |
| `pemdi-app` | Use case: menggabungkan aturan domain dengan port. Tanpa HTTP, tanpa klien konkret | domain, ports, contracts |
| `pemdi-adapters` | Implementasi port: klien HTTP lakehouse dan LLM, berkas registry, OCR | domain, ports, contracts |
| `pemdi-api` | Composition root: axum, route, auth, `ApiError`, konfigurasi dari env | app, adapters, contracts, ports |
| `pemdi-boundary` | Test `tests/layers.rs` yang gagal bila ada dependensi ke atas | — |

Aturan tambahan:

- Hanya `pemdi-api` yang membaca variabel lingkungan (`src/config.rs`).
- Setiap modul route mendaftarkan route-nya sendiri (`routes::<modul>::routes()`); `routes/mod.rs`
  hanya menggabungkan. Tidak ada satu berkas yang mengumpulkan semua route atau pemetaan error.
- Semua error HTTP lewat `api_error.rs` dengan kode dari `.agents/error-codes.tsv`
  (`error_codes.rs` dibangkitkan, jangan disunting).
- Use case menerima port sebagai parameter generik, sehingga test memakai fake tanpa runtime.

## Konsekuensi

- Saat crate bertambah besar, `scripts/check.sh` dipecah per crate (`rust_<crate>_paths`).
- Menambah crate berarti menambah baris di `pemdi-boundary/tests/layers.rs`; mengubah baris
  adalah keputusan owner (path dilindungi).
