# Backlog

Daftar induk pekerjaan Pemdi-AI. Setiap item punya ID tetap yang tidak pernah dipakai ulang.
Agent membaca berkas ini dari `main`, satu baris per ID, dengan `scripts/backlog.sh get <ID>`;
jangan membaca seluruh berkas. Tidak ada salinan Lark untuk proyek ini (owner, 2026-11-25):
repositori adalah satu-satunya papan.

## Kolom

- **Kind:** **Feature** (sesuatu yang bisa dilakukan atau diandalkan pengguna; punya halaman di
  [`features/`](features/) dengan checklist penerimaan), **Task** (pekerjaan yang bukan kemampuan
  pengguna: porting, perbaikan, test, operasi), atau **Decision** (pilihan owner).
- **Module:** Indeks Pemdi, Kinerja Daerah, Dokumen & Bukti, AI Tubaba, Platform, Port, Frontend,
  Data, Operasi, Keamanan, Docs.
- **Priority:** P0 (menghalangi produksi), P1, P2, P3.
- **Status:**
  - Feature: **Idea**, **Planned**, **Building**, **In Acceptance** (sudah jalan, menunggu checklist
    owner), **Released** (diterima di deployment nyata, dengan bukti), **Killed**.
  - Task: **Todo**, **In Progress**, **Blocked** (sudah mulai lalu berhenti; alasan di teks),
    **Done**, **Cancelled**.
  - Decision: **Open**, **Decided**.
- **PR:** pull request yang mengerjakannya. **Source:** asal item, agar bisa dicek.
- **Blocked by `<ID>`** di teks item berarti belum bisa mulai sebelum item itu selesai. Itu
  dependensi, bukan status.

PR yang mengerjakan sebuah item juga mengubah baris item itu, dan hanya baris itu.

## Now (P0–P1)

| ID | Kind | Item | Module | Priority | Status | PR | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `OPS-1` | Task | Token JWT lakehouse (oidc-mock) kedaluwarsa tiap 30 hari dan tidak diperbarui; berikutnya **sekitar 2026-12-13**. Jadwalkan `scripts/portainer.sh token` tiap 21 hari, atau pasang pembaruan otomatis di stack, lalu catat tanggal habisnya di `docs/OPERATIONS.md` | Operasi | P0 | Todo |  | insiden 2026-11-12 |
| `DOC-1` | Task | Adopsi RantAI guidelines: `AGENTS.md`, gate `scripts/check.sh`, ratchet, protected paths, CI, hook, dokumen produk `docs/core/`, ADR 0001–0003, scaffold Rust | Docs | P1 | Done |  | owner 2026-11-25 |
| `PORT-0` | Task | Scaffold workspace Rust (7 crate, test boundary, `GET /api/health`, `ApiError` + kode error dibangkitkan) dan catat baseline angka keberhasilan: RAM idle/menjawab dan ukuran image kontainer `app` sekarang | Port | P1 | In Progress |  | `docs/port/README.md` §0 |
| `PORT-1` | Task | Port `makro-hitung` (laju, lajuBaik, capaian, kategori) ke `pemdi-domain`; paritas 452 kasus | Port | P1 | Done |  | `docs/port/ledger.md` |
| `PORT-2` | Task | `scripts/oracle/unseen.sh <modul>`: bangkitkan kasus dengan seed acak dan jalankan test paritas di atasnya, untuk review slice | Port | P1 | Todo |  | `docs/port/README.md` §5 |
| `PORT-3` | Task | Oracle untuk modul ber-I/O: rekam permintaan/respons lakehouse dan LLM (rahasia dan data pribadi dihapus) menjadi case file; putar ulang di test adapter Rust | Port | P1 | Todo |  | port-code §2 |
| `PORT-4` | Task | Pembangkit tipe TypeScript dari `pemdi-contracts` dan pengecekannya di gate. **Blocked by `DEC-2`** | Port | P1 | Todo |  | ADR 0003 |
| `PORT-11` | Task | Port kerangka Indeks Pemdi dan `hitungIndeks` (termasuk nilai sementara dan predikat Permen PANRB 8/2026) ke `pemdi-domain/src/pemdi/`, dengan oracle dan paritas | Port | P1 | Todo |  | ledger §1 |
| `PORT-12` | Task | Port katalog 68 kebutuhan data (`src/data/kebutuhan.ts`). **Blocked by `PORT-11`** | Port | P1 | Todo |  | ledger §1 |
| `PORT-13` | Task | Port kerangka Makro/SPM/PROSN (`src/lib/kerangka.ts`, `src/data/kerangka/*`). **Blocked by `PORT-12`** | Port | P1 | Todo |  | ledger §1 |
| `PORT-14` | Task | Port `spm-hitung` | Port | P1 | Todo |  | ledger §1 |
| `PORT-15` | Task | Port `prosn-hitung` | Port | P2 | Todo |  | ledger §1 |
| `PORT-10` | Task | Port `seri` dan `terkini` (makro-hitung) setelah kontrak `NilaiMakro` ada di `pemdi-contracts` | Port | P1 | Todo |  | ledger §1 |
| `PORT-20` | Task | Adapter lakehouse (`src/lib/lakehouse.ts`): login sesi, SQL read-only, upload, copilot NL2SQL stream. **Blocked by `PORT-3`** | Port | P1 | Todo |  | ledger §2 |
| `PORT-21` | Task | Adapter LLM (`src/lib/llm.ts`), termasuk header `x-opencode-session`. **Blocked by `PORT-3`** | Port | P1 | Todo |  | ledger §2 |
| `PORT-22` | Task | Adapter registry (`store.ts`, `penilaian.ts`): format `data/*.json` tetap sama | Port | P1 | Todo |  | ledger §2 |
| `PORT-23` | Task | Adapter berkas sumber dan data Makro/SPM/PROSN (`makro.ts`, `spm.ts`, `prosn.ts`, `berkas.ts`), termasuk whitelist manifest | Port | P1 | Todo |  | ledger §2 |
| `PORT-24` | Task | Adapter intake (ekstraksi teks PDF/Office, OCR). **Blocked by `DEC-5`** | Port | P1 | Todo |  | ledger §2 |
| `PORT-25` | Task | Adapter pengguna dan sesi (`users.ts`, `auth.ts`): cookie `pemdi_sesi` tetap kompatibel | Port | P1 | Todo |  | ledger §2 |
| `FE-1` | Task | Pecah `src/app/dasbor.tsx` (733 baris, dibekukan ratchet) menjadi panel `ringkasan`, `indikator`, `temuan`, `pilih` (bagian a), lalu hapus impor lintas-rute `@/app/dasbor` dan `@/app/dashboard-pemdi/dasbor-pemdi` (bagian b). Spec `specs/fe-1.md` | Frontend | P1 | Todo |  | `docs/port/frontend-audit.md` §7 #1–2 |
| `FE-2` | Task | Tiga rule aksesibilitas Biome ke nol (`useKeyWithClickEvents`, `noStaticElementInteractions`, `useSemanticElements`: 37 temuan; terbanyak `viz-spm`, `viz-prosn`, `viz-makro`). Spec `specs/fe-2.md`. **Blocked by `FE-4`** (bagian a: gate) | Frontend | P1 | Todo |  | `docs/port/frontend-audit.md` §7 #6 |
| `FE-3` | Task | Hapus 47 non-null assertion (`!`) tanpa mengubah angka tampil. Spec `specs/fe-3.md`. **Blocked by `TEST-1`** | Frontend | P2 | Todo |  | `docs/port/frontend-audit.md` §7 #7 |
| `FE-4` | Task | Struktur per fitur: `scripts/check-boundaries.ts` + skrip `lint`/`boundaries`/`test` dan penyambungannya ke gate (bagian a), pindahkan `indeks-pemdi` dan `masuk` ke `src/features/` (bagian b), sisa fitur satu PR per fitur (bagian c). Spec `specs/fe-4.md` | Frontend | P1 | Todo |  | `docs/port/frontend-audit.md` §7 #3–5 |
| `FE-5` | Task | Halaman mengambil data lewat klien API, satu PR per halaman (bagian a `/data` … j `/login`, urutan dan endpoint di spec). Setiap bagian **Blocked by** route Rust-nya (`PORT-30`–`PORT-45`). Spec `specs/fe-5.md`. **Blocked by `FE-6`** | Frontend | P2 | Todo |  | `docs/port/frontend-audit.md` §7 #14–23 |
| `FE-6` | Task | Satu klien API (`src/api/client.ts`): satu-satunya `fetch`, satu pembaca badan error; tipe di `src/contracts/` ditulis tangan dulu sebagai seam, diganti hasil generate oleh `PORT-4`. Bisa mulai sekarang. Spec `specs/fe-6.md` | Frontend | P1 | Todo |  | `docs/port/frontend-audit.md` §7 #13; owner/planner 2026-11-25 |
| `FE-7` | Task | Satu modul format angka (`components/format.ts`): gabungkan 4 `dec`, 2 `fmtL`, `ukuran`/`fmtBytes`, `toLocaleString` inline; test karakterisasi dari keluaran hari ini. Spec `specs/fe-7.md`. **Blocked by `FE-4`** (bagian a) | Frontend | P2 | Todo |  | `docs/port/frontend-audit.md` §7 #8 |
| `FE-8` | Task | Satu kosakata status dan satu komponen chip (`components/status.ts`; 5 sumber, `Badge` vs `Chip`). Spec `specs/fe-8.md`. **Blocked by `FE-7`** | Frontend | P2 | Todo |  | `docs/port/frontend-audit.md` §7 #9 |
| `FE-9` | Task | Satu set primitif tampilan: hapus 4 `Judul`, 5 `Baris`, `PageHeader` vs `KepalaHalaman`. Spec `specs/fe-9.md`. **Blocked by `FE-7`** | Frontend | P2 | Todo |  | `docs/port/frontend-audit.md` §7 #10 |
| `FE-13` | Task | Satu penanganan kesalahan UI: `code` → teks Indonesia di satu tempat (`app/error.tsx`, klien API). Spec `specs/fe-13.md`. **Blocked by `FE-6`** | Frontend | P2 | Todo |  | `docs/port/frontend-audit.md` §7 #25 |
| `TEST-1` | Task | Test karakterisasi TypeScript untuk `hitungIndeks`, `makro-hitung`, `spm-hitung` sebelum disentuh, supaya UI lama terjaga sampai cutover | Platform | P1 | Todo |  | audit guidelines: 0 test |
| `AI-1` | Task | Grafik jawaban AI Tubaba kadang menggambar kueri pencarian (mis. hitungan kata kunci), bukan kueri jawaban. Pilih kueri yang relevan, atau tandai kueri eksplorasi | AI Tubaba | P1 | Todo |  | tes produksi 2026-11-13 |
| `SEC-1` | Task | Endpoint LLM produksi masih OpenCode Go (diperuntukkan agent koding). Pindah ke endpoint yang sah untuk produksi atau model lokal. **Blocked by `DEC-3`** | Keamanan | P1 | Todo |  | `docs/REVIEW-PROPOSAL.md` P0-2 |
| `DATA-1` | Task | Bappeda memverifikasi catatan data: tabel target RPJMD 4.7 vs 4.6, target Gini 2026, SPM 2020 "8,35", penurunan SPM kesehatan 2025 | Data | P1 | Todo |  | `features/kinerja-makro.md`, `features/capaian-spm.md` |

## Next (P2)

| ID | Kind | Item | Module | Priority | Status | PR | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PORT-30` | Task | Use case tabel dan konteks skema NL2SQL (`tables.ts`, `user-tables.ts`, `data.ts`, `api.ts`). **Blocked by `PORT-20`** | Port | P2 | Todo |  | ledger §3 |
| `PORT-31` | Task | Use case kebutuhan dan bukti. **Blocked by `PORT-12`, `PORT-22`** | Port | P2 | Todo |  | ledger §3 |
| `PORT-32` | Task | Use case ringkasan dan dasbor Pemdi. **Blocked by `PORT-13`, `PORT-22`** | Port | P2 | Todo |  | ledger §3 |
| `PORT-33` | Task | Use case dasbor data (dengan narasi LLM). **Blocked by `PORT-21`, `PORT-32`** | Port | P2 | Todo |  | ledger §3 |
| `PORT-34` | Task | Use case estimasi nilai (penilaian AI). **Blocked by `PORT-21`, `PORT-31`** | Port | P2 | Todo |  | ledger §3 |
| `PORT-35` | Task | Use case antrean dokumen: intake → ekstraksi AI → sinkron ke lakehouse; antrean persisten. **Blocked by `PORT-24`, `PORT-30`** | Port | P2 | Todo |  | ledger §3 |
| `PORT-40` | Task | Route login/logout dan middleware sesi. **Blocked by `PORT-25`** | Port | P2 | Todo |  | ledger §4 |
| `PORT-41` | Task | Route `/api/ask` (stream NDJSON, ping 15 dtk, pemilihan hasil). **Blocked by `PORT-30`** | Port | P2 | Todo |  | ledger §4 |
| `PORT-42` | Task | Route unggah dan dokumen. **Blocked by `PORT-35`** | Port | P2 | Todo |  | ledger §4 |
| `PORT-43` | Task | Route penilaian. **Blocked by `PORT-34`** | Port | P2 | Todo |  | ledger §4 |
| `PORT-44` | Task | Route narasi makro dan berkas sumber. **Blocked by `PORT-23`** | Port | P2 | Todo |  | ledger §4 |
| `PORT-45` | Task | Endpoint data halaman (yang kini dibaca server component langsung), satu per halaman | Port | P2 | Todo |  | ledger §4 |
| `PORT-46` | Task | Kontainer `pemdi-api` di stack Portainer di samping `app`; Next.js meneruskan `/api/*` yang sudah diporting, mode bayangan mencatat selisih | Port | P2 | Todo |  | port-code §7 |
| `PORT-47` | Task | Cutover per kelompok route, 7 hari tanpa selisih, lalu hapus kode TS lama pada minggu yang sama | Port | P2 | Todo |  | port-code §7–8 |
| `PORT-48` | Task | Terapkan `docs/conventions.md` pada respons API (badan error, amplop list), satu endpoint per PR, setelah cutover | Port | P2 | Todo |  | ADR 0001 |
| `PORT-50` | Task | Perbaiki bug lama B-1 (target negatif di `capaian`) setelah cutover | Port | P3 | Todo |  | `docs/port/differences.md` |
| `DATA-2` | Task | Sinkronkan data Makro dan SPM ke lakehouse supaya AI Tubaba bisa menjawabnya | Data | P2 | Todo |  | percakapan 2026-11-04 |
| `DATA-3` | Task | Muat tabel peternakan dari TBB Dalam Angka (pertanyaan "jumlah kambing" belum bisa dijawab) | Data | P2 | Todo |  | tes produksi 2026-11-13 |
| `AI-2` | Task | Jawaban per tahun digambar sebagai grafik garis, bukan batang dari kueri lain | AI Tubaba | P2 | Todo |  | tes 2026-11-05 |
| `AI-3` | Task | Baca dokumen penuh: hapus batas 14.000 karakter, map-reduce per bagian dengan sitasi halaman | Dokumen & Bukti | P2 | Todo |  | `docs/ARSITEKTUR.md` §11 |
| `AI-4` | Task | Mistral OCR per halaman dengan fallback lokal. **Blocked by `DEC-5`** | Dokumen & Bukti | P2 | Todo |  | `docs/ARSITEKTUR.md` §5.4 |
| `SEC-2` | Task | Login OIDC/SSO dan peran (Bappeda, Diskominfo, OPD) menggantikan `users.json` | Keamanan | P2 | Todo |  | `docs/ARSITEKTUR.md` §11 |
| `SEC-3` | Task | Redaksi data pribadi otomatis di dokumen unggahan | Keamanan | P2 | Todo |  | `docs/ARSITEKTUR.md` §11 |
| `OPS-2` | Task | Backup dan uji restore: Postgres, ClickHouse, RustFS, volume `app_data` | Operasi | P2 | Todo |  | `docs/ARSITEKTUR.md` §10 |

## Later (P3)

| ID | Kind | Item | Module | Priority | Status | PR | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FE-10` | Task | Satu pustaka grafik: `charts.tsx` (ECharts) di AI Tubaba pindah ke Recharts (`viz.tsx`), `echarts` keluar dari dependensi; ukuran image diukur di host Portainer | Frontend | P3 | Todo |  | `docs/port/frontend-audit.md` §7 #11 |
| `FE-11` | Task | Pecah berkas 400–600 baris saat disentuh (tanya, penilaian, viz-laporan, spm-detail, spm-halaman, viz-spm, viz-makro, dokumen); tanpa PR khusus | Frontend | P3 | Todo |  | `docs/port/frontend-audit.md` §7 #12 |
| `FE-12` | Task | Hapus kode server TS lama per kelompok ledger setelah cutover: `git grep` impor = 0. **Blocked by `FE-5`, `PORT-47`** | Frontend | P3 | Todo |  | `docs/port/frontend-audit.md` §7 #24 |
| `AI-5` | Task | RAG dokumen: tanya isi dokumen bukti dengan sitasi | AI Tubaba | P3 | Todo |  | `docs/ARSITEKTUR.md` §7.5 |
| `SEC-4` | Task | Model bahasa lokal on-premise dan blokir egress ke LLM eksternal | Keamanan | P3 | Todo |  | `docs/REVIEW-PROPOSAL.md` |
| `PLAT-1` | Task | Multi-tenant: `tenant_id` di semua lapisan untuk kabupaten/kota lain | Platform | P3 | Todo |  | `docs/ARSITEKTUR.md` §12 |

## Features

Fitur yang sudah ada. Masing-masing punya halaman di [`features/`](features/). Sudah berjalan di
produksi, tetapi belum melewati checklist penerimaan owner, jadi statusnya **In Acceptance**.

| ID | Kind | Item | Module | Priority | Status | PR | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FT-1` | Feature | Beranda: ringkasan indeks dan kinerja daerah, keterlibatan OPD per indikator | Indeks Pemdi | P1 | In Acceptance |  | `features/beranda.md` |
| `FT-2` | Feature | Indeks Pemdi: 7 aspek, 20 indikator, temuan, nilai sementara dan predikat | Indeks Pemdi | P1 | In Acceptance |  | `features/indeks-pemdi.md` |
| `FT-3` | Feature | Kinerja Makro: 6 indikator LPPD, capaian terhadap target RPJMD, sumber terlampir | Kinerja Daerah | P1 | In Acceptance |  | `features/kinerja-makro.md` |
| `FT-4` | Feature | Capaian SPM per jenis layanan | Kinerja Daerah | P1 | In Acceptance |  | `features/capaian-spm.md` |
| `FT-5` | Feature | PROSN (disembunyikan: `TAMPIL_PROSN=false`, menunggu review kriteria) | Kinerja Daerah | P2 | Building |  | `features/prosn.md` |
| `FT-6` | Feature | Kesiapan OPD: bukti dan kebutuhan per OPD | Dokumen & Bukti | P1 | In Acceptance |  | `features/kesiapan-opd.md` |
| `FT-7` | Feature | Data & Aplikasi: inventaris aplikasi dan data | Indeks Pemdi | P2 | In Acceptance |  | `features/data-aplikasi.md` |
| `FT-8` | Feature | Dokumen bukti: unggah, ekstraksi teks/OCR, temuan AI | Dokumen & Bukti | P1 | In Acceptance |  | `features/dokumen-bukti.md` |
| `FT-9` | Feature | Kebutuhan data: 68 kebutuhan dengan status terpenuhi | Dokumen & Bukti | P1 | In Acceptance |  | `features/kebutuhan-data.md` |
| `FT-10` | Feature | Penilaian indikator: usulan nilai AI dan koreksi manual | Indeks Pemdi | P1 | In Acceptance |  | `features/penilaian-indikator.md` |
| `FT-11` | Feature | AI Tubaba: tanya data dalam bahasa Indonesia, tabel, grafik, SQL terbuka | AI Tubaba | P1 | In Acceptance |  | `features/ai-tubaba.md` |
| `FT-12` | Feature | Masuk dan sesi | Keamanan | P1 | In Acceptance |  | `features/masuk-dan-sesi.md` |
| `FT-13` | Feature | Dua domain: `epemdi.ai.id` dan `pemdi.rantai.dev` ke aplikasi yang sama | Operasi | P1 | In Acceptance |  | percakapan 2026-11-11 |

## Decisions

| ID | Kind | Item | Module | Priority | Status | PR | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DEC-1` | Decision | Backend pindah ke Rust (axum), UI tetap Next.js; alasan: satu stack dengan lakehouse. Risky paths kosong; backlog di repo tanpa Lark | Port | P1 | Decided |  | owner 2026-11-25; ADR 0001 |
| `DEC-2` | Decision | Alat pembangkit tipe TypeScript dari Rust: `ts-rs` atau `schemars` + JSON Schema (keduanya dependensi baru) | Port | P1 | Open |  | ADR 0003 |
| `DEC-3` | Decision | Endpoint LLM produksi: penyedia berbayar yang sah untuk produksi, atau model lokal di server pemda | Keamanan | P1 | Open |  | `docs/REVIEW-PROPOSAL.md` |
| `DEC-4` | Decision | Alat build data (`scripts/*-bangun.ts`, `*.py`) tetap TypeScript/Python, atau ikut ke Rust setelah cutover | Port | P3 | Open |  | ledger |
| `DEC-5` | Decision | OCR produksi: Mistral OCR (data keluar) atau lokal (RapidOCR/PaddleOCR), per tenant | Dokumen & Bukti | P2 | Open |  | `docs/ARSITEKTUR.md` §5.4 |
| `DEC-7` | Decision | Setujui sekaligus dependensi Rust yang dibutuhkan spec porting, supaya tidak diputuskan per PR: `reqwest` (`PORT-20`, `PORT-21`), `regex` (`PORT-12`, `PORT-31`), `scrypt` + `hmac` + `sha2` (`PORT-22`/`PORT-25`), `unicode-normalization`, `zip`, `quick-xml`, `calamine` (`PORT-24`), `sha1` (`PORT-35`). Alasan per crate ada di spec masing-masing | Port | P1 | Open |  | spec `PORT-*`, 2026-11-25 |
| `DEC-6` | Decision | Kapan PROSN ditampilkan: setelah ~10 pilihan a/b yang meragukan direview | Kinerja Daerah | P2 | Open |  | `features/prosn.md` |
