# Data & Aplikasi

Halaman bahan bukti aspek Data, Keamanan, dan Teknologi (`/data`): katalog data statistik sektoral
dan inventaris subdomain aplikasi Pemkab.

| | |
| --- | --- |
| Modul | Indeks Pemdi |
| Backlog | `FT-7` di [BACKLOG.md](../BACKLOG.md) |
| Jenis | Feature |
| Spec | Tidak ada spec; halaman ini yang menjadi acuan |
| Status | In Acceptance |
| Prioritas | P2 |
| Pemilik | Pemilik modul. Tidak dinamai di repo. |
| Penerima | Yang menjalankan checklist. Bukan pembuat fitur. Tidak dinamai di repo. |
| Rencana | Tidak ada |
| Mulai | Belum diverifikasi |
| Terkirim | Belum diverifikasi |
| Bukti | Berjalan di `epemdi.ai.id`; belum ada catatan PR |

## Masalah

Bukti untuk indikator data, keamanan, dan aplikasi tersimpan sebagai daftar di Diskominfo, bukan
sebagai angka yang bisa dibaca. Tanpa ringkasan, tidak terlihat berapa tabel data sektoral yang
sudah masuk, produsen mana yang paling banyak tertinggal, dan berapa subdomain yang belum memakai
SSL.

## Yang bisa dilakukan pengguna

1. Melihat jumlah tabel data sektoral, persentase yang sudah diserahkan produsen, jumlah tabel
   prioritas pusat yang sudah masuk, dan persentase yang terbit di website.
2. Melihat jumlah subdomain aplikasi, berapa yang SSL-nya aktif, dan berapa pemiliknya.
3. Melihat jumlah tabel per kelompok sektoral: sudah masuk dan belum masuk.
4. Melihat alur pengolahan data: masuk, tertabulasi, terbit di website, dan prioritas pusat.
5. Melihat produsen data dengan tabel belum masuk terbanyak.
6. Melihat pemilik aplikasi dengan subdomain terbanyak.
7. Melihat sebaran kategori subdomain dan status SSL-nya.

## Tidak termasuk

- Mengubah katalog atau inventaris. Keduanya berasal dari berkas yang di-seed ke lakehouse.
- Memindai SSL secara langsung. Status SSL adalah isian sumber, bukan hasil uji.
- Membuka daftar lengkap tabel atau subdomain satu per satu.
- Mengekspor data.

## Bertanya ke AI Tubaba

Bisa, misalnya "berapa persen data prioritas pusat yang sudah masuk?". AI Tubaba membaca tabel
`pemdi_aplikasi` dan `pemdi_data_statistik` yang sama dengan halaman ini.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/data/page.tsx` |
| Tampilan | `src/app/data/data-tampilan.tsx` |
| Kueri | `src/lib/data.ts` (`getAplikasi`, `getDataStatistik`) |
| Data | tabel lakehouse `pemdi_aplikasi` dan `pemdi_data_statistik` |
| Arti kolom | `src/lib/tables.ts` |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Status SSL "aktif" dibaca dari teks kolom `status_ssl`: memuat "aktif" atau "ssl" dan bukan "tidak"/"non". | Pencocokan teks | Berlaku (tertulis di kode) |
| 2 | Status SSL ditampilkan sebagai bukti indikator 11 (penerapan kriptografi), bukan sebagai audit keamanan. | Bukti indikator | Berlaku (tertulis di kode) |
| 3 | Tabel per kelompok memakai dua seri: data masuk dan belum masuk; warna kategori tetap dan sisanya abu-abu. | Dua seri | Berlaku (tertulis di kode) |
| 4 | Daftar pemilik aplikasi dibatasi 15 teratas, produsen data 12 teratas. | Batas tampilan | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- Kedua daftar adalah potret saat data di-seed, bukan pemindaian langsung.
- "SSL aktif" adalah isian sumber, bukan hasil pemeriksaan sertifikat.
- Sebagian besar angka adalah hitungan baris, bukan penilaian mutu data.
- Daftar pemilik dan produsen dipotong; sisanya tidak dapat dibuka dari halaman ini.
- Bila lakehouse tidak terbaca, angka menjadi nol tanpa pesan galat. Nol berarti "tidak terbaca"
  atau "memang kosong", dan halaman ini belum membedakan keduanya.
- Tidak ada ekspor atau tautan ke berkas sumber.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-7-AC1` | Buka `/data` | Empat angka utama, panel data sektoral, produsen data, dan panel subdomain tampil | Belum dijalankan |
| `FT-7-AC2` | Arahkan kursor ke satu batang kelompok | Tooltip menyebut jumlah tabel, data masuk, dan terbit di website | Belum dijalankan |
| `FT-7-AC3` | Jumlahkan kategori subdomain pada diagram | Totalnya sama dengan angka subdomain di kepala halaman | Belum dijalankan |
| `FT-7-AC4` | Bandingkan persentase SSL aktif dengan daftar status | Persentase sama dengan jumlah status yang dihitung aktif dibagi total | Belum dijalankan |
| `FT-7-AC5` | Matikan lakehouse, muat ulang halaman (operator) | Halaman tetap tampil dengan angka nol; tidak ada halaman galat | Belum dijalankan |
| `FT-7-AC6` | Buka `/data` tanpa sesi | Dialihkan ke `/login`; setelah masuk kembali ke `/data` | Belum dijalankan |
| `FT-7-AC7` | Buka `/data` pada lebar ponsel | Panel tersusun satu kolom; label tidak saling menimpa | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
