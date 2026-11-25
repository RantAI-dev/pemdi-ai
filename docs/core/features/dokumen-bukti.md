# Dokumen bukti

Halaman unggah dan registry dokumen (`/dokumen`): berkas masuk, teksnya dibaca, AI mengekstrak
temuan dan angka, lalu hasilnya mengisi dasbor.

| | |
| --- | --- |
| Modul | Dokumen & Bukti |
| Backlog | `FT-8` di [BACKLOG.md](../BACKLOG.md) |
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

Bukti evaluasi datang sebagai PDF, Word, PowerPoint, foto, dan Excel dari banyak OPD. Membaca
semuanya dengan tangan lambat, dan hasilnya tidak bisa dipakai dasbor. Sebagian berkas hasil pindai
tidak punya lapisan teks sama sekali.

## Yang bisa dilakukan pengguna

1. Mengunggah beberapa berkas sekaligus, dengan tarik-lepas atau pemilih berkas, dan memilih OPD
   pemiliknya (boleh kosong).
2. Melihat corong alur: jumlah dokumen, teks terbaca, berapa lewat OCR, berapa tak terbaca, berapa
   sudah dibaca AI, dan berapa temuan serta angka yang dihasilkan.
3. Menyaring daftar menurut status (dibaca AI, menunggu AI, gagal, tak terbaca) dan mencari menurut
   berkas, OPD, atau jenis dokumen.
4. Membuka satu dokumen untuk membaca ringkasan, temuan per indikator beserta tingkat dan kutipan,
   angka yang dilaporkan, dan kebutuhan data yang dipenuhinya.
5. Memproses satu dokumen atau semua dokumen yang belum dibaca AI, dan memproses ulang dokumen yang
   sudah selesai.
6. Melihat kemajuan antrean AI dan status penyalinan ke lakehouse.
7. Mengunggah CSV, Excel, atau Parquet sebagai tabel: memilih sheet, memeriksa pratinjau, menentukan
   nama tabel, lalu memuatnya ke lakehouse.
8. Membuka berkas asli dokumen yang tersimpan.

## Tidak termasuk

- Menghapus dokumen dari registry.
- Memberi nomor halaman pada kutipan temuan.
- Meredaksi data pribadi sebelum teks dikirim ke model.
- Memindai virus atau memeriksa jenis berkas dari isinya (magic bytes).
- Menyunting hasil ekstraksi AI. Hasil hanya bisa diproses ulang.

## Bertanya ke AI Tubaba

Bisa untuk hasilnya, bukan untuk isi dokumen. Contoh: "berapa jumlah temuan per indikator?".
Pertanyaan naratif seperti "apa bunyi SOP Dinas X?" belum dijawab karena belum ada pencarian teks
dokumen (RAG).

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/dokumen/page.tsx` |
| Tampilan | `src/app/dokumen/dokumen.tsx` |
| Unggah | `src/app/api/upload/route.ts`, `src/app/api/upload/ingest/route.ts`, `src/app/api/upload/status/route.ts` |
| Registry | `src/app/api/dokumen/route.ts`, `src/lib/store.ts` (`data/dokumen.json`) |
| Intake & OCR | `src/lib/dokumen.ts`, `src/lib/intake.ts`, `scripts/ocr.py` |
| Ekstraksi AI | `src/lib/proses.ts`, `src/lib/llm.ts` |
| Estimasi & salin | `src/lib/estimasi.ts`, `src/lib/sinkron.ts` |
| Berkas asli | `data/files/`, teks `data/teks/`; unduh lewat `/api/dokumen/<id>/berkas` |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Batas unggah 50 MB per berkas; berkas lebih besar ditolak. | 50 MB | Berlaku (tertulis di kode) |
| 2 | CSV/Excel/Parquet masuk lakehouse sebagai tabel; PDF/Word/PowerPoint/teks/foto menjadi dokumen. Jenis lain ditolak. | Routing menurut ekstensi | Berlaku (tertulis di kode) |
| 3 | OCR hanya untuk PDF, JPG, JPEG, PNG, hanya 6 halaman pertama, dan berjalan di dalam permintaan unggah. | 6 halaman | Berlaku (tertulis di kode) |
| 4 | Teks di bawah 80 karakter dianggap tidak terbaca; dokumen tidak diproses AI. | Ambang 80 karakter | Berlaku (tertulis di kode) |
| 5 | Teks dipotong 14.000 karakter sebelum dikirim ke model. | 14.000 karakter | Berlaku (tertulis di kode) |
| 6 | Satu dokumen menyumbang paling banyak 6 temuan dan 8 angka; id kebutuhan di luar katalog dibuang. | Batas dan validasi | Berlaku (tertulis di kode) |
| 7 | Antrean AI berjalan di memori, tiga dokumen sekaligus. | Paralel 3 | Berlaku (tertulis di kode) |
| 8 | Berkas dengan isi sama (hash SHA-1) menggantikan entri lama dan diproses ulang. | Ganti entri | Berlaku (tertulis di kode) |
| 9 | Tanpa LLM, dokumen tetap dibaca teksnya dan menunggu, bukan ditandai gagal. | Menunggu | Berlaku (tertulis di kode) |
| 10 | Dokumen diperlakukan sebagai data, bukan instruksi; keluaran model dibersihkan dan divalidasi di kode. | Validasi ketat | Berlaku (tertulis di kode dan `docs/ARSITEKTUR.md`) |

## Batasan yang disampaikan ke pengguna

- Pindaian hanya dibaca 6 halaman pertama, dan OCR berjalan lambat (bisa puluhan detik).
- Dokumen panjang dipotong 14.000 karakter; bukti di bagian akhir tidak terbaca.
- Kutipan temuan tidak menunjuk halaman; hanya berkas dan OPD.
- Antrean hilang bila aplikasi dimulai ulang. Dokumen yang sudah selesai tetap tersimpan.
- Berkas asli disimpan di volume aplikasi, bukan object storage; belum ada enkripsi khusus.
- Belum ada redaksi data pribadi; teks dokumen dikirim apa adanya ke endpoint model.
- Semua pengguna yang masuk dapat membuka berkas dokumen mana pun; belum ada pembatasan per OPD.
- Jenis berkas ditentukan dari ekstensi nama berkas.
- Mengunggah ulang berkas yang sama menghapus hasil AI lamanya dan memproses ulang.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-8-AC1` | Unggah PDF berlapis teks dengan OPD dipilih | Dokumen muncul, teks terbaca tanpa OCR, dan masuk antrean AI; setelah selesai, ringkasan dan temuan tampil | Belum dijalankan |
| `FT-8-AC2` | Unggah foto atau PDF pindaian | Ditandai OCR; teks terbaca dari halaman pertama; bila gagal, pesan "tidak ada teks yang bisa dibaca" tampil | Belum dijalankan |
| `FT-8-AC3` | Unggah berkas `.zip` dan berkas 60 MB | `.zip` ditolak dengan pesan jenis tidak didukung; berkas besar ditolak dengan pesan batas 50 MB | Belum dijalankan |
| `FT-8-AC4` | Dengan LLM dimatikan, unggah satu dokumen (operator) | Dokumen tersimpan, teks terbaca, label "AI belum aktif" tampil; tidak ada status gagal | Belum dijalankan |
| `FT-8-AC5` | Paksa satu dokumen gagal diproses AI (operator) | Chip "AI gagal" dan pesan galatnya tampil di dokumen itu; dokumen lain tidak terpengaruh | Belum dijalankan |
| `FT-8-AC6` | Unggah CSV, pilih sheet, ubah nama tabel, lalu muat | Pratinjau tampil; setelah muat, tabel dapat ditanyakan di AI Tubaba | Belum dijalankan |
| `FT-8-AC7` | Unggah berkas yang sama dua kali | Hanya satu entri; hasil AI sebelumnya diganti setelah diproses ulang | Belum dijalankan |
| `FT-8-AC8` | Buka berkas asli satu dokumen | PDF atau gambar terbuka; dokumen tanpa berkas asli menjawab "belum tersedia" | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
