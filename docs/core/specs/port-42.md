# `PORT-42` Route unggah dan dokumen

| | |
| --- | --- |
| Backlog | `PORT-42` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `PORT-35` — antrean dokumen dan sinkron |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Empat route ini adalah satu-satunya cara pengguna memasukkan data, dan setiap cabangnya punya
status dan pesan sendiri:

- `src/app/api/upload/route.ts` (55 baris): `GET` mengurutkan unggahan menurun menurut `createdAt`
  lalu memotong 100 (`:12-20`); `POST` menolak tanpa berkas (`400 "Berkas tidak ditemukan."`),
  menolak > 50 MB (`413 "Ukuran berkas melebihi 50 MB."`), memisahkan `tabel` (simpan + preview +
  `suggestedTable`) dari dokumen (`intakeDokumen`), dan `lain` → `415` dengan daftar jenis didukung
  (`:36-53`).
- `src/app/api/upload/ingest/route.ts` (23 baris): `id` kosong → `400 "id unggahan kosong."`;
  `dryRun` → hanya `{preview}`; nama tabel yang dipakai `TABLES` → `409 "Nama tabel … dipakai oleh
  Pemdi-AI. Pilih nama lain."`; selain itu `{table, upload}`.
- `src/app/api/upload/status/route.ts` (13 baris): `?id=` wajib (`400 "id kosong."`), lalu `getUpload`.
- `src/app/api/dokumen/route.ts` (40 baris): `GET` → `{dokumen, antrean, estimasi, sinkron}` dengan
  urutan `diunggah` menurun lalu `opd` menaik (`:17`); `POST` → `503` bila LLM belum diatur
  (`:28-30`), `estimasi` dijalankan di latar lalu `{estimasi:true}`, selain itu
  `{diantrekan, antrean}` (`:31-39`).
- `src/app/api/dokumen/[id]/berkas/route.ts` (40 baris): cari di `DATA_DIR/files` lalu
  `SUMBER_DIR/dokumen`; `404 "Dokumen tidak ditemukan."` dan `404 "Berkas asli dokumen ini belum
  tersedia."`; penyajian lewat `sajikanBerkas` dengan dukungan Range.

## Yang didapat pengguna

Tidak ada yang berubah. Unggahan tabel masih menampilkan preview dan nama tabel usulan, unggahan
dokumen masih masuk antrean AI, dan tautan berkas asli masih membuka PDF di halaman dokumen.

## Rancangan

- `pemdi-api/src/routes/unggah.rs` (`/api/upload`, `/api/upload/ingest`, `/api/upload/status`) dan
  `routes/dokumen.rs` (`/api/dokumen`, `/api/dokumen/{id}/berkas`).
- Multipart: fitur `multipart` pada dependensi `axum` yang sudah ada (bukan crate baru); batas badan
  50 MiB diperiksa dari `Content-Length` **dan** saat membaca, supaya `413` datang sebelum seluruh
  badan masuk memori.
- Berkas: `tokio::fs::File` + `tokio_util::io::ReaderStream` (crate baru `tokio-util` — **butuh
  persetujuan owner**; alternatif: baca potongan dengan `AsyncReadExt` ke `Body::from_stream`, tanpa
  crate baru). `Range` dan header berasal dari `PORT-23`.
- Pesan dan status disalin persis dari daftar di atas; `suggestedTable` memakai `table_name` dari
  `PORT-24` pada nama tanpa ekstensi.
- `estimasi:true` menjalankan `perbarui_estimasi` di `tokio::spawn` lalu `sinkronkan`, seperti
  `void perbaruiEstimasi(...).then(sinkronkan)` (`dokumen/route.ts:34`).
- Uji: `Registry`/`Intake`/`Lakehouse` palsu; badan multipart dibuat di test.

Daftar "what differs" yang berlaku, spesifik:
- **Batas 50 MB:** `file.size > 50 * 1024 * 1024`; sama dengan 50 MiB, bukan 50 MB desimal.
- **Angka:** `Math.round(bytes/1024)` untuk `ukuran_kb` (`PORT-35`); `sort` string ISO untuk
  `createdAt`/`diunggah` (leksikografis = kronologis untuk ISO UTC).
- **Panjang teks:** nama berkas tidak dipotong; `table_name` memotong 100.
- **`undefined`:** `form.get("opd") ?? ""`; `body.mode ?? "replace"`.
- **Urutan:** `sort` stabil di JS; pakai `sort_by` stabil agar dokumen dengan `diunggah` sama tetap
  urut.
- Regex: `tableRef`/`table_name` dari `PORT-20`/`PORT-24`.

## Kriteria penerimaan

- [ ] Transkrip lima cabang `POST /api/upload`: tanpa berkas (`400`), 51 MiB (`413`), CSV (`kind:
      "tabel"` + `preview` + `suggestedTable`), PDF (`kind: "dokumen"` + `dok` + `antre: true`),
      `.exe` (`415`).
- [ ] `POST /api/upload/ingest` tanpa `id` (`400`), `dryRun` (`{preview}`), nama `pemdi_indikator`
      (`409`), nama sah (`{table, upload}`).
- [ ] `GET /api/dokumen` memuat empat kunci dan urutan yang sama; `POST` tanpa LLM → `503` dengan
      pesan TS.
- [ ] `GET /api/dokumen/<id>/berkas` tanpa Range → `200` + `Content-Length`; dengan
      `Range: bytes=0-99` → `206` + `Content-Range`; id asing → `404`.
- [ ] `GET /api/upload` dengan 120 unggahan → 100 baris, terbaru lebih dulu.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Antrean dan sinkron (`PORT-35`), OCR (`PORT-24`), UI unggah (`FE-5`), dan antivirus/pemeriksaan isi
berkas (belum diminta; `SEC-3` hanya redaksi data pribadi).
