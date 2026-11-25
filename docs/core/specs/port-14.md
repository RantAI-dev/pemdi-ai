# `PORT-14` `spm-hitung`

| | |
| --- | --- |
| Backlog | `PORT-14` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | tidak ada — tipe `NilaiSpm` dibuat di `pemdi-contracts` pada task ini |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/spm-hitung.ts` (79 baris) adalah satu-satunya sumber angka Capaian SPM:

- `dariBaris` (`:18-28`): `sasaran`/`terlayani` diambil dari baris pertama berjenis itu; `capaian`
  adalah rata-rata semua baris `capaian` yang dilaporkan, dan baru bila tidak ada, dihitung
  `terlayani / sasaran x 100` dengan syarat `sasaran > 0` dan `terlayani != null`.
- `capaianLayanan` (`:34-38`): saring `layanan` + `tahun`, utamakan `wilayah === "tubaba"`, jatuh ke
  semua wilayah bila kosong.
- `capaianBidang` (`:44-50`): indeks bidang yang dilaporkan menang; jika tidak, rata-rata capaian
  jenis layanan, dengan daftar layanan dari `[...new Set(...)]` (urutan kemunculan pertama).
- `kategoriSpm` (`:62-66`) dan pita teksnya (`:68`).
- `seriLayanan` (`:73-79`): tahun unik terurut naik, `capaian ?? null` tetapi `sasaran`/`terlayani`
  tetap opsional.

Bentuk balikannya memakai `?:` (`CapaianLayanan` di `:11-15`), jadi `sasaran`/`terlayani` yang tidak
ada **hilang dari JSON**, sementara `capaian` selalu ada sebagai `null` di `seriLayanan`. Kalau port
menulis `null` untuk keduanya, respons endpoint berubah dan UI membaca "0".

## Yang didapat pengguna

Tidak ada yang berubah di layar. Kartu, grafik, dan tabel Capaian SPM menunjukkan angka dan
kategori yang sama untuk setiap jenis layanan dan tahun.

## Rancangan

- `rust/crates/pemdi-domain/src/spm.rs`: `NilaiSpm` polos (field `src/lib/spm.ts:34-49`, `layanan`
  dan `bidang` `Option<String>`, `halaman`/`catatan` `Option`), `Wilayah` (`Tubaba`, `Lampung`),
  `JenisNilai` (`Sasaran`, `Terlayani`, `Capaian`, `Indeks`), `CapaianLayanan { sasaran:
  Option<f64>, terlayani: Option<f64>, capaian: Option<f64> }`, `KategoriSpm`, `TitikSeriSpm`.
  Fungsi `capaian_layanan`, `capaian_bidang`, `kategori_spm`, `seri_layanan`.
- `rust/crates/pemdi-contracts/src/spm.rs`: bentuk kabel dengan `skip_serializing_if` untuk
  `sasaran`/`terlayani`, dan **tanpa** skip untuk `capaian` di `TitikSeriSpm` (harus `null`).
  Konversi di `pemdi-app`.
- Oracle: modul `spm-hitung` dengan empat fungsi; generator membangkitkan larik `nilai` dari
  kombinasi: hanya `sasaran`, hanya `terlayani`, keduanya, `sasaran: 0`, `sasaran` negatif, nol baris
  `capaian`, satu baris `capaian`, tiga baris `capaian` (rata-rata), baris `indeks` bidang, wilayah
  `tubaba` + `lampung` bercampur, tahun ganda, dan larik kosong.
- Tepi kategori: 89,9999 / 90 / 99,9999 / 100 / 100,0001.
- Daftar "what differs" yang berlaku:
  - **`undefined` vs `null`:** aturan di atas; ini bagian terpenting modul ini.
  - **Urutan:** `new Set` mempertahankan kemunculan pertama; pakai `Vec` + `contains`, jangan
    `HashSet`, agar urutan `capaianBidang` sama.
  - **Angka:** tidak ada pembulatan; penjumlahan dilakukan berurutan seperti `reduce`, sehingga
    hasil f64 identik dengan JS untuk masukan yang sama. Aturan D-2 berlaku saat dibaca/ditulis.
  - **Panjang teks/regex/tanggal:** tidak ada.

## Kriteria penerimaan

- [ ] `tests/parity/spm-hitung.cases` ≥ 300 kasus, termasuk 25 kasus `sasaran` 0/negatif dan 20
      kasus `capaian` ganda.
- [ ] `cargo test -p pemdi-domain --test parity_spm` lulus, termasuk kasus yang memeriksa kunci
      `sasaran`/`terlayani` **tidak ada** saat `None` dan `capaian: null` di `seriLayanan`.
- [ ] `bun scripts/oracle/unseen.sh spm-hitung 777` lulus.
- [ ] Baris ledger `PORT-14` **parity green**; perbedaan (bila ada) di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Membaca `src/data/spm/nilai.json` dan menyusun daftar layanan dari kerangka (`PORT-23`), komponen
tampilan (`src/lib/spm-tampil.ts`, tetap TypeScript), dan endpoint halaman SPM (`PORT-45`).
