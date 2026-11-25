# Kebutuhan data

Halaman status 68 butir kebutuhan data (`/kebutuhan`): dokumen atau data apa yang harus ada untuk
tiap indikator, mana yang sudah terkumpul, dan OPD mana yang belum menyerahkannya.

| | |
| --- | --- |
| Modul | Dokumen & Bukti |
| Backlog | `FT-9` di [BACKLOG.md](../BACKLOG.md) |
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

Setiap indikator membutuhkan dokumen tertentu. Tanpa daftar per butir, permintaan ke OPD tidak
terarah: tidak jelas butir mana yang kosong, siapa pemiliknya, dan OPD mana yang sudah menyerahkan.
Berkas yang masuk juga tidak otomatis diketahui menjawab butir yang mana.

## Yang bisa dilakukan pengguna

1. Melihat jumlah butir, persentase terpenuhi, dan jumlah berkas yang cocok.
2. Melihat sebaran status: belum ada, sebagian, perlu dicek, terpenuhi; klik bagian untuk menyaring.
3. Melihat status butir per aspek dan menyaring dari grafiknya.
4. Melihat OPD yang paling banyak belum menyerahkan butir yang diminta, atau pemilik butir kosong.
5. Menyaring menurut status, aspek, indikator, dan OPD, serta mencari nama butir atau pemilik.
6. Membaca tabel butir: ID, nama, indikator, penanggung jawab, tingkat minimum, jumlah berkas atau
   rasio OPD, dan status.
7. Membuka satu butir untuk melihat berkas yang cocok beserta dasar kecocokannya, dan daftar OPD
   yang belum menyerahkan.
8. Membuka berkas bukti langsung di halaman Dokumen.

## Tidak termasuk

- Mengirim permintaan atau pengingat ke OPD.
- Mengubah katalog butir atau status dari layar.
- Menilai apakah isi dokumen cukup untuk tingkat tertentu. Status hanya soal keberadaan berkas.
- Mengunggah berkas dari halaman ini; unggah dilakukan di `/dokumen`.

## Bertanya ke AI Tubaba

Bisa, misalnya "kebutuhan data apa saja yang belum ada, dan siapa pemiliknya?". Jawaban dihitung
dari tabel `pemdi_kebutuhan` yang disalin dari halaman ini.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/kebutuhan/page.tsx` |
| Tampilan | `src/app/kebutuhan/kebutuhan.tsx` |
| Hitungan | `src/lib/kebutuhan.ts` |
| Katalog | `src/data/kebutuhan.ts` (68 butir, tafsir Pemdi-AI atas kriteria Permen) |
| Data | registry `data/dokumen.json`; tabel `pemdi_survei` untuk daftar OPD yang diminta |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Berkas dihitung memenuhi butir bila hasil AI menyebut id butir itu. | Bukti dari AI | Berlaku (tertulis di kode) |
| 2 | Berkas yang belum dibaca AI dicocokkan lewat kode pertanyaan survei atau kata kunci pada nama dan 1.500 karakter pertama teks, lalu ditandai "Terdeteksi" karena masih dugaan. | Kecocokan sementara | Berlaku (tertulis di kode) |
| 3 | Untuk butir lingkup OPD, status dihitung dari OPD yang diminta lewat pertanyaan "As-Is": semua menyerahkan = terpenuhi, sebagian = sebagian. | Rasio OPD | Berlaku (tertulis di kode) |
| 4 | Untuk butir yang tidak dihitung per OPD, berkas yang ada tetapi tak terbaca atau belum dibaca AI membuat status "Perlu dicek", bukan "Terpenuhi". | Perlu dicek | Berlaku (tertulis di kode) |
| 5 | Katalog 68 butir adalah tafsir Pemdi-AI, bukan daftar resmi Permen. | Tafsir sendiri | Berlaku (tertulis di kode dan `docs/ARSITEKTUR.md`) |
| 6 | Tabel menampilkan 12 butir pertama; sisanya lewat "Tampilkan semua". | 12 baris | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- Kecocokan berkas yang belum dibaca AI adalah dugaan dari kata kunci atau kode survei.
- Kata kunci hanya dicari di judul dan awal teks, bukan seluruh isi dokumen.
- "Terpenuhi" berarti berkasnya ada dan sudah dibaca AI, bukan berarti isinya cukup untuk naik
  tingkat.
- Satu butir menampilkan paling banyak 30 berkas; jumlah selebihnya hanya dihitung.
- Bila lakehouse tidak terbaca, daftar OPD yang diminta kosong dan status butir lingkup OPD turun
  menjadi perkiraan dari berkas yang ada.
- Pemetaan pertanyaan survei ke indikator adalah tafsir Pemdi-AI.
- Tidak ada pengiriman permintaan resmi ke OPD dari halaman ini.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-9-AC1` | Buka `/kebutuhan` | Jumlah butir, persentase terpenuhi, panel status, per aspek, dan tabel tampil | Belum dijalankan |
| `FT-9-AC2` | Klik satu bagian diagram status | Tabel tersaring ke status itu; pil status menunjukkan jumlah yang sama | Belum dijalankan |
| `FT-9-AC3` | Buka satu butir yang punya berkas | Daftar berkas tampil dengan chip "Dibaca AI" atau "Terdeteksi"; tautan membuka dokumen yang benar | Belum dijalankan |
| `FT-9-AC4` | Buka satu butir lingkup OPD yang belum lengkap | Daftar OPD yang belum menyerahkan tampil, dan jumlahnya sama dengan rasio di kolom Berkas | Belum dijalankan |
| `FT-9-AC5` | Dengan LLM dimatikan, muat ulang halaman (operator) | Keterangan bahwa kecocokan ditebak dan ditandai "terdeteksi" tampil; halaman tetap berfungsi | Belum dijalankan |
| `FT-9-AC6` | Saring satu OPD yang belum menyerahkan | Hanya butir yang diminta ke OPD itu dan belum dipenuhi yang tampil | Belum dijalankan |
| `FT-9-AC7` | Cari kata yang tidak ada | Tabel kosong dengan pesan "Tidak ada butir untuk filter ini." | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
