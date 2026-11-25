# Kesiapan OPD

Halaman kelengkapan survei dan berkas pendukung tiap perangkat daerah (`/opd`).

| | |
| --- | --- |
| Modul | Dokumen & Bukti |
| Backlog | `FT-6` di [BACKLOG.md](../BACKLOG.md) |
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

Evaluasi bergantung pada jawaban survei dan berkas dari 30-an OPD. Tanpa satu tabel, tidak
terlihat OPD mana yang belum menjawab, OPD mana yang belum menyerahkan berkas, dan tema mana yang
paling banyak kosong. Menagih kelengkapan menjadi pekerjaan menebak.

## Yang bisa dilakukan pengguna

1. Melihat jumlah OPD yang mengisi survei, persentase pertanyaan terjawab, jumlah berkas
   pendukung, dan jumlah OPD dengan jawaban lengkap.
2. Melihat sebaran status form: Diverifikasi, Terkirim, Draft, dan lainnya.
3. Melihat sebaran kelengkapan jawaban: lengkap, sebagian, kosong.
4. Melihat berapa OPD yang sudah menyerahkan berkas dan berapa yang belum.
5. Melihat persentase pertanyaan terjawab per tema: layanan prioritas, proses bisnis, aplikasi,
   kepuasan pengguna, dan khusus/sektoral.
6. Melihat jenis berkas yang terkumpul dan berapa yang teksnya terbaca.
7. Membaca tabel per OPD: pertanyaan terjawab, persentase jawaban, sel tiap tema, jumlah berkas,
   dan status form.
8. Mengurutkan tabel menurut nama OPD, persentase jawaban, jumlah berkas, atau status.
9. Menampilkan seluruh OPD, bukan hanya 12 teratas.

## Tidak termasuk

- Menilai kinerja OPD. Halaman ini hanya mengukur kelengkapan.
- Membuka daftar berkas satu OPD. Tautan berkas ada di `/dokumen` dan `/kebutuhan`.
- Mengirim pengingat atau permintaan berkas.
- Mengubah status form atau jawaban survei.

## Bertanya ke AI Tubaba

Bisa, misalnya "OPD mana yang paling banyak belum menyerahkan berkas?". Jawaban dihitung dari
tabel lakehouse, jadi dapat berbeda dari halaman ini bila sinkronisasi belum selesai.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/opd/page.tsx` |
| Tampilan | `src/app/opd/opd-tampilan.tsx`; bentuk data di `src/app/opd/susun.ts` |
| Kueri | `src/lib/data.ts` (`getOpd`, `getSurveiPerIndikator`, `getTemaPerOpd`) |
| Data | tabel lakehouse `pemdi_opd` dan `pemdi_survei`; registry `data/dokumen.json` untuk jenis berkas |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Lima tema tetap: t1 layanan prioritas, t2 proses bisnis, t3 aplikasi, t4 kepuasan pengguna, dan sisanya "Khusus/sektoral". | Lima tema | Berlaku (tertulis di kode) |
| 2 | Berkas dianggap "teks terbaca" bila teksnya lebih dari 80 karakter. | Ambang 80 karakter | Berlaku (tertulis di kode) |
| 3 | Tabel menampilkan 12 OPD pertama menurut urutan aktif; sisanya lewat tombol "Lihat semua". | 12 baris | Berlaku (tertulis di kode) |
| 4 | Kelengkapan dihitung dari jumlah pertanyaan dan jawaban pada form OPD, bukan dari bobot indikator. | Rasio jawaban | Berlaku (tertulis di kode) |
| 5 | Sel tema yang tidak ada pada form OPD ditandai kotak putus-putus, bukan 0%. | Tanda khusus | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- Kesiapan berarti kelengkapan jawaban dan berkas, bukan mutu jawaban atau capaian indikator.
- Data berasal dari tabel survei di lakehouse; bila lakehouse tidak terbaca, tabel kosong tanpa
  pesan galat.
- Jumlah berkas pada tabel berasal dari kolom survei (`jumlah_dokumen`), sedangkan panel jenis
  berkas berasal dari registry dokumen; angkanya dapat berbeda.
- Tidak ada halaman rinci per OPD; daftar berkas dibuka dari halaman Dokumen atau Kebutuhan.
- Status form mengikuti kata yang dikirim aplikasi survei; nilai di luar tiga status dikenal
  dikelompokkan sebagai "Lainnya".

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-6-AC1` | Buka `/opd` | Empat angka utama, tiga panel sebaran, dan tabel OPD tampil | Belum dijalankan |
| `FT-6-AC2` | Urutkan tabel menurut persentase jawaban, lalu menurut status | Urutan berubah dan tetap konsisten setelah diurutkan ulang | Belum dijalankan |
| `FT-6-AC3` | Klik "Lihat semua" | Seluruh OPD tampil; tombol berubah menjadi "Ringkas" | Belum dijalankan |
| `FT-6-AC4` | Arahkan kursor ke satu sel tema | Tooltip menyebut OPD, tema, dan jumlah pertanyaan terjawab; tema yang tidak ada menyebut "tidak ada pada form ini" | Belum dijalankan |
| `FT-6-AC5` | Matikan lakehouse, muat ulang halaman (operator) | Tabel menampilkan "Belum ada data survei OPD."; halaman tidak galat | Belum dijalankan |
| `FT-6-AC6` | Buka `/opd` tanpa sesi | Dialihkan ke `/login`, lalu kembali ke `/opd` setelah masuk | Belum dijalankan |
| `FT-6-AC7` | Bandingkan jumlah berkas satu OPD dengan daftar di `/dokumen` | Perbedaan, bila ada, dapat dijelaskan oleh dua sumber angka yang berbeda | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
