# `PORT-35` Use case antrean dokumen, sinkron lakehouse

| | |
| --- | --- |
| Backlog | `PORT-35` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | L (lebih dari 2 minggu) |
| Blocked by | `PORT-24` (intake) dan `PORT-30` (tabel) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Tiga modul ini adalah jalur tulis: unggah → ekstraksi → AI → registry → lakehouse.

- `src/lib/proses.ts` (132 baris): prompt `SYSTEM` panjang (`:17-37`), `bersihkan` yang memaksa
  bentuk keluaran model (`:45-61`; batas 6 temuan, 8 metrik, `tahun` harus 4 digit, `tingkat`
  dibulatkan), `prosesDokumen` (`:63-80`; teks ≤ 80 → gagal, teks dipotong 14.000),
  antrean di memori (`:84-90`), `PARALEL = 3` (`:90`), `statusAntrean` (`:92-94`), `jalan`
  (`:105-120`) yang setelah selesai memanggil `perbaruiEstimasi()` lalu `sinkronkan()`, dan
  `antrekan` (`:123-132`) dengan saringan `karakter > 80`, `ulang`, dan "sudah di antrean".
- `src/lib/sinkron.ts` (117 baris): `STATUS_AI` (`:19`), `barisDokumen` (`:21-40`), `semuaTabel`
  (`:42-77`; status `_` → spasi dengan `replace("_", " ")` yang hanya mengganti kemunculan
  pertama), `run` (`:86-102`; tabel kosong dilewati, kolom mengikuti `TABLES`, satu tabel sekali
  muat), `statusSinkron` (`:82-84`), `sinkronkan` dengan penanda `pending` (`:104-111`).
- `src/lib/dokumen.ts` (38 baris): id = `sha1(bytes).slice(0, 12)` (`:15`), berkas asli disimpan di
  `data/files/<id>.<ext>` (`:17`), teks di `data/teks/<id>.txt` (`:19`), entri dengan id sama
  diganti (`:34`), lalu `antrekan([id])` (`:35`).

Antrean hari ini hilang saat proses restart (komentar `proses.ts:7-9`). Backlog meminta antrean
**persisten**, jadi ini perbedaan yang disengaja dan harus tercatat.

## Yang didapat pengguna

Tidak ada yang berubah di layar, kecuali satu hal yang membaik: dokumen yang sedang menunggu tidak
hilang saat kontainer di-restart. Halaman Dokumen tetap menampilkan antrean, estimasi, dan status
sinkron yang sama.

## Rancangan

- `pemdi-app/src/proses.rs`: prompt + `bersihkan` (murni, diuji penuh), `proses_dokumen`,
  `antrekan`, `status_antrean`, dan pekerja `tokio` dengan `Semaphore(3)`.
  - Antrean persisten: `data/antrean.json` lewat `Registry` (bukan adapter baru), ditulis dengan
    pola `.tmp` + `rename`; isinya `{ menunggu: [id], selesai: n, total: n }`. Saat start, isi
    dimuat kembali. **Perbedaan disengaja** → differences.md (owner menyetujui lewat backlog).
  - `selesai`/`total` direset di akhir batch seperti TS (`:112-115`).
- `pemdi-app/src/sinkron.rs`: `semua_tabel`, `run` (satu tabel sekali, lewati kosong), state
  `idle|running|failed` + `pending`. CSV memakai `to_csv` dari `PORT-24`; kolom dari `TABLES`
  (`PORT-30`) dalam urutan deklarasi.
- `pemdi-app/src/dokumen.rs`: `intake_dokumen(&R, &I, file) -> Dok`; `sha1` butuh crate (`sha1` atau
  `ring`) — **dependensi baru, butuh persetujuan owner**; alternatif tanpa crate: `sha2` saja tidak
  cukup karena id lama adalah SHA-1 12 heksadesimal dan harus sama agar dokumen lama tidak
  terduplikasi.
- Kontrak: `AntreanStatus`, `SinkronStatus`, `Dok` (sudah di `PORT-22`).
- Oracle: modul `proses` dengan `bersihkan` (murni) dan `barisDokumen`/`semuaTabel` yang menerima
  fixture registry. Generator: keluaran model rusak (temuan tanpa indikator, `tingkat` 0/6/2,7,
  `tahun` "26"/"2026", 10 temuan, 12 metrik, `kebutuhan` id asing), dokumen tanpa teks, dan
  `status_ai` keempat nilai.
- Urutan: `temuan`/`metrik`/`kebutuhan` mengikuti keluaran model setelah disaring; dokumen mengikuti
  urutan registry.

Daftar "what differs" yang berlaku, spesifik:
- **Antrean persisten** (di atas) — satu-satunya perubahan perilaku, dan disengaja.
- **Pembulatan:** `Math.round(Number(t.tingkat))` di `bersihkan`; `Math.round(bytes/1024)` di
  `dokumen.ts:27`.
- **Panjang teks:** semua `slice` UTF-16; `teks.slice(0, 14_000)`.
- **Angka JSON:** `ukuran_kb`/`karakter` integer; D-2.
- **`undefined` vs `null`:** `ai.error` hanya saat gagal; `metrik.indikator` `null` → kolom kosong
  (`?? ""` di `sinkron.ts:60`).
- **Regex:** `^\d{4}$` untuk `tahun`; `replace("_", " ")` hanya satu kemunculan — pakai
  `replacen(_, _, 1)`.
- **Tanggal:** `pada` ISO dengan milis.

## Kriteria penerimaan

- [ ] `tests/parity/proses.cases` ≥ 200 kasus untuk `bersihkan` dan `barisDokumen`.
- [ ] Test alur dengan port palsu: unggah → ekstraksi → `Llm` → registry → `sinkronkan`; urutan
      pemanggilan sama dengan TS, dan `perbaruiEstimasi` dipanggil sebelum `sinkronkan`.
- [ ] Test paralel: 7 dokumen dengan `Semaphore(3)` → maksimal 3 `proses_dokumen` berjalan
      bersamaan (dihitung di fake).
- [ ] Test restart: antrean 3 dokumen, hentikan pekerja, mulai ulang → ketiganya diproses, tidak ada
      duplikat.
- [ ] Test `sinkron`: 6 tabel, satu kosong → tabel kosong tidak dimuat; CSV sama byte dengan
      `toCsv` TS untuk baris `pemdi_dokumen` (≥ 100 baris).
- [ ] `status` berturut-turut `idle` → `running` → `idle` dengan `at` terisi; kegagalan → `failed`
      dengan `error`.
- [ ] Baris ledger `PORT-35` **parity green**; antrean persisten tercatat di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Route unggah dan dokumen (`PORT-42`), OCR (`PORT-24`/`DEC-5`), pemrosesan ulang seluruh korpus,
dan antrean terdistribusi (satu proses cukup sampai ada kebutuhan nyata).
