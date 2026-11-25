# Capaian SPM

Dasbor Standar Pelayanan Minimal (`/dashboard-pemdi/spm`), dengan tab Ringkasan dan Laporan,
halaman per bidang, dan halaman per jenis layanan.

| | |
| --- | --- |
| Modul | Kinerja Daerah |
| Backlog | `FT-4` di [BACKLOG.md](../BACKLOG.md) |
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

Capaian SPM dilaporkan per jenis layanan, dan angka tiap layanan tersebar di tabel RKPD serta
RPJMD. Tanpa satu dasbor, tidak terlihat layanan mana yang tuntas, hampir tuntas, atau belum ada
datanya, dan tidak ada cara cepat menelusuri satu angka ke halaman sumbernya.

## Yang bisa dilakukan pengguna

1. Memilih tahun capaian: 2021 sampai 2025.
2. Melihat indeks SPM kabupaten, jumlah layanan tuntas, dan jumlah bidang.
3. Melihat capaian tiap bidang sebagai kartu dan peta capaian per jenis layanan menurut tahun.
4. Membuka satu bidang untuk melihat semua layanan di dalamnya.
5. Membuka satu jenis layanan untuk melihat sasaran, terlayani, capaian, tren, dan sumbernya.
6. Membedakan layanan kewenangan kabupaten dari layanan kewenangan provinsi.
7. Membaca tab Laporan berisi tabel penerapan SPM dalam format laporan.
8. Mengunduh Excel berisi capaian per layanan, indeks per bidang, nilai dengan kutipan, dan sumber.
9. Mencetak laporan dengan tata letak A4 mendatar.
10. Membuka dokumen sumber pada halaman yang dikutip.

## Tidak termasuk

- Menilai atau mengubah capaian.
- Membandingkan dengan kabupaten lain.
- Mengekspor PDF dari server; cetak memakai browser.
- Data provinsi sebagai penilaian: cabang provinsi hanya referensi.

## Bertanya ke AI Tubaba

Tidak. Tabel SPM belum disinkronkan ke lakehouse ([DATA-2](../BACKLOG.md)), jadi AI Tubaba tidak
dapat menjawab pertanyaan capaian SPM.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/dashboard-pemdi/[slug]/page.tsx` dan `[...jalur]/page.tsx` |
| Tampilan | `src/components/spm-halaman.tsx`, `src/components/spm-detail.tsx`, `src/components/viz-spm.tsx` |
| Data | `src/lib/spm.ts` (membaca `src/data/spm/nilai.json` dan `sumber.json`) |
| Hitungan | `src/lib/spm-hitung.ts` (murni; belum diporting ke Rust) |
| Pembangun data | `scripts/spm-bangun.ts` dari `src/data/spm/ekstraksi.json` dan `sumber/spm/*` |
| Kerangka layanan | `src/data/kerangka/spm.ts` |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Capaian = terlayani ÷ sasaran × 100, dengan target 100%. Bila laporan sudah memuat angka capaian, angka laporan dipakai apa adanya. | Angka laporan lebih dulu | Berlaku (tertulis di kode) |
| 2 | Satu jenis layanan yang dipecah menjadi beberapa sub-indikator memakai rata-rata baris capaian yang dilaporkan. | Rata-rata sub-indikator | Berlaku (tertulis di kode) |
| 3 | Indeks bidang memakai angka indeks yang dilaporkan; bila tidak ada, rata-rata capaian layanan bidang itu. | Indeks laporan lebih dulu | Berlaku (tertulis di kode) |
| 4 | Kategori: Tuntas 100%, Hampir tuntas ≥90%, Belum tuntas <90%. Sumber hanya menyebut nama kategori tanpa ambang, jadi ambang ini kontrak dasbor. | Ambang 100/90 | Berlaku (tertulis di kode) |
| 5 | Layanan kewenangan provinsi tetap didaftarkan sebagai referensi, tidak dihitung pada capaian kabupaten. | Referensi saja | Berlaku (tertulis di kode) |
| 6 | Layanan tanpa data ditampilkan kosong dengan keterangan, bukan 0%. | Kosong, bukan nol | Berlaku (tertulis di kode) |
| 7 | Ekspor Excel dan cetak/PDF lewat browser. | Excel + cetak browser | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- Angka disalin dari tabel RKPD 2027 (Perbup 18/2026) yang mengutip `spm.bangda.kemendagri.go.id`,
  dan dari RPJMD 2025–2029 untuk tahun awal; belum dicocokkan dengan laporan e-SPM.
- Sebagian layanan belum punya data pada tahun tertentu; selnya kosong, bukan nol.
- Hanya kewenangan kabupaten yang dinilai.
- Ambang kategori bukan dari sumber; lihat Keputusan 4.
- Cetak mengikuti pengaturan browser.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-4-AC1` | Buka `/dashboard-pemdi/spm` | Indeks kabupaten, jumlah layanan tuntas, kartu bidang, dan peta capaian tampil untuk tahun terpilih | Belum dijalankan |
| `FT-4-AC2` | Ganti tahun 2021 sampai 2025 | Semua angka dan peta mengikuti tahun; URL menyimpan pilihan | Belum dijalankan |
| `FT-4-AC3` | Klik satu sel peta atau satu bidang | Halaman layanan atau bidang terbuka dengan angka, tren, dan sumber | Belum dijalankan |
| `FT-4-AC4` | Buka layanan yang tidak punya data | Tampil keterangan belum ada data, bukan 0% atau halaman galat | Belum dijalankan |
| `FT-4-AC5` | Buka cabang provinsi | Layanan provinsi tampil sebagai referensi dan tidak menambah capaian kabupaten | Belum dijalankan |
| `FT-4-AC6` | Unduh Excel pada tab Laporan | Berkas terbuka; angka per layanan sama dengan layar; lembar sumber ada | Belum dijalankan |
| `FT-4-AC7` | Cetak tab Laporan | Tata letak A4 mendatar; daftar sumber tercetak; menu tidak tercetak | Belum dijalankan |
| `FT-4-AC8` | Buka satu kutipan sumber | PDF terbuka pada halaman yang disebut | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
