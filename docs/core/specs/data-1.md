# `DATA-1` Bappeda memverifikasi lima catatan data

| | |
| --- | --- |
| Backlog | `DATA-1` di [BACKLOG.md](../BACKLOG.md) |
| Module | Data |
| Size | M (menunggu jawaban pihak lain; bukan pekerjaan kode murni) |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Angka Makro dan SPM diekstrak otomatis lalu ditandai "belum diverifikasi manual"
(`docs/core/features/kinerja-makro.md:74`, `capaian-spm.md:78`). Lima hal di data hari ini tidak
bisa diputuskan sendiri oleh tim: masing-masing butuh sumber resmi atau orang yang memegang
laporannya. Selama belum dijawab, dasbor tetap menampilkan angka yang bisa salah, dan AI Tubaba
(`DATA-2`) akan menyebarkan angka yang sama.

## Yang didapat pengguna

Setiap angka di dasbor punya jawaban tertulis dari Bappeda: benar, perlu dikoreksi, atau memang
belum tersedia. Angka yang dikoreksi berubah di layar; angka yang belum dijawab diberi keterangan.

## Rancangan

### Berkas baru: `docs/core/catatan-data.md`

Satu tabel, satu baris per catatan, ID `DC-1`…`DC-5`. Kolom:

| Kolom | Isi |
| --- | --- |
| ID | `DC-1` … |
| Klaim di aplikasi | halaman + angka yang tampil hari ini, dengan rute |
| Sumber hari ini | berkas data + `path:line` + halaman PDF yang dikutip |
| Pertanyaan untuk Bappeda | satu pertanyaan tertutup, bisa dijawab "ya/tidak" atau dengan angka |
| Jawaban | diisi setelah rapat, dengan nama penjawab dan tanggal |
| Status | `Terbuka` / `Sesuai` / `Perlu koreksi` |

### Lima catatan yang harus masuk

**`DC-1` Target RPJMD: Tabel 4.7 atau 4.6.** Semua target enam indikator Makro diambil dari
Tabel 4.7 IKD, sedangkan Tabel 4.6 IKU memuat target berbeda — mis. pertumbuhan ekonomi 2025 4,88
(Tabel 4.7) versus 4,69–4,97 (Tabel 4.6). Bukti: `src/data/makro/rpjmd.json:20-22` (pertumbuhan),
`:85-87` (kemiskinan, titik tengah rentang 6,72–7,00), dan seluruh baris `target` di berkas itu.
Pertanyaan: *target mana yang dipakai untuk evaluasi RPJMD dan LPPD — Tabel 4.7 atau 4.6? Untuk
target berbentuk rentang, titik tengah boleh dipakai atau harus ditampilkan sebagai rentang?*

**`DC-2` Target Gini 2026.** Nilai 2026 = 0,244, titik tengah rentang 0,219–0,269
(`src/data/makro/rpjmd.json`, baris `gini` 2026). Angka itu **lebih rendah** dari target 2025
(0,292), lalu naik lagi ke 0,2785 pada 2027 — jadi capaian 2026 terlihat sangat baik lalu jatuh,
padahal realisasi 2024 (0,297) sedang memburuk. Catatan di data menyebut Gini kabupaten bukan
publikasi BPS. Pertanyaan: *apakah rentang 0,219–0,269 benar untuk 2026, dan bagaimana angka itu
dilaporkan?* Sertakan juga bahwa realisasi Tubaba 2023/2024 (0,274 / 0,297) berasal dari RPJMD,
bukan BPS — jangan dibandingkan dengan Gini Provinsi Lampung (0,324 / 0,302) di baris yang sama.

**`DC-3` SPM 2020 "8,35".** Layanan `anak-usia-sekolah` tahun 2020 = 8,35 sementara 2021 = 85,22
(`src/data/spm/nilai.json`, baris `"layanan": "anak-usia-sekolah"`, `"tahun": 2020`; kutipan
lengkapnya di `src/data/spm/ekstraksi.json:114-115`). Angka itu kemungkinan salah cetak atau salah
baca (83,5? 85,35?). Pertanyaan: *berapa angka yang benar, dan apakah tabelnya memang memuat 2020?*
Bandingkan dengan Perda RPJMD 2025–2029 Tabel 2.105 hlm. 165.

**`DC-4` Penurunan SPM kesehatan 2025.** Indeks bidang kesehatan turun 93,71 (2024) → 79,54
(2025); 11 dari 12 layanan turun, sebagian drastis: hipertensi 95,41 → 65,76, usia produktif
92,34 → 64,82, ibu bersalin 94,04 → 71,99 (`src/data/spm/nilai.json`, sumber
`perbup-18-2026-rkpd-2027`, Tabel 2.107). Pertanyaan: *penurunan ini nyata, atau karena laporan
e-SPM 2025 belum lengkap?* Bila karena pelaporan, angka 2025 harus diberi keterangan, bukan
dihapus.

**`DC-5` Tidak ada angka sasaran dan terlayani.** `src/data/spm/nilai.json` hanya memuat
`jenis` `capaian` (177 baris) dan `indeks` (42 baris); tidak satu pun `sasaran` atau `terlayani`,
padahal `src/lib/spm-hitung.ts:19-20` mencarinya, `capaian-spm.md:33` menjanjikan halaman layanan
memuat "sasaran, terlayani, capaian", dan `src/components/spm-detail.tsx:189` meminta OPD
mengunggah laporan yang memuatnya. Pertanyaan: *apakah Bappeda punya angka sasaran dan terlayani
per layanan per tahun (satu tahun saja cukup sebagai contoh)? Bila tidak ada, apakah kolom itu
boleh dihapus dari janji halaman?*

### Aturan pengerjaan

- Kirim kelima pertanyaan dalam satu surat/pesan; catat tanggal, kanal, dan nama penerima di
  `catatan-data.md`. Jangan mengirim satu per satu.
- Koreksi angka dikerjakan di PR terpisah, satu nilai satu PR kecil, dengan urutan: ubah sumber
  (`src/data/makro/rpjmd.json`, `sumber/bps/nilai.json`, atau `src/data/spm/ekstraksi.json`), lalu
  jalankan `bun run scripts/makro-bangun.ts` atau `bun run scripts/spm-bangun.ts`. **Jangan**
  menyunting `src/data/{makro,spm}/nilai.json` dengan tangan (`AGENTS.md`: berkas itu dibangun
  skrip).
- `git diff` pada berkas hasil bangun hanya boleh berisi nilai yang dikoreksi. Kalau lebih, berarti
  sumbernya lebih dari satu nilai — pisahkan PR-nya.
- Bila Bappeda menjawab "sesuai", tidak ada perubahan kode; status di `catatan-data.md` menjadi
  `Sesuai` dan tanggal verifikasinya dicatat, karena itu yang dipakai untuk menghapus kalimat
  "belum diverifikasi manual".

## Kriteria penerimaan

- [ ] `docs/core/catatan-data.md` ada, berisi `DC-1`…`DC-5` dengan lima kolom terisi (kolom
      Jawaban boleh kosong bila belum dijawab).
- [ ] Setiap baris menyebut rute tempat angkanya terlihat (`/dashboard-pemdi/makro`,
      `/dashboard-pemdi/makro/ipm`, `/dashboard-pemdi/spm`, `/dashboard-pemdi/spm/kesehatan/...`)
      dan halaman PDF sumbernya.
- [ ] Tanggal kirim, kanal, dan nama penerima tercatat. Bila belum dikirim, status task tetap
      **In Progress** dan PR menyebutkannya di badan.
- [ ] Setiap jawaban yang masuk sudah dipetakan ke salah satu: `Sesuai`, `Perlu koreksi` (dengan
      nomor PR koreksinya), atau `Terbuka` (dengan alasan).
- [ ] Untuk setiap koreksi: PR kecil, `bun run scripts/{makro,spm}-bangun.ts` dijalankan, dan
      tangkapan layar halaman terkait sebelum/sesudah dari `bun run dev` atau `epemdi.ai.id`
      (bukan `next build`).
- [ ] `scripts/check.sh` PASS untuk setiap PR kode.

## Yang tidak dikerjakan

- Menebak angka yang benar. Kalau Bappeda belum menjawab, angkanya tetap dan catatannya tetap
  `Terbuka`.
- Menyalin angka SPM dari e-SPM sendiri tanpa persetujuan Bappeda.
- Menambah pipeline `sasaran`/`terlayani` sebelum `DC-5` dijawab.
- Menyinkronkan angka ini ke lakehouse: `DATA-2`, setelah catatan ini selesai supaya AI tidak
  menyebarkan angka yang belum diverifikasi.
