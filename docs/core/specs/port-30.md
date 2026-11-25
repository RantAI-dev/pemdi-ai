# `PORT-30` Use case tabel dan konteks skema NL2SQL

| | |
| --- | --- |
| Backlog | `PORT-30` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | `PORT-20` — konteks skema dirakit dari daftar unggahan dan `DESCRIBE TABLE` |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

AI Tubaba hanya tahu nama tabel dan kolom dari teks yang dikirim di setiap pertanyaan, dan teks itu
dirakit di empat modul:

- `src/lib/tables.ts` (194 baris): 12 `TableDef` (`:13-166`), `CONTEXT_MAX = 5900` (`:169`),
  `describe` (`:171-176`), `schemaContext` (`:179-193`) yang menambah tabel unggahan selama
  `out.length + line.length <= 5900` — `length` dihitung dalam satuan UTF-16.
- `src/lib/user-tables.ts` (26 baris): maksimal **6** tabel unggahan (`:16`), maksimal **25** kolom
  (`:19`), `DESCRIBE TABLE` (`:18`), tabel yang sudah dikenal dilewati (`:6`, `:10`), dan galat
  diabaikan (`:11-13`, `:21-23`).
- `src/lib/data.ts` (96 baris): 5 fungsi kueri dasbor; `num` mengubah `null`/`""` menjadi 0 tetapi
  sampah menjadi `NaN` (`:11`), `str` menjadi `""` (`:12`), hasil kueri di-`map` ke bentuk kabel.
- `src/lib/api.ts` (10 baris): `fail` memetakan `LakehouseError` ke `{error: pesan}` dengan status
  aslinya.

Urutan kolom adalah bagian dari prompt: `Object.entries(t.columns)` mengikuti urutan literal
(`:172`), dan model membaca kolom dalam urutan itu. `serde_json::Map` default mengurutkan kunci
alfabetis, jadi port naif akan mengubah prompt.

## Yang didapat pengguna

Tidak ada yang berubah di layar. AI Tubaba menerima konteks tabel yang sama kata per kata, sehingga
jawaban dan SQL-nya tetap sama.

## Rancangan

- `rust/crates/pemdi-contracts/src/tables.rs`: `TableDef { name, about, columns }` dengan `columns`
  sebagai **pasangan terurut** yang diserialkan menjadi objek JSON dengan urutan deklarasi. Untuk
  itu `serde_json` dibuat dengan fitur `preserve_order` (**fitur, bukan crate baru**; menambahkan
  `indexmap` sebagai dependensi transitive). Alternatif bila owner menolak: serialkan manual lewat
  `serde::ser::SerializeMap` dengan `Vec<(String, String)>` — hasil sama tanpa fitur.
- `pemdi-app/src/tables.rs`:
  - `schema_context(&[TableDef]) -> String` menyalin teks persis: empat baris pembuka (`:180-184`),
    baris kosong, lalu `- <tableRef>: <about>\n  Kolom: <kolom (keterangan); …>`.
  - `user_tables(&L) -> Vec<TableDef>` memakai `Lakehouse::list_uploads` + `query("DESCRIBE TABLE …")`.
  - `DataHalaman` untuk `src/lib/data.ts`: `get_opd`, `get_survei_total`, `get_survei_per_indikator`,
    `get_tema_per_opd`, `get_aplikasi`, `get_data_statistik`; SQL-nya string literal yang **sama
    byte** dan dijalankan paralel seperti `Promise.all` (`:52`, `:69`).
- `num`: `Option<f64>`, dengan `""`/`null` → `0.0`; nilai tak terbaca → `NaN` yang ditulis sebagai
  `null` di JSON (D-1). Tipe kabel karena itu `Option<f64>` dan tidak boleh `f64` (serde_json tidak
  bisa menulis NaN).
- `fail`: tidak diporting di sini; `pemdi-api/src/api_error.rs` sudah ada dan route memakainya.
- Oracle: modul `tables` dengan `schemaContext` (argumen: daftar `TableDef` tambahan) dan
  `describe`; generator: tanpa tambahan, 1 tambahan, 6 tambahan, tambahan yang membuat panjang
  melewati 5899/5900/5901, nama tabel panjang, keterangan kosong, kolom 25 dan 26.
- Oracle `data`: `num` dan `str` saja (kueri butuh lakehouse); SQL diperiksa dengan membandingkan
  string yang dikirim adapter pada rekaman (`PORT-3`).

Daftar "what differs" yang berlaku, spesifik:
- **Panjang teks:** `out.length` satuan UTF-16 vs `chars().count()`. Isi konteks berbahasa Indonesia
  (BMP), jadi sama; kasus dengan emoji diuji dan selisihnya dicatat bila ada.
- **Urutan:** urutan kolom = urutan deklarasi; jangan `HashMap`.
- **Angka JSON:** `NaN` → `null` (D-1); `num` pada `"1e3"`, `" 1 "`, `"abc"`, `true`.
- **`undefined`:** `metrics?.durationMs` tidak dipakai di sini.
- Regex: tidak ada. Tanggal: tidak ada.

## Kriteria penerimaan

- [ ] `tests/parity/tables.cases` ≥ 120 kasus lulus; `schemaContext([])` sama byte dengan keluaran
      TS hari ini (disimpan sebagai satu kasus besar).
- [ ] Kasus batas: tambahan yang membuat panjang 5899 diterima, 5901 dilewati, dan urutan tabel
      tambahan dipertahankan.
- [ ] Test `userTables`: 8 unggahan `ingested` → maksimal 6 `TableDef`; tabel yang ada di `TABLES`
      dilewati; `listUploads` gagal → `[]`; satu `DESCRIBE` gagal → tabel itu dilewati, sisanya ada.
- [ ] Test SQL: string kueri `get_opd`, `get_survei_total`, `get_aplikasi`, `get_data_statistik`
      sama byte dengan `src/lib/data.ts` (disalin sebagai konstanta di test).
- [ ] Baris ledger `PORT-30` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Route `/api/ask` (`PORT-41`), endpoint data halaman (`PORT-45`), dan tabel tambahan yang lebih dari
6 (`AI-*`).
