# Pengembangan

## Prasyarat

Bun 1.x, Node 22, Rust stable (≥ 1.85, dengan `rustfmt` dan `clippy`), `uv` (untuk ruff dan
skrip Python), Docker (lakehouse lokal).

```bash
scripts/setup-worktree.sh     # bun install, hook git, cargo fetch
```

## Satu perintah "hijau"

```bash
scripts/check.sh              # semua bagian: ts, rust, py, ukuran berkas, kode error, ratchet
scripts/check.sh --changed    # hanya bagian yang tersentuh perubahan
scripts/check.sh --part rust  # satu bagian
```

Hook pre-commit menjalankan `scripts/check.sh --staged`. CI menjalankan bagian yang sama per
matriks (`.github/workflows/ci.yml`). "Hijau" berarti baris terakhirnya `check: PASS`.

Ratchet (`.agents/ratchet.tsv`) membekukan hitungan hari ini: `any`, suppression, error Biome
(134), error ruff (35). Angkanya boleh turun, tidak boleh naik. Setelah menurunkan, jalankan
`scripts/ratchet.sh --update`.

## Menjalankan

```bash
scripts/lakehouse.sh up && scripts/lakehouse.sh init   # lakehouse lokal
bun run lakehouse:bootstrap && bun run seed            # tabel dan data awal
bun run dev                                            # UI + API lama, http://localhost:3100

cd rust && cargo run -p pemdi-api                      # service Rust, http://localhost:3200
curl localhost:3200/api/health
```

Jangan menjalankan `next build` atau membangun image di mesin pengembang; image dibangun di host
Portainer ([OPERATIONS.md](OPERATIONS.md)). Cek tipe secara lokal saja: `bun run typecheck`.

## Rust

- Workspace di `rust/`, tujuh crate dengan arah dependensi tetap (ADR 0002). Test
  `pemdi-boundary` gagal bila ada dependensi ke atas.
- Lint workspace menolak `unwrap`, `expect`, `panic!`, `todo!`, dan indeks slice di luar test.
  Suppression wajib punya `reason = "..."`.
- Error HTTP selalu lewat `ApiError` dengan kode dari `.agents/error-codes.tsv`. Menambah kode:
  tambah baris, lalu `scripts/error-codes.sh --write`. `error_codes.rs` jangan disunting.
- Saat iterasi, cek satu crate: `cargo clippy -p pemdi-domain --all-targets`,
  `cargo test -p pemdi-domain`.

## Porting satu modul

Ikuti [port/README.md](port/README.md). Singkatnya:

```bash
# 1. daftarkan fungsi lama di scripts/oracle/modules.ts, generator di scripts/oracle/cases.ts
bun scripts/oracle/cases.ts <modul>               # tulis tests/parity/<modul>.cases
# 2. tulis port di rust/crates/pemdi-domain/src/<modul>.rs dan tests/parity_<modul>.rs
scripts/check.sh --part rust
# 3. reviewer: kasus yang belum dilihat worker
bun scripts/oracle/cases.ts <modul> 777 /tmp/unseen.cases
```

## Commit

Subjek `type(scope): ringkasan`, mis. `feat(port): pemdi hitungIndeks`, `fix(tanya): ...`,
`docs(core): ...`. Satu item backlog per PR; PR itu juga mengubah baris item di
`docs/core/BACKLOG.md`.
