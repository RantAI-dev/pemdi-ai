# Beranda

Halaman pertama setelah masuk (`/`). Satu layar untuk melihat kerangka kinerja yang dipakai
Pemdi-AI dan angka utamanya.

| | |
| --- | --- |
| Modul | Indeks Pemdi |
| Backlog | `FT-1` di [BACKLOG.md](../BACKLOG.md) |
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

Pembaca pimpinan perlu melihat seluruh kerangka kinerja daerah dalam satu layar sebelum memilih
satu angka untuk ditelusuri. Tanpa halaman ini, setiap kerangka hanya bisa dibuka satu per satu
dari menu, dan tidak ada tempat yang menunjukkan hubungan antara indeks, kinerja daerah, dan OPD
yang terlibat.

## Yang bisa dilakukan pengguna

1. Melihat satu kartu per kerangka yang aktif: Kinerja Makro, Capaian SPM, dan Indeks Pemdi.
2. Membaca angka utama tiap kartu: capaian SPM tahun berjalan, indeks Pemdi beserta predikatnya,
   atau jumlah indikator kerangka lain.
3. Melihat jumlah simpul di tiap tingkat kerangka pada kartu, lalu membuka kerangkanya dengan satu
   klik.
4. Membaca capaian SPM per bidang sebagai batang, dengan sisa menuju target 100%.
5. Membaca indeks Pemdi per aspek, beserta lencana `sementara` bila belum semua indikator dinilai.
6. Membaca realisasi dan capaian enam indikator Kinerja Makro tahun berjalan, lalu membuka satu
   indikator.
7. Melihat peta panas keterlibatan OPD: berapa indikator tiap kerangka menyebut tiap OPD.

## Tidak termasuk

- Ringkasan kesiapan OPD. Halaman ini memuat keterlibatan OPD dalam kerangka, bukan kelengkapan
  survei dan berkas OPD; itu ada di `/opd`.
- Dukungan PROSN, selama `TAMPIL_PROSN` bernilai `false` (lihat [prosn](prosn.md)).
- Filter, pencarian, atau unduhan. Angka di sini hanya pintu masuk.
- Angka resmi hasil evaluasi. Semua angka adalah bacaan Pemdi-AI atas data yang tersedia.

## Bertanya ke AI Tubaba

Bisa, tetapi tidak dari halaman ini. Pengguna membuka `/tanya` dan bertanya, misalnya,
"indikator mana yang bobotnya besar tetapi nilainya rendah?". AI Tubaba tidak membaca tabel Makro
dan SPM karena keduanya belum disinkronkan ke lakehouse ([DATA-2](../BACKLOG.md)).

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/page.tsx` |
| Tampilan | `src/app/dashboard-pemdi/dasbor-pemdi.tsx` |
| Data | `src/lib/dasbor-pemdi.ts` (kerangka + `data/penilaian.json`), `src/lib/makro.ts`, `src/lib/spm.ts` |
| Sumber angka | `src/data/kerangka/*`, `src/data/makro/nilai.json`, `src/data/spm/nilai.json` |
| Judul kerangka | `src/data/kerangka/index.ts`; kerangka yang disembunyikan tidak ikut dihitung |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Jumlah kartu mengikuti kerangka yang aktif. Dengan PROSN disembunyikan, tampil tiga kartu, bukan empat. | Tiga kartu | Berlaku (tertulis di kode) |
| 2 | Nama OPD diseragamkan ke nama resmi sebelum dihitung, supaya satu OPD tidak terhitung dua kali. Label yang bukan satu OPD ("seluruh OPD") tidak diikutkan. | Peta alias di `src/lib/dasbor-pemdi.ts` | Berlaku (tertulis di kode) |
| 3 | Indeks Pemdi ditampilkan sementara bila belum lengkap, dengan lencana jumlah indikator terisi. | Tampil dengan lencana | Berlaku (tertulis di kode) |
| 4 | Angka Makro dan SPM diberi keterangan "belum diverifikasi" di kartunya, bukan dianggap final. | Keterangan verifikasi tampil | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- Angka Makro dan SPM diekstrak otomatis dari publikasi BPS, RPJMD, dan RKPD; belum diverifikasi
  manual.
- Indeks Pemdi adalah estimasi AI atas dokumen yang ada, bukan hasil evaluasi resmi.
- Peta panas menghitung berapa indikator menyebut sebuah OPD, bukan menilai kinerja OPD itu.
- Hanya 15 OPD teratas yang digambar pada peta panas.
- Bila lakehouse tidak dapat dibaca, angka survei menjadi nol tanpa pesan galat.
- Halaman ini tidak dapat diunduh atau dicetak sebagai laporan; pakai tab Laporan di halaman
  Kinerja Makro dan Capaian SPM.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-1-AC1` | Masuk, lalu buka `/` | Tiga kartu kerangka tampil: Kinerja Makro, Capaian SPM, Indeks Pemdi. Tidak ada kartu PROSN | Belum dijalankan |
| `FT-1-AC2` | Klik kartu Indeks Pemdi, lalu kembali ke Beranda | Halaman `/dashboard-pemdi/pemdi` terbuka; tombol kembali mengembalikan ke Beranda | Belum dijalankan |
| `FT-1-AC3` | Baca kartu Indeks Pemdi saat ada indikator belum dinilai | Angka tampil dengan lencana `sementara` dan jumlah indikator terisi | Belum dijalankan |
| `FT-1-AC4` | Baca panel Kinerja Makro dan Capaian SPM beserta keterangan (i) | Sumber angkanya disebut, dan status verifikasinya jujur (belum diverifikasi manual / belum dicocokkan dengan e-SPM) | Belum dijalankan |
| `FT-1-AC5` | Hentikan lakehouse, lalu muat ulang Beranda (operator) | Halaman tetap tampil; angka survei menjadi nol; tidak ada halaman galat | Belum dijalankan |
| `FT-1-AC6` | Buka `/` tanpa sesi di jendela privat | Dialihkan ke `/login`; setelah masuk, kembali ke Beranda | Belum dijalankan |
| `FT-1-AC7` | Buka `/` pada lebar ponsel (390×844) | Kartu tersusun satu kolom; tidak ada angka terpotong | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
