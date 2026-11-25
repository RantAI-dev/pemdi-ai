# ADR 0001 — Backend pindah ke Rust, Next.js menjadi UI saja

- **Status:** Diterima (owner, 2026-11-25). Scaffold selesai; porting per modul belum dimulai.
- **Backlog:** `DEC-1`, `PORT-*`
- **Tanggal:** 2026-11-25

## Konteks

Pemdi-AI dibangun sebagai satu aplikasi Next.js 16 + Bun. Route handler di `src/app/api/` dan
modul `src/lib/` memegang semua logika backend: hitungan indeks dan kinerja, antrean dokumen,
intake dan OCR, klien lakehouse dan LLM, sesi pengguna. Halaman server component juga membaca
modul itu langsung.

RantAI Lakehouse, tempat data Pemdi-AI disimpan, ditulis dengan Rust/axum. Produk RantAI lain
mengikuti RantAI guidelines yang sama (gate `scripts/check.sh`, kode error tunggal, batas crate).

## Keputusan 1 — backend ditulis ulang dalam Rust

Semua logika server dipindahkan ke service `pemdi-api` (Rust, axum) di `rust/`. Alasannya satu
stack dengan lakehouse: satu bahasa dan toolchain, pola error dan auth yang sama, dan kode yang
bisa dipakai bersama. Angka keberhasilan ada di `docs/port/README.md` §0.

## Keputusan 2 — Next.js tetap, hanya sebagai UI

Tampilan (halaman, grafik Recharts, komponen) tidak ditulis ulang. Next.js memanggil service Rust
lewat klien API bertipe (ADR 0003) dan tidak lagi membaca berkas, lakehouse, atau LLM sendiri.
Menulis ulang UI dalam Rust (mis. Leptos) ditolak: tidak ada fitur yang membutuhkannya, dan risikonya
tampilan berubah.

## Keputusan 3 — porting bertahap dengan oracle

Mengikuti skill `port-code`: kode TypeScript lama adalah spesifikasi, setiap modul diporting
melawan case file yang dibangkitkan oracle, daun dulu, lalu dijalankan berdampingan sebelum
cutover. Tidak ada "big bang".

## Konsekuensi

- Selama porting ada dua backend; perubahan fitur di modul yang sedang diporting dibekukan.
- Image `app` nantinya tidak lagi butuh Python, uv, dan RapidOCR untuk logika server; OCR menjadi
  urusan adapter (ADR mendatang untuk Mistral OCR vs lokal).
- Respons `/api/*` dibekukan selama porting; konvensi error RantAI diterapkan setelah cutover.
