# `PORT-33` Use case dasbor data

| | |
| --- | --- |
| Backlog | `PORT-33` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | `PORT-21` (adapter LLM) dan `PORT-32` (ringkasan) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/dasbor-data.ts` (37 baris) adalah satu-satunya perakit data untuk tiga halaman (`/indeks`,
`/indikator`, `/temuan` — `src/app/indeks/page.tsx:2`, `src/app/indikator/page.tsx:2`,
`src/app/temuan/page.tsx:2`). Isinya:

- `Promise.all` empat sumber: `getPipeline()`, `getOpd()`, `getSurveiTotal()`,
  `getSurveiPerIndikator()` (`:9`).
- Dua boolean keadaan: `llm: llmConfigured()` dan `lakehouse: survei.tersedia` (`:12-13`;
  `tersedia` = kueri mengembalikan ≥ 1 baris, `src/lib/data.ts:32`).
- Join indikator dengan penilaian: `nilai`, `penilai`, `penjelasan`, dan `jawaban` per indikator
  (`:14-17`).
- Proyeksi `kebutuhan` 11 field termasuk `opdBukti` unik dan `berkas: k.bukti.length` (`:19-31`).
- Proyeksi `dok` (`terbaca: karakter > 80`, `jenisDokumen`), `metrik` (diratakan, hanya AI selesai),
  dan `opd` (`:32-34`).
- Tipe `DasborData` diimpor dari `src/app/dasbor.tsx:6` — berkas 733 baris yang dibekukan ratchet
  (`.agents/size-baseline.tsv:2`), jadi tipe itu **tidak boleh** disunting di tempatnya.

Bentuk ini dibaca komponen klien; satu field hilang berarti grafik kosong tanpa galat.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Halaman Indeks, Indikator, dan Temuan memuat angka, daftar
kebutuhan, temuan, dan metrik yang sama, termasuk penanda "lakehouse belum tersedia" saat kueri
gagal.

## Rancangan

- `rust/crates/pemdi-contracts/src/dasbor.rs`: `DasborData` (bentuk kabel, camelCase) dengan
  `indikator: Vec<IndikatorDasbor>`, `kebutuhan: Vec<KebutuhanDasbor>`, `dok: Vec<DokDasbor>`,
  `metrik: Vec<MetrikDasbor>`, `opd: Vec<OpdDasbor>`; `nilai`/`penilai`/`penjelasan` sebagai
  `Option`/`String`, `nilai` tetap `Option<f64>`.
- `pemdi-app/src/dasbor_data.rs`: `muat_dasbor(&KB, &R, &L, &Llm) -> DasborData`, memakai
  `tokio::join!` untuk empat sumber dan menggabungkan seperti `Promise.all`.
- `llmConfigured()` menjadi `Llm::configured()` (tanpa I/O) dari `PORT-21`.
- Tipe `DasborData` di `src/app/dasbor.tsx` tidak disentuh: kontrak Rust adalah sumber kebenaran,
  dan penggantian tipe di komponen adalah pekerjaan `FE-1`/`FE-5`. Catat di PR bahwa untuk sementara
  ada dua definisi; jangan menambah field ke `dasbor.tsx` (dibekukan, hanya boleh mengecil).
- Oracle: modul `dasbor-data` menerima empat masukan sebagai argumen JSON (pipeline, opd, survei,
  perIndikator) dan mengembalikan `DasborData`. Generator: pipeline kosong, sebagian, lengkap;
  penilaian manual dan AI; dokumen tanpa `ai`; metrik dengan `indikator: null`; kebutuhan dengan
  `bukti` dari beberapa OPD (uji `opdBukti` unik); `survei.tersedia` `true`/`false`.
- Angka: `terbaca` memakai `karakter > 80`; `jawaban` memakai `perInd.get(i.no)?.terjawab ?? 0`;
  `berkas` = jumlah bukti, bukan jumlah OPD.

Daftar "what differs" yang berlaku, spesifik:
- **Angka JSON:** `nilai` f64 dan `null`; D-2.
- **`undefined` vs `null`:** `nilai`, `penilai` menjadi `null`; `penjelasan` menjadi `""`
  (bukan `null`) seperti `?? ""`.
- **Urutan:** `indikator` mengikuti `INDIKATOR` (1–20); `kebutuhan` mengikuti katalog; `metrik`
  mengikuti urutan dokumen lalu metrik.
- **Panjang teks:** tidak ada pemotongan.
- Regex/tanggal: tidak ada.

## Kriteria penerimaan

- [ ] `tests/parity/dasbor-data.cases` ≥ 60 kasus lulus.
- [ ] Kasus `opdBukti`: dua berkas dari OPD yang sama → satu entri unik, `berkas: 2`.
- [ ] Kasus `lakehouse: false` (survei kosong) tetap menghasilkan 20 indikator dengan
      `jawaban: 0`.
- [ ] JSON keluaran Rust untuk fixture "lengkap" sama dengan oracle, dibandingkan per field
      (termasuk `null` vs kunci hilang).
- [ ] Baris ledger `PORT-33` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Endpoint HTTP untuk halaman-halaman ini (`PORT-45`), pemakaian tipe kontrak di komponen
(`FE-1`/`FE-5`), dan narasi AI di dasbor (`PORT-34` untuk estimasi; narasi makro `PORT-44`).
