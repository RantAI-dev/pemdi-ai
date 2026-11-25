# Pemdi-AI — Produk

Satu dokumen produk. Baca ini untuk tahu apa produknya, apa yang sudah ada, apa yang kurang, dan
apa berikutnya.

Terakhir diperbarui 2026-11-25. Status di sini berasal dari membaca repositori dan menguji
produksi; yang belum dicek ditulis *Belum diverifikasi*.

---

## 1. Apa ini dan untuk siapa

**Pemdi-AI adalah dasbor evaluasi kinerja pemerintah digital dan kinerja daerah untuk
Kabupaten Tulang Bawang Barat (Tubaba)**, dengan AI yang membaca dokumen bukti dan menjawab
pertanyaan atas data.

Pengguna:

- **Bappeda dan Diskominfo**: memantau Indeks Pemdi, kinerja makro, dan capaian SPM; menyiapkan
  bahan evaluasi dan laporan.
- **Tim penilai Indeks Pemdi**: melihat temuan per indikator, mengoreksi usulan nilai AI.
- **OPD**: melihat bukti dan kebutuhan data yang masih kurang, mengunggah dokumen.
- **Pimpinan daerah**: bertanya langsung ke AI Tubaba dalam bahasa Indonesia.

Dasar: Permen PANRB No. 8 Tahun 2026 (Evaluasi Kinerja Pemerintah Digital), LPPD/LKjIP
(Permendagri 86/2017) untuk Kinerja Makro, dan standar pelayanan minimal untuk SPM.

## 2. Apa yang sudah ada

Semua fitur ini berjalan di `https://epemdi.ai.id` dan `https://pemdi.rantai.dev`. Statusnya
**In Acceptance**: belum melewati checklist penerimaan owner (lihat [BACKLOG.md](BACKLOG.md),
bagian Features).

| Fitur | Halaman | Catatan |
| --- | --- | --- |
| Beranda | [beranda](features/beranda.md) | Ringkasan indeks dan kinerja daerah, keterlibatan OPD per indikator |
| Indeks Pemdi | [indeks-pemdi](features/indeks-pemdi.md) | 7 aspek, 20 indikator; nilai sementara bila ada indikator belum dinilai |
| Kinerja Makro | [kinerja-makro](features/kinerja-makro.md) | 6 indikator LPPD, target RPJMD Tabel 4.7, sumber PDF di bawah halaman |
| Capaian SPM | [capaian-spm](features/capaian-spm.md) | Indeks SPM kab. 2023–2025, dari RKPD 2027 |
| PROSN | [prosn](features/prosn.md) | Disembunyikan; total 33,50/100 masih batas bawah |
| Kesiapan OPD | [kesiapan-opd](features/kesiapan-opd.md) | Bukti dan kebutuhan per OPD |
| Data & Aplikasi | [data-aplikasi](features/data-aplikasi.md) | Inventaris aplikasi dan data |
| Dokumen bukti | [dokumen-bukti](features/dokumen-bukti.md) | Unggah ≤50 MB, OCR 6 halaman pertama, temuan AI |
| Kebutuhan data | [kebutuhan-data](features/kebutuhan-data.md) | 68 kebutuhan, tafsir Pemdi-AI atas kriteria Permen |
| Penilaian indikator | [penilaian-indikator](features/penilaian-indikator.md) | Usulan nilai AI + koreksi manual; indeks dihitung kode |
| AI Tubaba | [ai-tubaba](features/ai-tubaba.md) | NL2SQL atas lakehouse; tabel, grafik, SQL terbuka |
| Masuk dan sesi | [masuk-dan-sesi](features/masuk-dan-sesi.md) | Satu peran untuk semua pengguna |

## 3. Apa yang kurang

- **Tidak ada test otomatis** untuk hitungan resmi di sisi TypeScript (`TEST-1`). Paritas Rust baru
  mencakup `makro-hitung`.
- **Satu peran untuk semua pengguna**; belum ada SSO atau pembedaan OPD (`SEC-2`).
- **Dokumen dibaca sebagian**: OCR hanya 6 halaman pertama dan teks dipotong 14.000 karakter
  (`AI-3`, `AI-4`).
- **AI Tubaba tidak melihat data Makro dan SPM** karena belum disinkronkan ke lakehouse (`DATA-2`),
  dan belum ada tabel peternakan (`DATA-3`).
- **Data perlu diverifikasi Bappeda** (`DATA-1`).

## 4. Yang menghalangi produksi (P0)

- `OPS-1`: token lakehouse kedaluwarsa tiap 30 hari tanpa pembaruan otomatis. Berikutnya sekitar
  2026-12-13. Bila lewat, AI Tubaba berhenti membaca data.

Juga mendesak (P1): endpoint LLM produksi (`SEC-1`, `DEC-3`).

## 5. Berikutnya

1. **Porting backend ke Rust** ([`../port/`](../port/), ADR 0001): domain murni dulu
   (`PORT-11`–`PORT-15`), lalu adapter, use case, route, dan cutover bertahap.
2. **Rapikan frontend** (`FE-1`–`FE-6`): pecah berkas besar, lint aksesibilitas, struktur per fitur,
   lalu ambil data lewat klien API bertipe.
3. **Penerimaan fitur**: owner menjalankan checklist tiap halaman di `features/`.

## 6. Keputusan terbuka

`DEC-2` (pembangkit tipe), `DEC-3` (LLM produksi), `DEC-4` (alat build data), `DEC-5` (OCR),
`DEC-6` (kapan PROSN tampil). Rinciannya di [BACKLOG.md](BACKLOG.md), bagian Decisions.
