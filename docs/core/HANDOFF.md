# Handoff

Keadaan sekarang, untuk planner atau reviewer yang mengambil alih. Diperbarui 2026-11-25.

**Pembagian peran.** Planner (owner + agent) menyusun rencana, spec, dan scaffold. Pelaksana
mengerjakan task dari [ROADMAP.md](ROADMAP.md) mengikuti [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).
`PORT-1` dikerjakan planner hanya sebagai contoh alur porting; modul berikutnya milik pelaksana.

## Yang sudah di `main`

- Aplikasi lengkap (Next.js 16 + Bun) di commit `771092e`: semua fitur di
  [PRODUCT.md](PRODUCT.md) §2.

## Yang sedang berjalan (branch `chore/guidelines`)

- Adopsi RantAI guidelines: `AGENTS.md`, `scripts/check.sh`, ratchet, protected paths, CI, hook.
- Dokumen produk (`docs/core/`), ADR 0001–0003, rencana porting (`docs/port/`), dokumen
  engineering (`docs/DEVELOPMENT.md`, `OPERATIONS.md`, `CONFIGURATION.md`).
- Scaffold Rust (`rust/`): 7 crate, test boundary, `GET /api/health`, error standar, dan port
  pertama `makro-hitung` dengan paritas 452 kasus.
- Belum di-push dan belum ada PR. Owner yang memutuskan kapan.

## Cara mereview

1. `scripts/check.sh` harus `check: PASS` (ts, rust, py, size, errors, ratchet).
2. Untuk slice porting: bangkitkan kasus yang belum dilihat worker
   (`bun scripts/oracle/cases.ts <modul> <seed lain> /tmp/x.cases`) dan jalankan paritas di atasnya.
3. Untuk perubahan tampilan: tangkapan layar sebelum/sesudah.
4. `scripts/guard-diff.sh` menolak perubahan pada path di `.agents/protected-paths`.

## Yang perlu diwaspadai

- `OPS-1`: token lakehouse kedaluwarsa sekitar 2026-12-13.
- Jangan membangun image atau `next build` di mesin pengembang.
- Respons `/api/*` dibekukan selama porting (ADR 0001).
- Keputusan terbuka: `DEC-2` sampai `DEC-6`.
