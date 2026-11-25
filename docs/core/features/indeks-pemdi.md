# Indeks Pemdi

Halaman Indeks Pemdi: ringkasan indeks, nilai 20 indikator, dan temuan dokumen. Menu "Indeks
Pemdi" membuka empat halaman: Ringkasan (`/indeks`), Aspek & Indikator (`/indikator`), Temuan
Dokumen (`/temuan`), dan Telusuri Kerangka (`/dashboard-pemdi/pemdi`).

| | |
| --- | --- |
| Modul | Indeks Pemdi |
| Backlog | `FT-2` di [BACKLOG.md](../BACKLOG.md) |
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

Nilai indeks tidak berguna bila tidak bisa ditelusuri. Penilai harus bisa berjalan dari angka
indeks ke aspek, ke indikator, ke dasar penilaian, lalu ke temuan dan dokumen yang mendasarinya.
Sebelum halaman ini, angka hanya bisa dibaca sebagai satu bilangan tanpa rantai bukti.

## Yang bisa dilakukan pengguna

1. Melihat indeks Pemdi pada skala 1–5, predikatnya, dan sebaran predikat 20 indikator.
2. Melihat indeks tiap aspek, bobotnya, dan sumbangannya ke indeks; klik batang untuk membuka
   indikator aspek itu.
3. Melihat "poin yang bisa diraih": bobot indikator × jaraknya ke nilai 5.
4. Melihat berapa butir kebutuhan data yang belum terpenuhi, per status.
5. Melihat nilai tiap indikator, bobot, jumlah temuan, jumlah kebutuhan data yang terpenuhi, poin
   yang bisa diraih, dan nilainya; klik baris untuk membuka rincian indikator.
6. Membaca dasar penilaian satu indikator, lencana `Estimasi AI` atau `Manual`, dan jumlah jawaban
   survei yang terkait; dari situ membuka halaman Penilaian atau Temuan.
7. Menyaring indikator dan temuan menurut aspek, indikator, OPD, tingkat, dan kata kunci.
8. Melihat temuan per indikator × tingkat sebagai peta panas, dan jumlah temuan per OPD.
9. Membaca kutipan tiap temuan dan angka yang dilaporkan dokumen, beserta nama berkasnya.
10. Mengunduh tabel indikator sebagai CSV.
11. Menelusuri kerangka Permen dari aspek ke indikator ke kriteria, beserta nilai dan dokumen yang
    sudah ada.

## Tidak termasuk

- Mengubah nilai dari halaman ini. Perubahan dilakukan di `/penilaian`.
- Melihat halaman asal kutipan. Temuan menyimpan kutipan dan nama berkas, bukan nomor halaman.
- Menilai ulang otomatis saat halaman dibuka. Estimasi diperbarui setelah antrean AI selesai.

## Bertanya ke AI Tubaba

Bisa. Contoh: "tampilkan nilai 20 indikator, urut dari yang terendah" atau "berapa jumlah temuan
per indikator?". Jawaban datang dari tabel lakehouse, jadi bisa berbeda sedikit dari halaman ini
bila sinkronisasi belum selesai.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/indeks/page.tsx`, `src/app/indikator/page.tsx`, `src/app/temuan/page.tsx` |
| Tampilan | `src/app/dasbor.tsx` (satu komponen untuk tiga tab; berkas beku, hanya boleh menyusut) |
| Data | `src/lib/dasbor-data.ts`, `src/lib/ringkasan.ts`, `src/lib/kerangka-data.ts` |
| Hitungan resmi | `hitungIndeks` dan `predikat` di `src/data/pemdi.ts` |
| Sumber | `data/penilaian.json`, registry `data/dokumen.json`, tabel `pemdi_survei` dan `pemdi_opd` |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Indeks aspek = Σ(bobot indikator × nilai) ÷ bobot aspek; indeks Pemdi = Σ(bobot aspek × indeks aspek). Bukan rata-rata sederhana. | Rumus terbobot | Berlaku (tertulis di kode dan `docs/ARSITEKTUR.md`) |
| 2 | Aspek hanya dihitung bila semua indikatornya bernilai; indeks hanya bila semua aspek terisi. | Hitung hanya saat lengkap | Berlaku (tertulis di kode) |
| 3 | Selama belum lengkap, tampilkan nilai sementara dan jumlah indikator terisi; jangan tampilkan angka rendah palsu. | Label `sementara` | Berlaku (tertulis di kode) |
| 4 | Pembulatan hanya di tampilan; data disimpan apa adanya. | Tidak membulatkan data | Berlaku (tertulis di kode) |
| 5 | Indikator tanpa nilai ditampilkan "–", bukan 1,00. | "–" | Berlaku (tertulis di kode) |
| 6 | Lencana `Estimasi AI` muncul bila ada nilai berpenilai AI. | Lencana tampil | Berlaku (tertulis di kode) |
| 7 | CSV diunduh di browser dari data halaman; tidak ada endpoint ekspor. | CSV sisi klien | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- Ini bukan hasil evaluasi resmi. Nilainya estimasi AI atas dokumen yang ada.
- Satu dokumen menyumbang paling banyak 6 temuan dan 8 angka; dokumen panjang dipotong 14.000
  karakter sebelum dibaca AI.
- Kutipan temuan tidak menunjuk halaman; hanya berkas dan OPD.
- Daftar temuan menampilkan 80 temuan teratas dan 200 angka; daftar penuh ada di halaman Dokumen.
- Peta indikator ke pertanyaan survei adalah tafsir Pemdi-AI, bukan bagian Permen.
- Filter tidak tersimpan di URL; tautan dari halaman lain hanya membuka filter awalnya.
- Bila lakehouse mati, jumlah jawaban survei menjadi nol dan ada pemberitahuan di halaman.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-2-AC1` | Buka `/indeks` sebagai pengguna yang masuk | Indeks, predikat, batang per aspek, poin yang bisa diraih, kebutuhan kurang, dan temuan teratas tampil | Belum dijalankan |
| `FT-2-AC2` | Klik satu batang aspek, lalu kembali | `/indikator?aspek=<n>` terbuka dengan hanya indikator aspek itu | Belum dijalankan |
| `FT-2-AC3` | Pada `/indikator`, klik satu baris, lalu buka tautan Penilaian | Rincian indikator tampil dengan dasar penilaian; `/penilaian?i=<n>` terbuka pada indikator yang sama | Belum dijalankan |
| `FT-2-AC4` | Pada `/temuan`, saring satu OPD dan satu tingkat | Peta panas, daftar temuan, dan daftar angka mengikuti filter; kutipan tampil saat kursor diarahkan | Belum dijalankan |
| `FT-2-AC5` | Unduh CSV dari ketiga tab | Berkas terbuka dengan kolom no, indikator, aspek, bobot, nilai, predikat, penilai, temuan, kebutuhan | Belum dijalankan |
| `FT-2-AC6` | Hapus nilai satu indikator lewat `/penilaian`, lalu buka `/indeks` | Indeks berubah menjadi `sementara` dengan jumlah terisi berkurang; indikator itu menunjukkan "–" | Belum dijalankan |
| `FT-2-AC7` | Buka `/dashboard-pemdi/pemdi` dan satu indikator di dalamnya | Kerangka tampil dengan nilai dan daftar dokumen; jalur yang salah menjadi halaman tidak ditemukan | Belum dijalankan |
| `FT-2-AC8` | Matikan lakehouse, muat ulang `/indeks` (operator) | Pemberitahuan bahwa lakehouse belum dapat dibaca; halaman tidak galat | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
