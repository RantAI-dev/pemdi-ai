# Ledger porting: TypeScript ke Rust

Alasan dan angka: satu stack dengan RantAI Lakehouse; RAM dan ukuran image backend turun, nol
selisih angka (`DEC-1`, [README.md](README.md) §0). Oracle: `bun scripts/oracle/run.ts <modul>`.
Base commit: `638d664`.

Status: todo, oracle ready, in progress, parity green, shadowed, cut over, old code deleted.

Aturan: baris pindah ke "parity green" hanya berdasarkan keluaran `scripts/check.sh`. Modul tidak
diporting sebelum semua dependensinya "parity green". Tidak ada pekerjaan fitur di modul yang
"in progress". Backlog ID di kolom terakhir.

## 1. Domain murni → `rust/crates/pemdi-domain`

| Modul (path lama) | Path baru | Bergantung pada | Case file | Kasus | Status | Backlog |
|---|---|---|---|---|---|---|
| `src/lib/makro-hitung.ts` (laju, lajuBaik, capaian, kategori) | `src/makro.rs` | tidak ada | `tests/parity/makro-hitung.cases` | 452 | parity green | `PORT-1` |
| `src/lib/makro-hitung.ts` (seri, terkini) | `src/makro.rs` | kontrak `NilaiMakro` | — | — | todo | `PORT-10` |
| `src/data/permen-kriteria.json`, `src/data/pemdi.ts` (kerangka 7 aspek / 20 indikator, `hitungIndeks`, predikat) | `src/pemdi/` | tidak ada | `tests/parity/pemdi.cases` | — | todo | `PORT-11` |
| `src/data/kebutuhan.ts` (68 kebutuhan data) | `src/kebutuhan.rs` | `pemdi` | `tests/parity/kebutuhan.cases` | — | todo | `PORT-12` |
| `src/lib/kerangka.ts`, `src/data/kerangka/*.ts` | `src/kerangka/` | `pemdi`, `kebutuhan` | `tests/parity/kerangka.cases` | — | todo | `PORT-13` |
| `src/lib/spm-hitung.ts` | `src/spm.rs` | kontrak SPM | `tests/parity/spm-hitung.cases` | — | todo | `PORT-14` |
| `src/lib/prosn-hitung.ts` | `src/prosn.rs` | kontrak PROSN | `tests/parity/prosn-hitung.cases` | — | todo | `PORT-15` |

## 2. Adapter → `rust/crates/pemdi-adapters` (port di `pemdi-ports`)

Oracle berupa rekaman permintaan/respons (`PORT-3`).

| Modul | Path baru | Port | Bergantung pada | Status | Backlog |
|---|---|---|---|---|---|
| `src/lib/lakehouse.ts` | `src/lakehouse.rs` | `Lakehouse` | tidak ada | todo (kerangka saja) | `PORT-20` |
| `src/lib/llm.ts` | `src/llm.rs` | `Llm` | tidak ada | todo | `PORT-21` |
| `src/lib/store.ts`, `src/lib/penilaian.ts` (registry `data/*.json`) | `src/store.rs` | `Registry` | domain | todo | `PORT-22` |
| `src/lib/makro.ts`, `spm.ts`, `prosn.ts`, `berkas.ts` (berkas `src/data`, `sumber/`) | `src/sumber.rs` | `Sumber` | domain | todo | `PORT-23` |
| `src/lib/intake.ts` (ekstraksi teks, OCR) | `src/intake.rs` | `Intake` | tidak ada | todo | `PORT-24` |
| `src/lib/users.ts`, `src/lib/auth.ts` | `src/users.rs` + `pemdi-api/src/auth.rs` | `Users` | tidak ada | todo | `PORT-25` |

## 3. Use case → `rust/crates/pemdi-app`

| Modul | Bergantung pada | Status | Backlog |
|---|---|---|---|
| `src/lib/tables.ts`, `user-tables.ts`, `data.ts`, `api.ts` (konteks skema NL2SQL, tabel) | lakehouse | todo | `PORT-30` |
| `src/lib/kebutuhan.ts`, `bukti.ts` | kebutuhan, store, lakehouse | todo | `PORT-31` |
| `src/lib/ringkasan.ts`, `dasbor-pemdi.ts`, `kerangka-data.ts`, `kerangka-dokumen.ts` | pemdi, kerangka, penilaian, store | todo | `PORT-32` |
| `src/lib/dasbor-data.ts` | data, ringkasan, llm | todo | `PORT-33` |
| `src/lib/estimasi.ts` | bukti, kebutuhan, llm, penilaian | todo | `PORT-34` |
| `src/lib/proses.ts`, `sinkron.ts`, `dokumen.ts` (antrean dokumen → AI → lakehouse) | intake, llm, store, lakehouse, tables | todo | `PORT-35` |

## 4. Route → `rust/crates/pemdi-api/src/routes/`

| Route lama | Bergantung pada | Status | Backlog |
|---|---|---|---|
| — (`GET /api/health`, baru) | lakehouse | parity n/a, ada | `PORT-0` |
| `api/login`, `api/logout`, `src/proxy.ts` (sesi) | users | todo | `PORT-40` |
| `api/ask` (stream NDJSON + ping 15 dtk) | lakehouse, tables | todo | `PORT-41` |
| `api/upload`, `api/upload/ingest`, `api/dokumen`, `api/dokumen/[id]/berkas` | intake, proses, store | todo | `PORT-42` |
| `api/penilaian`, `api/penilaian/ai` | penilaian, estimasi | todo | `PORT-43` |
| `api/makro/narasi`, `api/sumber/[...berkas]` | sumber, llm | todo | `PORT-44` |
| Data halaman (server component yang kini membaca `src/lib` langsung) | semua use case | todo | `PORT-45`, `FE-*` |

## Tetap di TypeScript (milik UI)

`src/lib/*-tampil.ts`, `nilai-tampil.ts`, `utils.ts`, `fitur.ts` (flag tampilan), semua
`src/components/` dan `src/app/**/page.tsx`. Lihat [frontend-audit.md](frontend-audit.md).

## Alat build data (tidak diporting dulu)

`scripts/*-bangun.ts`, `seed.ts`, `lakehouse-bootstrap.ts`, `scripts/*.py`: berjalan di mesin
pengembang dan menghasilkan berkas yang dibaca backend. Diputuskan setelah cutover (`DEC-4`).
