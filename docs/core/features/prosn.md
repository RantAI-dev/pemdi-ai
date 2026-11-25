# Dukungan PROSN

Modul dukungan Prioritas Nasional / Program Strategis Nasional (`/dashboard-pemdi/prosn`). Modulnya
ada di kode, tetapi **disembunyikan** dari navigasi dan tidak dapat dibuka.

| | |
| --- | --- |
| Modul | Kinerja Daerah |
| Backlog | `FT-5` di [BACKLOG.md](../BACKLOG.md) |
| Jenis | Feature |
| Spec | Tidak ada spec; halaman ini yang menjadi acuan |
| Status | Building — disembunyikan (`TAMPIL_PROSN = false`), skornya menunggu review |
| Prioritas | P2 |
| Pemilik | Pemilik modul. Tidak dinamai di repo. |
| Penerima | Yang menjalankan checklist. Bukan pembuat fitur. Tidak dinamai di repo. |
| Rencana | Tidak ada |
| Mulai | Belum diverifikasi |
| Terkirim | Belum ditampilkan di produksi |
| Bukti | Kode di `src/app/dashboard-pemdi/`, `src/lib/prosn*.ts`; belum ada PR |

## Masalah

Skor dukungan PROSN disusun AI dari dokumen yang tersedia. Sebagian indikator belum punya bukti,
sehingga skornya baru batas bawah, dan kriteria penilaiannya belum direviu manusia. Menampilkannya
sekarang berisiko dibaca sebagai penilaian resmi yang rendah.

## Yang bisa dilakukan pengguna

Tidak ada hari ini: menu tidak tampil dan rute mengembalikan halaman tidak ditemukan. Bila sakelar
dinyalakan, yang tersedia adalah:

1. Melihat skor dukungan per kelompok program, dengan skor terbukti, skor yang tidak diperoleh,
   dan poin yang belum ada buktinya.
2. Membaca capaian tiap kelompok terhadap bobotnya, dan kategorinya.
3. Menelusuri kelompok, program, dan indikator sampai ke kriteria a/b/c/d beserta buktinya.
4. Melihat dokumen, halaman, dan kutipan di balik setiap penilaian indikator.
5. Melihat daftar dokumen yang perlu diunggah agar poin yang belum terbukti dapat dinilai.
6. Membaca tab Laporan dan mengunduh Excel penilaian.

## Tidak termasuk

- Menampilkan skor sebagai hasil resmi. Skor adalah batas bawah penilaian AI.
- Menilai ulang dari layar.
- Sinkronisasi ke lakehouse, sehingga AI Tubaba tidak dapat menjawab dari tabel PROSN.
- Keputusan untuk menampilkannya. Itu ada di `DEC-6` dan menunggu owner.

## Bertanya ke AI Tubaba

Tidak. Tabel PROSN tidak disinkronkan ke lakehouse, dan modulnya tidak tampil.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Sakelar | `src/lib/fitur.ts` (`TAMPIL_PROSN`) |
| Navigasi | `src/components/shell.tsx` (item Dukungan PROSN hanya bila sakelar hidup) |
| Halaman | `src/app/dashboard-pemdi/[slug]/page.tsx` dan `[...jalur]/page.tsx`; `notFound()` saat sakelar mati |
| Tampilan | `src/components/prosn-halaman.tsx`, `src/components/prosn-detail.tsx`, `src/components/viz-prosn.tsx` |
| Data | `src/lib/prosn.ts` (membaca `src/data/prosn/penilaian.json` dan `sumber.json`) |
| Hitungan | `src/lib/prosn-hitung.ts` (murni; belum diporting ke Rust) |
| Kerangka | `src/data/kerangka/prosn.ts` (beku, hanya boleh menyusut) |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Modul disembunyikan sampai kriteria dan skornya direviu. Alasan tertulis di `src/lib/fitur.ts`; `docs/REVIEW-PROPOSAL.md` P0-8 mencatat hal yang sama. | Disembunyikan | Berlaku (tertulis di kode) |
| 2 | Skor dihitung dari nilai kriteria yang dipilih; indikator tanpa bukti tetap masuk penyebut dan dihitung 0, sehingga skor adalah batas bawah. | Batas bawah | Berlaku (tertulis di kode) |
| 3 | Nilai kriteria yang lebih besar dari bobot indikator pada satu indikator sumber dibiarkan apa adanya, agar inkonsistensi sumber tetap terlihat. | Tidak dipangkas | Berlaku (tertulis di kode) |
| 4 | Kategori capaian memakai pita Permendagri 86/2017 karena tabel sumber tidak mencantumkan pita. | Pita 91/76/66/51 | Berlaku (tertulis di kode) |
| 5 | Kapan modul ditampilkan. | Menunggu review | Belum (`DEC-6`) |

## Batasan yang disampaikan ke pengguna

- Skor dinilai AI dan belum diverifikasi manusia.
- Skor adalah batas bawah: indikator tanpa dokumen dihitung nol, bukan dianggap tidak ada.
- Satu tahun penilaian saja.
- Modul tidak tampil di produksi; jangan dipakai sebagai dasar laporan.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-5-AC1` | Masuk, lalu lihat menu Dasbor → Kinerja Daerah | Tidak ada item "Dukungan PROSN" | Belum dijalankan |
| `FT-5-AC2` | Buka `/dashboard-pemdi/prosn` langsung | Halaman tidak ditemukan, bukan halaman kosong atau galat server | Belum dijalankan |
| `FT-5-AC3` | Buka Beranda dan `/dashboard-pemdi/pemdi` | Tidak ada kartu atau cabang PROSN; jumlah kerangka tidak menghitungnya | Belum dijalankan |
| `FT-5-AC4` | Dengan `TAMPIL_PROSN=true` di lingkungan uji (operator) | Menu dan halaman tampil; skor ditandai batas bawah; setiap indikator menampilkan bukti, halaman, dan kutipan | Belum dijalankan |
| `FT-5-AC5` | Pada lingkungan uji, buka satu indikator tanpa bukti | Ditampilkan sebagai belum ada bukti dan dihitung nol, bukan disembunyikan | Belum dijalankan |
| `FT-5-AC6` | Pada lingkungan uji, unduh Excel tab Laporan | Berkas terbuka dengan penilaian dan daftar sumber | Belum dijalankan |
| `FT-5-AC7` | Kembalikan sakelar ke `false` lalu muat ulang | Menu dan rute hilang kembali; tidak ada sisa tautan di halaman lain | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
