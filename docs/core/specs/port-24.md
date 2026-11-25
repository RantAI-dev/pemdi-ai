# `PORT-24` Adapter intake: ekstraksi teks dan OCR

| | |
| --- | --- |
| Backlog | `PORT-24` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `DEC-5` — pilihan OCR produksi (Mistral OCR atau lokal) masih **Open** |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/intake.ts` (177 baris) mengubah berkas apa pun menjadi teks atau tabel. Bagian murninya
kecil tetapi dipakai di jalur tulis: `extOf` (`:34`), `kindOf` (`:38`), `tableName` (`:43-53`),
`toCsv` (`:56-62`), `tidy` (`:75-82`), `extractText` (`:119-142`), `ocrText` (`:152-166`),
`readFileText` (`:169-177`). Perilaku yang menentukan:

- `tableName` menormalkan `NFKD`, membuang tanda gabung `[\u0300-\u036F]`, mengganti non-alfanumerik
  dengan `_`, memotong 100, membuang `_` di ujung, dan menambah `t_` bila tidak diawali huruf
  (`:43-53`). Nama tabel lakehouse yang salah = unggahan ditolak.
- `toCsv` mengganti baris baru di dalam sel dengan spasi dan mengutip sel yang memuat `"` atau `,`
  (`:56-62`). Ini yang dikirim ke `loadTable` (`src/lib/sinkron.ts:95`).
- `readFileText` memakai batas **80 karakter**: teks > 80 dianggap terbaca, OCR hanya dicoba bila
  ≤ 80, dan hasil OCR juga harus > 80 (`:171-174`).
- Ekstraksi memakai alat luar: `pdftotext` untuk PDF (`:84-90`), `mammoth` untuk DOCX (`:92-95`),
  `unzip` + regex XML untuk PPTX (`:97-107`), SheetJS untuk XLSX (`:109-112`), dan
  `uv run --with rapidocr-onnxruntime` + `scripts/ocr.py` untuk OCR (`:144-166`).
- Hasilnya menentukan `karakter` dan `metode` di `Dok` (`src/lib/dokumen.ts:30-31`), yang dipakai
  di mana-mana (`karakter > 80`, `metode === "ocr"`).

## Yang didapat pengguna

Tidak ada yang berubah di layar. Berkas yang diunggah tetap terbaca, terhitung karakternya, dan
masuk antrean AI dengan cara yang sama. Setelah cutover, image backend tidak lagi butuh Node,
`mammoth`, dan `uv` untuk langkah ini.

## Rancangan

Bagian murni dikerjakan lebih dulu dan tidak menunggu `DEC-5`; bagian OCR menunggu keputusan.

1. **Murni** → `rust/crates/pemdi-domain/src/intake.rs`: `ext_of`, `kind_of`, `table_name`,
   `to_csv`, `tidy`, dengan oracle `intake` di `scripts/oracle/modules.ts` dan generator di
   `cases.ts` (≥ 400 kasus: nama berkas aneh, `NFKD`, emoji, 100/101 karakter, sel berisi `"`/`,`/
   `\r\n`, nilai `null`, angka, boolean).
   - `table_name` butuh dekomposisi Unicode: **dependensi baru `unicode-normalization` — butuh
     persetujuan owner.** Alternatif tanpa dependensi: tabel dekomposisi Latin-1 terbatas; hanya
     dipakai bila owner menolak, dan hasilnya harus sama untuk 68 nama berkas contoh.
   - `to_csv`: `String(v)` JavaScript untuk angka (`1e21` → `"1e+21"`) berbeda dari Rust; pakai
     helper `nilai_ke_teks` dan uji semua nilai yang mungkin (registry hanya memuat angka, teks,
     `null`).
2. **Ekstraksi** → `rust/crates/pemdi-adapters/src/intake.rs`, trait `Intake` di
   `pemdi-ports` (`extract_text(nama, bytes)`, `read_file_text(nama, bytes, ocr)`):
   - PDF: tetap memanggil `pdftotext -q -enc UTF-8 <berkas> -` (sudah ada di image
     `deploy/Dockerfile`), tanpa crate baru.
   - DOCX/PPTX/XLSX: `zip` + `quick-xml` + `calamine` — **tiga dependensi baru, butuh persetujuan
     owner.** `mammoth` tidak punya padanan Rust, jadi teks DOCX **akan berbeda** (urutan paragraf,
     penanganan tabel); selisih diukur pada berkas fixture dan dicatat di differences.md sebelum
     dipakai.
   - OCR: menunggu `DEC-5`. Bila lokal: memanggil skrip yang sama lewat proses terpisah, sehingga
     `scripts/ocr.py` tetap ada. Bila Mistral: adapter HTTP baru.
3. **Test**: `tests/fixtures/intake/` berisi enam berkas sintetis (PDF, DOCX, PPTX, XLSX, TXT,
   PNG) tanpa data pribadi, dan rekaman keluaran TS (`PORT-3`) sebagai harapan.

Daftar "what differs" yang berlaku, spesifik:
- **Panjang teks:** `tidy` memakai regex `[ \t]+`, `? \n ?`, `\n{3,}`; JS `.`/`^`/`$` tanpa flag `m`
  di sini tidak dipakai. Batas 80 dihitung `text.length` (UTF-16) — pakai `chars().count()` dan
  catat selisih untuk non-BMP.
- **Regex:** `[\u0300-\u036F]`, `[^a-z0-9]+`, `[",]` → `regex`.
- **Pembulatan:** tidak ada, kecuali `Math.round(byteLength/1024)` di `src/lib/dokumen.ts:27` (milik
  `PORT-35`).
- **Angka JSON:** tidak ada; `to_csv` mengubah angka menjadi teks.

## Kriteria penerimaan

- [ ] `tests/parity/intake.cases` ≥ 400 kasus lulus (bagian murni, tidak menunggu `DEC-5`).
- [ ] `table_name("Laporan Kinerja 2026.xlsx")` = `laporan_kinerja_2026`, sama dengan oracle;
      contoh non-ASCII (`"Laporan—Dinas"`) juga sama.
- [ ] `to_csv` menghasilkan string yang sama byte untuk fixture `pemdi_dokumen` (≥ 200 baris).
- [ ] Enam fixture: `extract_text` Rust dibandingkan dengan rekaman TS; setiap selisih tercatat di
      [differences.md](../../port/differences.md) sebelum test dijadikan penjaga.
- [ ] `read_file_text` pada teks 80/81 karakter memilih jalur yang sama dengan TS (teks vs OCR).
- [ ] `DEC-5` **Decided** sebelum bagian OCR dikerjakan; bila belum, handoff menyebut STATUS
      partial.
- [ ] Baris ledger `PORT-24` **parity green**; `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Menyimpan berkas dan mendaftarkannya ke registry (`src/lib/dokumen.ts`, `PORT-35`), route unggah
(`PORT-42`), dan perbaikan redaksi data pribadi (`SEC-3`).
