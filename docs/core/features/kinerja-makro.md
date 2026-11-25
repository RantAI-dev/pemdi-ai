# Kinerja Makro

Dasbor enam indikator kinerja makro daerah (`/dashboard-pemdi/makro`), dengan tab Ringkasan dan
Laporan, serta satu halaman per indikator.

| | |
| --- | --- |
| Modul | Kinerja Daerah |
| Backlog | `FT-3` di [BACKLOG.md](../BACKLOG.md) |
| Jenis | Feature |
| Spec | Tidak ada spec; halaman ini yang menjadi acuan |
| Status | In Acceptance |
| Prioritas | P1 |
| Pemilik | Pemilik modul. Tidak dinamai di repo. |
| Penerima | Yang menjalankan checklist. Bukan pembuat fitur. Tidak dinamai di repo. |
| Rencana | Tidak ada |
| Mulai | Belum diverifikasi |
| Terkirim | Belum diverifikasi |
| Bukti | Berjalan di `epemdi.ai.id`; belum ada catatan PR |

## Masalah

Angka makro untuk LPPD dan evaluasi RPJMD tersebar di publikasi BPS, RPJMD, dan dokumen OPD.
Menyusun tabel LPPD berarti menyalin ulang angka dan mencatat halaman sumbernya dengan tangan.
Kesalahan salin tidak terlihat setelah tabel dikirim.

## Yang bisa dilakukan pengguna

1. Memilih tahun laporan: 2025, 2024, atau 2023.
2. Melihat enam kartu indikator dengan realisasi, laju, capaian terhadap target RPJMD, dan
   kategorinya.
3. Membuka satu indikator untuk melihat tren realisasi Tubaba dibanding Provinsi Lampung dan
   nasional, dengan target RPJMD sebagai garis putus-putus.
4. Melihat tabel nilai per tahun, komponen indikator (mis. UHH, HLS, RLS, pengeluaran), dan daftar
   bukti dengan kutipan serta halaman sumbernya.
5. Membuka tab Laporan untuk membaca Tabel LPPD dan Tabel Evaluasi RPJMD dalam format yang
   dilaporkan.
6. Mengunduh Excel berisi empat lembar: LPPD, Evaluasi RPJMD, nilai & kutipan, dan sumber.
7. Mencetak laporan dengan tata letak A4 mendatar, lengkap dengan daftar sumber.
8. Meminta draf paragraf narasi gaya LPPD untuk satu baris tabel (AI), lalu memeriksanya.
9. Membuka PDF sumber pada halaman yang dikutip.

## Tidak termasuk

- Mengubah angka. Semua nilai berasal dari berkas data yang dibangun skrip, bukan dari layar.
- Menghitung proyeksi atau skenario what-if.
- Mengekspor PDF atau DOCX dari server. Cetak memakai dialog cetak browser.
- Menyimpan narasi AI. Narasi hanya tampil sampai halaman dimuat ulang.

## Bertanya ke AI Tubaba

Tidak untuk angka Makro. Tabel Makro belum disinkronkan ke lakehouse ([DATA-2](../BACKLOG.md)),
jadi AI Tubaba tidak dapat menjawab pertanyaan tentangnya.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/dashboard-pemdi/[slug]/page.tsx` dan `[...jalur]/page.tsx` |
| Tampilan | `src/components/makro-halaman.tsx`, `src/components/makro-detail.tsx` |
| Data | `src/lib/makro.ts` (membaca `src/data/makro/nilai.json` dan `sumber.json`) |
| Hitungan | `src/lib/makro-hitung.ts` (murni; sudah diporting ke Rust) |
| Pembangun data | `scripts/makro-bangun.ts` dari `sumber/bps/*` dan `src/data/makro/rpjmd.json` |
| PDF sumber | `/api/sumber/<kumpulan>/<berkas>`; hanya berkas di `manifest.json` yang dilayani |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Laju kinerja = (kini − lalu) ÷ lalu × 100. Untuk indikator yang turun, laju negatif berarti membaik. | Rumus LPPD | Berlaku (tertulis di kode) |
| 2 | Capaian indikator "naik" = realisasi ÷ target × 100; indikator "turun" = (2 × target − realisasi) ÷ target × 100, mengikuti Permendagri 86/2017. | Dua rumus menurut polaritas | Berlaku (tertulis di kode) |
| 3 | Kategori capaian: ≥91 Sangat Tinggi, ≥76 Tinggi, ≥66 Sedang, ≥51 Rendah, di bawahnya Sangat Rendah. | Ambang pedoman evaluasi | Berlaku (tertulis di kode) |
| 4 | Bila realisasi tahun laporan belum ada, dipakai realisasi terakhir dan tahunnya ditulis. | Tampilkan tahun data | Berlaku (tertulis di kode) |
| 5 | Semua angka diberi peringatan "belum diverifikasi manual" di kepala halaman dan di laporan. | Peringatan tampil | Berlaku (tertulis di kode) |
| 6 | Ekspor Excel dan cetak/PDF lewat browser, bukan pembangkit PDF di server. | Excel + cetak browser | Berlaku (tertulis di kode) |
| 7 | Narasi AI hanya draf per baris, tidak disimpan dan tidak masuk ekspor. | Draf sementara | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- Angka diekstrak otomatis dari BPS dan RPJMD; belum diverifikasi manual oleh Bappeda.
- Hanya tiga tahun yang dapat dipilih (2023–2025).
- Sebagian indikator belum punya target RPJMD pada tahun tertentu; sel itu ditandai, bukan diisi
  nol.
- Provinsi dan nasional hanya sebagai pembanding, bukan target.
- Narasi AI bisa keliru; angka dan sumbernya wajib diperiksa sebelum dipakai.
- Cetak mengikuti pengaturan browser; tidak ada berkas PDF yang tersimpan di server.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-3-AC1` | Buka `/dashboard-pemdi/makro` | Enam kartu indikator tampil dengan realisasi, laju, capaian, dan kategori untuk tahun terpilih | Belum dijalankan |
| `FT-3-AC2` | Ganti tahun ke 2024 dan 2023 | Semua kartu, tabel, dan sumber mengikuti tahun; URL menyimpan pilihan tahun | Belum dijalankan |
| `FT-3-AC3` | Buka satu indikator dari kartunya | Tren Tubaba, Lampung, nasional, dan target tampil; tabel per tahun, komponen, kutipan, dan daftar sumber ada | Belum dijalankan |
| `FT-3-AC4` | Pada tab Laporan, unduh Excel lalu buka | Empat lembar: LPPD, Evaluasi RPJMD, Nilai & kutipan, Sumber; angka sama dengan layar | Belum dijalankan |
| `FT-3-AC5` | Cetak tab Laporan (pratinjau) | Tata letak A4 mendatar, daftar sumber ikut tercetak, tombol dan menu tidak tercetak | Belum dijalankan |
| `FT-3-AC6` | Minta narasi satu baris dengan LLM mati (operator) | Pesan galat yang jelas muncul di baris itu; tabel lain tetap tampil | Belum dijalankan |
| `FT-3-AC7` | Pilih tahun yang belum punya realisasi | Sel menampilkan "menunggu realisasi" atau tahun data terakhir, bukan angka nol | Belum dijalankan |
| `FT-3-AC8` | Buka satu kutipan sumber | PDF terbuka pada halaman yang disebut, atau berkas yang benar terunduh | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
