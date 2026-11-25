# ADR 0003 — Kontrak HTTP bersama antara Rust dan UI

- **Status:** Diusulkan (menunggu owner; backlog `DEC-2`)
- **Backlog:** `PORT-4`, `FE-6`
- **Tanggal:** 2026-11-25

## Konteks

Setelah ADR 0001, UI Next.js memanggil service Rust lewat HTTP. Tipe respons harus sama di kedua
sisi. Hari ini tipe TypeScript tersebar di `src/lib/*.ts` dan route handler, tanpa skema.

## Usulan

1. **Sumber kebenaran: `rust/crates/pemdi-contracts`.** Setiap tipe yang melintasi HTTP ditulis
   sekali di sana.
2. **TypeScript dibangkitkan.** Sebuah langkah build (`scripts/contracts.sh`) menulis
   `src/contracts/*.ts` dari crate itu (kandidat: `ts-rs` atau `schemars` → JSON Schema →
   `json-schema-to-typescript`). Berkas hasil dicek di gate: bila tidak sama, gate gagal, seperti
   `scripts/error-codes.sh`.
3. **Satu klien API di UI** (`src/api/client.ts`): memanggil endpoint, membaca badan error
   `{ error: { code, message, requestId } }` di satu tempat, dan mengembalikan tipe dari
   `src/contracts/`.
4. **Kode error UI** dibangkitkan dari registry yang sama (`@emit ts src/contracts/error-codes.ts`).

## Yang perlu diputuskan owner

- Alat pembangkit (`ts-rs` lebih langsung; `schemars` memberi JSON Schema yang juga berguna untuk
  dokumentasi API). Keduanya dependensi baru, jadi perlu persetujuan.
