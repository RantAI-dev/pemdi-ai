# `PORT-23` Adapter berkas sumber dan data Makro/SPM/PROSN

| | |
| --- | --- |
| Backlog | `PORT-23` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Empat modul membaca berkas dan JSON dari disk, dan hampir semua angka dasbor berasal dari sana:

- `src/lib/makro.ts` (142 baris): enam indikator tetap (`:59-122`), `muatMakro` membaca
  `src/data/makro/nilai.json` dan `sumber.json` lalu menyimpan cache (`:124-135`), `tahunUtama: 2025`
  (`:133`), `hrefHalaman` menambah `#page=` hanya untuk PDF/RPJMD (`:138-142`).
- `src/lib/spm.ts` (97 baris): `susunLayanan` menelusuri tiga tingkat kerangka SPM (`:64-83`),
  `kewenangan` = `"provinsi"` bila cabang `id === "provinsi"`, dan `opd` diwarisi dari daun →
  cabang → bidang (`:77`).
- `src/lib/prosn.ts` (147 baris): `dasarHukum` (`:88`), `nilaiKriteria` (`:93`) memakai aturan angka
  Indonesia — `replace(/\./g,"").replace(",", ".")`, jadi `"1.500,00"` → `1500` — `teksKriteria`
  (`:99`), `susunIndikator` (`:103-132`) dengan `id` jalur penuh dan
  `bobot = Math.round(bobot * 100 * 100) / 100` (`:118`).
- `src/lib/berkas.ts` (105 baris): `SUMBER_DIR` (`:11`), peta 14 tipe MIME (`:13-28`),
  `namaHeader`/`disposisi` (`:36-43`), `bacaRange` (`:53-71`), `sajikanBerkas` dengan 200/206/404/416
  dan header `Cache-Control: private, max-age=0, must-revalidate`, `X-Content-Type-Options:
  nosniff` (`:73-105`).

`nilaiKriteria` dan `bobot` itulah dua tempat pembulatan/parsing yang paling mudah salah.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Angka Makro, SPM, dan PROSN terbaca dari berkas yang sama, dan
penampil PDF tetap bisa memuat sebagian berkas (Range) dengan header yang sama.

## Rancangan

- `rust/crates/pemdi-ports/src/sumber.rs`: `trait Sumber { fn muat_makro(&self) -> Result<DataMakro,
  PortError>; fn muat_spm(...); fn muat_prosn(...); fn kumpulan_sah(&self) -> Vec<String>;
  fn manifest(&self, kumpulan: &str) -> Result<Vec<String>, PortError>;
  fn buka_berkas(&self, path: &Path) -> Result<Berkas, PortError>; }` dengan `Berkas { ukuran,
  pembaca }`.
- Tipe `DataMakro`/`DataSpm`/`DataProsn` di `pemdi-contracts` (sudah ada di TS, akan dipakai
  `PORT-44`/`PORT-45`); adapter mengurai JSON ke tipe itu, `pemdi-app` menyusun daftar layanan dan
  indikator dari pohon `PORT-13` (fungsi murni, ditaruh di `pemdi-domain` dan diuji di sana).
- Adapter `pemdi-adapters/src/sumber.rs`: `tokio::fs`, `serde_json`; cache dengan `OnceLock` +
  `RwLock`, sama seperti `let cache` di TS (`:125`, `:87`, `:137`).
  - `hrefHalaman`, `dasarHukum`, `nilaiKriteria`, `teksKriteria`, `susun_layanan`, `susun_indikator`,
    `tipe_berkas`, dan `baca_range` adalah fungsi murni → oracle `sumber` (`modules.ts`) dan
    generator `cases.ts`, ≥ 200 kasus.
  - `nilaiKriteria`: uji `"1,50"`, `"1.500,00"`, `"0,50"`, `"10"`, `"abc"` (→ `NaN`; di JSON
    menjadi `null`, D-1).
  - `bobot`: `js_round(x * 100.0) / 100.0` dengan helper `js_round` (lihat `PORT-15`).
  - `baca_range`: uji `bytes=0-99`, `bytes=100-`, `bytes=-500`, `bytes=0-0`, `bytes=abc`,
    `bytes=5-2`, `bytes=0-999999` (dipangkas), berkas 0 byte.
  - `disposisi`: nama ASCII, nama ber-spasi, nama ber-kutip, nama non-ASCII (percent-encode UTF-8).
- Whitelist manifest (bagian dari baris ledger): `kumpulan_sah()` memindai `SUMBER_DIR` untuk folder
  `^[a-z0-9][a-z0-9-]*$` yang punya `manifest.json`, cache 60 detik (pola
  `src/app/api/sumber/[...berkas]/route.ts:27-52`). Route-nya sendiri `PORT-44`.
- Daftar "what differs" yang berlaku, spesifik:
  - **Pembulatan:** `js_round` untuk `bobot`.
  - **Angka JSON:** `tahunTerbit`/`halaman`/`ukuranKb` `Option<i64>`; `nilai` f64; D-2.
  - **Panjang teks:** `encodeURIComponent` meng-escape per karakter UTF-16; implementasi Rust
    meng-escape per byte UTF-8 — hasil sama untuk teks sah, diuji dengan nama beraksen.
  - **Regex:** `/\.pdf($|[?#])/i` pada `hrefHalaman`.
  - **Urutan:** urutan larik JSON dipertahankan (`Vec`), `Map` tidak dipakai.

## Kriteria penerimaan

- [ ] `tests/parity/sumber.cases` ≥ 200 kasus, semuanya lulus lewat test Rust.
- [ ] Test `muat_*`: berkas asli `src/data/{makro,spm,prosn}/*.json` diurai; jumlah baris `nilai`,
      `sumber`, `penilaian`, dan `indikator` sama dengan keluaran oracle (dicetak test).
- [ ] Test Range: transkrip `curl -sI -H 'Range: bytes=0-99' localhost:3200/api/sumber/spm/<berkas>`
      → `206`, `Content-Range`, `Content-Length: 100`, `Accept-Ranges`.
- [ ] Test manifest: folder tanpa `manifest.json`, nama folder `../x`, dan berkas di luar manifest
      ditolak (400/404 sesuai `PORT-44`).
- [ ] Baris ledger `PORT-23` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Membangun ulang `src/data/*` dari PDF (`scripts/*-bangun.ts`, `DEC-4`), route `/api/sumber`
(`PORT-44`), dan endpoint data halaman (`PORT-45`).
