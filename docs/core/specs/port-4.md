# `PORT-4` Tipe TypeScript dibangkitkan dari `pemdi-contracts`

| | |
| --- | --- |
| Backlog | `PORT-4` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | `DEC-2` — pilihan alat (`ts-rs` atau `schemars` + JSON Schema) masih **Open** |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

[ADR 0003](../../adr/0003-kontrak-api.md) menetapkan `rust/crates/pemdi-contracts` sebagai sumber
kebenaran tipe yang melintasi HTTP, dan TypeScript dibangkitkan dari sana. Hari ini:

- `rust/crates/pemdi-contracts/src/lib.rs` hanya berisi `Health`, `HealthStatus`, dan `Page<T>`.
- Tipe TypeScript tersebar tanpa skema: `QueryResult` di `src/lib/lakehouse.ts:116-122`, `Upload`
  `:140-154`, `UploadPreview` `:156-161`, `ChatAnswer` `:216`, `Dok`/`HasilAi` di
  `src/lib/store.ts:17-45`, `Penilaian` di `src/lib/penilaian.ts:9-15`, `Opd` di
  `src/lib/data.ts:14`, `DataMakro` di `src/lib/makro.ts:51-56`, `DataSpm` di
  `src/lib/spm.ts:51-56`, `DataProsn` di `src/lib/prosn.ts:80-85`, `DasborData` di
  `src/app/dasbor.tsx` (berkas 733 baris, dibekukan ratchet).
- `FE-6` menulis `src/contracts/*.ts` dengan tangan sebagai seam, dan akan diganti hasil generate
  oleh task ini.

Tanpa pembangkit, setiap perubahan tipe Rust dan TypeScript harus dicocokkan manual, dan tidak ada
yang menangkap ketika UI membaca field yang sudah tidak ada.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Halaman tidak lagi menampilkan "belum ada" karena salah nama field;
perubahan kontrak muncul sebagai kegagalan gate, bukan sebagai layar kosong di produksi.

## Rancangan

Kerjakan hanya setelah owner memilih alat di `DEC-2`; spec ini menyiapkan dua jalur, dan langkah
yang sama untuk keduanya:

1. `scripts/contracts.sh --write` menulis `src/contracts/*.ts` dari crate; `--check` menulis ke
   direktori sementara, membandingkan byte, dan keluar 1 bila berbeda (pola sama dengan
   `scripts/error-codes.sh`, yang sudah dipakai untuk `error-codes.rs`).
2. Jalur **ts-rs**: `ts-rs` di `[workspace.dependencies]`, `#[derive(TS)] #[ts(export,
   export_to = "../../../src/contracts/")]` pada setiap tipe yang melintasi HTTP. Jalur
   **schemars**: `schemars` menghasilkan JSON Schema, lalu `json-schema-to-typescript` menulis
   `.ts`. Keduanya **dependensi baru: butuh persetujuan owner** (`DEC-2`).
3. `src/contracts/index.ts` menjadi satu pintu; `src/contracts/error-codes.ts` dibangkitkan dari
   registry yang sama (`@emit ts` di `.agents/error-codes.tsv`).
4. Tipe `Option<T>` menjadi `T | null` (bukan `?:`), sesuai `docs/conventions.md`; `#[serde(
   rename_all = "camelCase")]` wajib, dan `tests/contract/` yang sudah ada memeriksa tidak ada kunci
   ber-`_`. **Catatan:** `tests/contract/` ada di `.agents/protected-paths`; menambah kasus di sana
   adalah keputusan owner, jadi bagian itu diminta lewat PR, bukan dikerjakan worker.
5. Pemeriksaan di gate: baris `contracts` di `scripts/check.sh`. **`scripts/check.sh` juga path
   terlindungi**, jadi worker menyiapkan skripnya dan menyerahkan satu baris diff gate kepada owner;
   sampai itu masuk, `--check` dijalankan manual dan dicatat di PR.

Urutan tipe yang didahulukan (dipakai `PORT-40`–`PORT-45`): `Upload`, `UploadPreview`,
`QueryResult`, `ChatAnswer`/`ToolTrace`, `Dok`/`HasilAi`/`Temuan`/`Metrik`, `Penilaian`, `Opd`,
`DataMakro`/`DataSpm`/`DataProsn`, `TableDef`.

Daftar "what differs" yang relevan: `undefined` vs `null` (jangan `?:`), angka JSON (D-2: `1` vs
`1.0`), urutan kunci (deklarasi struct = urutan kunci JSON; TypeScript tidak peduli), dan tipe
waktu (`diunggah`, `diperbarui`, `pada` adalah string ISO, bukan `Date`).

## Kriteria penerimaan

- [ ] `DEC-2` berstatus **Decided**, dan alat yang dipilih tercatat di ADR 0003.
- [ ] `scripts/contracts.sh --write` menghasilkan `src/contracts/*.ts`; `bun run typecheck` lulus
      dengan berkas itu.
- [ ] `scripts/contracts.sh --check` keluar 0 pada pohon bersih, dan keluar 1 setelah satu field
      `Health.version` diganti nama di crate.
- [ ] `git grep -n ' = any' src/contracts` kosong, dan `git grep -nE '\?:' src/contracts` kosong.
- [ ] `tests/contract/` (dimiliki owner) memeriksa tidak ada kunci respons ber-`_`; hasilnya
      dicantumkan di PR.
- [ ] `scripts/check.sh` PASS, dengan baris gate `contracts` sudah ada (PR terpisah ke owner).

## Yang tidak dikerjakan

Mengganti tipe tulisan tangan di `src/lib/*.ts` dan `src/app/dasbor.tsx`; itu `FE-5`/`FE-1`.
Menerbitkan dokumentasi OpenAPI: belum ada yang memintanya dan bukan kebutuhan kontrak internal.
