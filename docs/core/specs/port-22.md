# `PORT-22` Adapter registry (`data/*.json`)

| | |
| --- | --- |
| Backlog | `PORT-22` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Registry adalah satu-satunya data tulis milik aplikasi, dan formatnya harus tetap sama karena
volume `pemdi-ai_app_data` sudah berisi data produksi:

- `src/lib/store.ts` (84 baris): `data/dokumen.json` ditulis `JSON.stringify(cache, null, 1)`
  (`:67`) — indentasi **satu spasi** — lewat `FILE.tmp` lalu `rename` (`:67-68`); penulisan
  diserialkan dengan rantai promise `writing` (`:49`, `:62-71`); `readDok` menyimpan cache di memori
  dan mengembalikan `[]` bila berkas tidak ada/rusak (`:51-59`); `readTeks` mengembalikan `""` bila
  tidak ada (`:73-79`).
- `src/lib/penilaian.ts` (42 baris): `data/penilaian.json` dengan indentasi **dua spasi** (`:35`);
  `savePenilaian` membuang baris lama dengan `indikator_no` sama, menambah bila `nilai != null`,
  mengurutkan naik (`:31-33`), dan mengisi `diperbarui` dari `new Date().toISOString()` (`:32`).
- Pemakai: `src/app/api/dokumen/route.ts:6`, `src/app/api/penilaian/route.ts:6`,
  `src/lib/ringkasan.ts:5`, `src/lib/kebutuhan.ts:12`, `src/app/opd/page.tsx:2`.

Dua hal mudah rusak saat diporting: indentasi (1 vs 2 spasi) dan **kunci asing**. Kode lama mengurai
objek lalu menulisnya kembali, jadi kunci yang tidak dikenal tetap ada. `serde` biasa akan
membuangnya, dan berkas produksi berubah tanpa sebab.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Dokumen, teks hasil ekstraksi, dan nilai indikator yang sudah ada
tetap terbaca setelah cutover, dan berkas yang ditulis backend baru dapat dibaca versi lama bila
rollback.

## Rancangan

- `rust/crates/pemdi-ports/src/registry.rs`: tipe data (`Dok`, `HasilAi`, `Temuan`, `Metrik`,
  `Penilaian`, enum `StatusAi`, `Sumber`, `Metode`) dan trait:
  `read_dok()`, `update_dok(f: impl FnOnce(&mut Vec<Dok>) + Send)`, `read_teks(id)`,
  `write_teks(id, &str)`, `read_penilaian()`, `save_penilaian(input)`, `data_dir()`.
  Tipe tinggal di `pemdi-ports` (bukan domain) karena ia bentuk data dunia luar, bukan aturan; ADR
  0002 hanya melarang arah dependensi ke atas.
- `rust/crates/pemdi-adapters/src/store.rs`: `tokio::fs` (`tokio` sudah ada; tambah fitur `fs`),
  `serde` + `serde_json` (sudah ada di workspace).
  - Indentasi: `serde_json::Serializer::with_formatter(PrettyFormatter::with_indent(b" "))` untuk
    dokumen dan `b"  "` untuk penilaian. Tanpa ia, formatnya dua spasi dan berkas tidak sama byte.
  - Urutan kunci = urutan field struct, mengikuti urutan literal TS.
  - Kunci asing: `#[serde(flatten)] pub extra: serde_json::Map<String, Value>` pada `Dok`,
    `HasilAi`, `Temuan`, `Metrik`, `Penilaian`; ditulis kembali apa adanya.
  - Angka: `ukuran_kb: u64`, `karakter: u64` (bukan f64), supaya tertulis `12` dan bukan `12.0`
    (aturan D-2). `nilai` penilaian tetap f64.
  - `Option` + `skip_serializing_if = "Option::is_none"` untuk `ai`, `error`, `kode` kosong? —
    **tidak**: TS menulis `"kode": ""`, jadi `kode` tetap `String`. Yang di-skip hanya `ai` dan
    `error`, karena TS membuang `undefined`.
  - Serialisasi tulis: satu `tokio::sync::Mutex` memegang cache dan rantai tulis; `update_dok`
    mengubah cache di dalam kunci, menulis `.tmp`, lalu `rename`.
  - `save_penilaian` hanya menyimpan; pemicu sinkronisasi (`src/lib/penilaian.ts:37`) pindah ke
    `pemdi-app` (`PORT-35`), bukan ke adapter.
- Oracle: rekaman `tests/rekaman/registry/*.json` dengan urutan operasi dan **isi berkas hasil**
  sebagai string, bukan objek, supaya indentasi ikut dibandingkan.
- Daftar "what differs" yang berlaku, spesifik:
  - **Angka JSON:** D-2; integer vs f64 di atas.
  - **Urutan kunci:** urutan deklarasi struct; `serde_json` `Map` untuk `extra` mengurutkan kunci
    (BTreeMap) — untuk kunci asing, urutan tidak dijamin TS, jadi dicatat di differences.md.
  - **`undefined` vs `null`:** `ai`/`error` hilang, bukan `null`.
  - **Tanggal:** `diunggah`, `pada`, `diperbarui` adalah string ISO apa adanya; jangan diurai lalu
    diformat ulang (milis harus tetap 3 digit).
  - **Panjang teks:** `readTeks` mengembalikan seluruh isi; tidak ada potong.

## Kriteria penerimaan

- [ ] Test byte: menulis `Dok` baru menghasilkan berkas yang **sama byte** dengan
      `JSON.stringify(..., null, 1)`: indentasi 1 spasi, tanpa baris baru di ujung, `[]` untuk
      kosong.
- [ ] Test byte: `savePenilaian` menghasilkan indentasi 2 spasi, urut `indikator_no`, `nilai: null`
      menghapus baris, `diperbarui` berformat `2026-11-25T08:30:00.000Z`.
- [ ] Test kunci asing: berkas dengan field `"catatan_lama": "x"` ditulis kembali tanpa kehilangan
      field itu.
- [ ] Test ketahanan: berkas rusak/kosong → `read_dok()` = `[]`, `read_teks(id)` = `""`.
- [ ] Test konkurensi: 20 `update_dok` bersamaan menghasilkan 20 baris, tidak ada yang hilang.
- [ ] Berkas contoh dari produksi (disalin tanpa data pribadi, disimpan di
      `tests/fixtures/registry/`) dibaca lalu ditulis ulang: `diff` kosong.
- [ ] Baris ledger `PORT-22` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Menyalin registry ke lakehouse (`sinkron`, `PORT-35`), `users.json` (`PORT-25`), dan memindahkan
`data/files`/`data/teks` ke object storage (`OPS-2`/`ARSITEKTUR`).
