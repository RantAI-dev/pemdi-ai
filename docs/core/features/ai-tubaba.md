# AI Tubaba

Tanya-jawab data dalam bahasa Indonesia (`/tanya`), di atas lakehouse. Setiap jawaban menyertakan
kueri yang dijalankan dan baris hasilnya.

| | |
| --- | --- |
| Modul | AI Tubaba |
| Backlog | `FT-11` di [BACKLOG.md](../BACKLOG.md) |
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

Pimpinan dan analis perlu jawaban atas data tanpa menulis SQL, tetapi jawaban AI tidak boleh
diterima buta. Tanpa kueri yang terlihat, angka dari model tidak bisa diperiksa dan tidak bisa
dipakai dalam laporan.

## Yang bisa dilakukan pengguna

1. Mengetik pertanyaan, atau memilih satu dari enam contoh pertanyaan yang disediakan.
2. Melihat langkah yang sedang dikerjakan dan berapa lama jawaban berjalan.
3. Menghentikan jawaban yang sedang berjalan.
4. Membaca jawaban berformat Markdown, termasuk tabel.
5. Membuka kueri SQL yang dijalankan, menyalinnya, dan melihat berapa kueri dipakai.
6. Melihat baris hasil sebagai grafik atau tabel, lalu mengunduhnya sebagai CSV.
7. Melihat angka yang ditandai AI sebagai hasil hitungan sendiri (bukan dibaca dari kueri) sebagai
   angka bergaris putus dengan penjelasan.
8. Menyalin jawaban, meminta jawaban ulang, dan mengirim pertanyaan lanjutan.
9. Memilih hingga tiga saran pertanyaan lanjutan setelah jawaban selesai.
10. Memulai percakapan baru, membuka riwayat percakapan di browser ini, dan menghapus percakapan.
11. Membuka halaman dengan pertanyaan siap lewat `/tanya?q=...`.

## Tidak termasuk

- Menulis data, mengubah tabel, atau menjalankan perintah selain `SELECT`.
- Editor SQL manual.
- Membaca isi dokumen (RAG). Pertanyaan naratif tentang isi SOP belum dijawab.
- Menyimpan percakapan di server atau membagikannya ke pengguna lain.
- Menjawab data Makro dan SPM, yang belum disinkronkan ke lakehouse.

## Bertanya ke AI Tubaba

Ini fitur itu sendiri. Contoh pertanyaan yang disediakan halaman: kebutuhan data yang belum ada dan
pemiliknya, OPD yang paling banyak belum menyerahkan berkas, nilai 20 indikator dari yang terendah,
jumlah temuan per indikator, persentase data prioritas pusat yang masuk, dan jumlah penduduk per
kecamatan.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/tanya/page.tsx` |
| Tampilan | `src/app/tanya/tanya.tsx`; grafik di `src/components/charts.tsx` |
| API | `src/app/api/ask/route.ts` (stream), `src/app/api/ask/saran/route.ts` (saran lanjutan) |
| Klien lakehouse | `src/lib/lakehouse.ts` (`lhFetch`, `/api/ai/chat`) |
| Konteks skema | `src/lib/tables.ts`; tabel unggahan di `src/lib/user-tables.ts` |
| Data | tabel `pemdi_*` dan `tbb_dalam_angka` di lakehouse, ditambah tabel hasil unggahan |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Tidak ada editor SQL. Semua pertanyaan lewat AI; SQL ditampilkan di bawah jawaban. | AI saja | Berlaku (tertulis di kode) |
| 2 | Hanya tool baca: `run_sql`, `list_datasets`, `describe_dataset`, `lakehouse_overview`. | Daftar putih | Berlaku (tertulis di kode dan `docs/ARSITEKTUR.md`) |
| 3 | Riwayat percakapan yang dikirim ke model dibatasi 12 pesan terakhir. | 12 pesan | Berlaku (tertulis di kode) |
| 4 | Jawaban kosong diubah menjadi pesan galat, bukan jawaban kosong. | Galat jelas | Berlaku (tertulis di kode) |
| 5 | Angka yang dihitung sendiri oleh model ditandai garis putus-putus dan wajib dicek. | Tanda belum terverifikasi | Berlaku (tertulis di kode) |
| 6 | Jawaban wajib Bahasa Indonesia; aksara CJK dibuang bila model menyelipkannya. | Indonesia | Berlaku (tertulis di kode) |
| 7 | Percakapan disimpan di browser (30 terakhir), bukan di server. | Penyimpanan lokal | Berlaku (tertulis di kode) |
| 8 | Koneksi diberi ping tiap 15 detik agar tidak diputus Cloudflare saat model berpikir lama. | Ping 15 detik | Berlaku (tertulis di kode dan `AGENTS.md`) |
| 9 | Grafik hanya digambar untuk 2–40 baris dengan satu kolom angka; selain itu tabel. | Grafik bila cocok | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- AI bisa keliru. Kueri yang dijalankan dapat dibuka dan harus diperiksa sebelum angkanya dipakai.
- Hanya baca: maksimal 2.000 baris per kueri, dan tidak ada perintah yang mengubah data.
- Jendela percakapan 12 pesan; percakapan panjang kehilangan konteks awal.
- Tidak membaca Makro, SPM, atau PROSN, karena tabelnya belum disinkronkan.
- Tidak menjawab isi dokumen; hanya data terstruktur.
- Riwayat hanya ada di browser yang dipakai; berganti browser atau membersihkan data situs
  menghilangkannya.
- Token lakehouse kedaluwarsa tiap 30 hari dan tidak diperbarui otomatis; bila lewat, AI menjawab
  dengan galat autentikasi sampai token diperbarui (operator, `scripts/portainer.sh token`).
- Semua pengguna yang masuk melihat data yang sama; belum ada pembatasan per OPD.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-11-AC1` | Tanya "tampilkan nilai 20 indikator, urut dari yang terendah" | Jawaban, langkah, jumlah kueri, dan tabel/grafik tampil; SQL dapat dibuka dan disalin | Belum dijalankan |
| `FT-11-AC2` | Unduh CSV dari hasil | Berkas terbuka dengan kolom dan baris yang sama dengan tabel di layar | Belum dijalankan |
| `FT-11-AC3` | Ajukan pertanyaan yang memakan waktu, lalu tekan Hentikan | Jawaban berhenti dan ditandai "Dihentikan."; halaman tetap dapat dipakai | Belum dijalankan |
| `FT-11-AC4` | Muat ulang halaman, buka Riwayat | Percakapan sebelumnya ada di browser itu dan dapat dibuka lagi | Belum dijalankan |
| `FT-11-AC5` | Buka `/tanya?q=berapa%20jumlah%20OPD` | Pertanyaan langsung dijalankan; URL kembali menjadi `/tanya` | Belum dijalankan |
| `FT-11-AC6` | Buat token lakehouse kedaluwarsa di lingkungan uji (operator) | Pesan galat yang dapat dibaca tampil, bukan halaman kosong; tombol "Coba lagi" tersedia | Belum dijalankan |
| `FT-11-AC7` | Minta AI menulis atau menghapus data | Permintaan ditolak atau dijawab bahwa AI hanya membaca; tidak ada perubahan tabel | Belum dijalankan |
| `FT-11-AC8` | Buka `/tanya` tanpa sesi | Dialihkan ke `/login`; setelah masuk kembali ke `/tanya` | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
