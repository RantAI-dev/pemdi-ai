# `DATA-3` Muat tabel peternakan BPS ke `tbb_dalam_angka`

| | |
| --- | --- |
| Backlog | `DATA-3` di [BACKLOG.md](../BACKLOG.md) |
| Module | Data |
| Size | M |
| Blocked by | tidak ada untuk ekstraksi; memuat butuh lakehouse hidup |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Pertanyaan "jumlah kambing" di AI Tubaba tidak bisa dijawab (tes produksi 2026-11-13). Penyebabnya:
`tbb_dalam_angka` hanya dibangun dari satu workbook Diskominfo (`scripts/seed.ts:257`),
`Dalam_Angka_2024*.xlsx`, satu baris per sel. Tabel peternakan BPS tidak ada di workbook itu — ia ada
di PDF publikasi, dan PDF tidak pernah dibaca oleh pembangun mana pun.

Angkanya ada: `sumber/bps/bps-tubaba-dalam-angka-2026.pdf` memuat Bab 5 dengan:

| Tabel | Isi | Halaman cetak |
| --- | --- | --- |
| 5.3.1 | Populasi hewan ternak menurut jenis, 2024 dan 2025 (ekor) | 369 |
| 5.3.2 | Jumlah kelahiran sapi menurut jenis kelamin dan bulan, 2025 | 370 |
| 5.3.3 | Jumlah pemotongan ternak menurut jenis kelamin dan bulan, 2025 | 371 |
| 5.3.4 | Jumlah pengeluaran ternak sapi dan kerbau menurut jenis kelamin dan bulan, 2025 | 374 |

Contoh Tabel 5.3.1: Kambing Potong 164.140 ekor (2024) dan 170.360 (2025); Sapi Potong 34.419 /
34.568; Domba 2.538 / 2.715; Ayam Buras 705.525 / 708.951. Sel `–` atau `...` tidak dilaporkan.

## Yang didapat pengguna

"Berapa jumlah kambing di Kabupaten Tulang Bawang Barat tahun 2025?" dijawab 170.360 ekor, dengan
SQL yang menyebut nomor tabelnya, sehingga bisa diperiksa ke halaman 369 publikasi BPS.

## Rancangan

### Ekstraksi tangan yang bisa diperiksa

Berkas baru `sumber/bps/dalam-angka-ternak.json` — bentuk yang sudah dipakai untuk
`sumber/bps/nilai.json` (92 baris ekstraksi tangan) dan `src/data/makro/rpjmd.json`. Satu objek per
sel:

```json
{
  "tahun_publikasi": 2026,
  "no_tabel": "5.3.1",
  "judul": "Populasi Hewan Ternak Menurut Jenis Ternak di Kabupaten Tulang Bawang Barat (ekor), 2024 dan 2025",
  "baris": "Kambing Potong",
  "kolom": "2025",
  "nilai": "170360",
  "halaman": 369,
  "kutipan": "Kambing Potong/Beef Goat 164.140 170.360"
}
```

Aturan ekstraksi:

- `nilai` dalam **bentuk mesin**: `"170360"`, `"4.53"` — tanpa pemisah ribuan, titik sebagai
  desimal. Ini sama dengan hasil workbook hari ini (`String` dari sel angka, `scripts/seed.ts:286`)
  dan yang membuat `toInt32OrNull(nilai)` bekerja di SQL; bentuk tercetak (`170.360`) hanya di
  `kutipan`.
- `baris` hanya bagian Indonesia (`"Kambing Potong"`, bukan `"Kambing Potong/Beef Goat"`); `kolom` =
  judul kolom apa adanya (`"2025"`, `"Januari"`, `"Jantan"`); sel `–` atau `...` tidak dimuat,
  jangan menulis `"0"`.
- Setiap objek wajib punya `halaman` dan `kutipan`; keduanya tidak masuk tabel, tetapi menjadi jejak
  pemeriksaan di git.
- Cakupan minimum: seluruh baris Tabel 5.3.1 (kedua tahun), lalu 5.3.2, 5.3.3, 5.3.4. Publikasi
  2024/2025 boleh ditambahkan dengan `tahun_publikasi` masing-masing, tetapi bukan syarat PR ini.

### Pembangun

`scripts/seed.ts`, di dalam `buildDalamAngka()` setelah baris dari workbook:

```ts
const ternak = JSON.parse(await readFile(path.join(ROOT, "sumber", "bps", "dalam-angka-ternak.json"), "utf8"));
for (const r of ternak) {
  out.push({ tahun_publikasi: r.tahun_publikasi, no_tabel: r.no_tabel, judul: r.judul,
             baris: r.baris, kolom: r.kolom, nilai: r.nilai });
}
```

`table("tbb_dalam_angka", out)` sudah mengganti seluruh isi tabel saat dimuat
(`src/lib/lakehouse.ts:199`, mode `replace`), jadi baris workbook dan baris PDF hidup bersama. Jangan
mengubah jalur workbook. `src/lib/tables.ts:155-165` diperbarui: `about` menyebut tabel peternakan
2026 (BPS) dan kolom `tahun_publikasi` menjadi `"2024 atau 2026"`.

### Test

Skrip ini tidak punya test otomatis (tidak ada test untuk `scripts/`); buktinya keluaran:

- `bun run scripts/seed.ts --build` mencetak `tbb_dalam_angka: N baris`, N = baris workbook + JSON.
- `grep -c '5.3.1' data/seed/tbb_dalam_angka.csv` ≥ 30 (15 jenis × 2 tahun), dan
  `grep 'Kambing Potong' data/seed/tbb_dalam_angka.csv` memuat `170360` dan `164140`.

Bila `scripts/seed.ts` melewati 400 baris, pecahkan pembacaan JSON ke `scripts/dalam-angka-ternak.ts`
(fungsi murni `bacaTernak(teks: string)`) — batas keras tetap 600.

## Kriteria penerimaan

- [ ] `sumber/bps/dalam-angka-ternak.json` ada, setiap objek punya `halaman` dan `kutipan`, dan
      setiap `nilai` hanya berisi angka (`grep -E '"nilai": "[^0-9.]' ` → 0).
- [ ] `bun run scripts/seed.ts --build` lulus; keluaran `tbb_dalam_angka` bertambah sesuai jumlah
      objek JSON; `grep` pada CSV seperti di atas menghasilkan angka yang benar.
- [ ] Muat nyata ke lakehouse: `bun run scripts/seed.ts --load`, lalu
      `SELECT nilai FROM <db>.\`bronze.tbb_dalam_angka\` WHERE no_tabel = '5.3.1' AND baris = 'Kambing Potong' AND kolom = '2025'`
      → `170360`.
- [ ] Transkrip AI Tubaba di `/tanya`: "Berapa jumlah kambing di Kabupaten Tulang Bawang Barat
      tahun 2025?" → 170.360 ekor, dan SQL yang ditampilkan memakai `no_tabel = '5.3.1'`. Satu
      pertanyaan pembanding: "populasi sapi potong 2025" → 34.568.
- [ ] Tangkapan layar jawaban (tabel + SQL) di badan PR.
- [ ] `src/lib/tables.ts` diperbarui; `bun test src/lib/tables.test.ts` (dari `DATA-2`) tetap lulus
      dengan `schemaContext().length <= 5900`; `bun run typecheck` lulus dan `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- Membaca PDF otomatis (`pdftotext`/OCR) di pipeline: tata letak tabel BPS berubah antar publikasi,
  ekstraksi tangan lebih murah dan bisa diperiksa; kalau kelak perlu, itu task baru.
- Publikasi 2022/2023 (workbook OCR dengan angka rusak, `scripts/seed.ts:253-256`) dan tabel
  pertanian lain di Bab 5: bukan cakupan PR ini.
