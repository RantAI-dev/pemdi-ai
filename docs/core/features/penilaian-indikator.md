# Penilaian indikator

Halaman penilaian tingkat kematangan 20 indikator (`/penilaian`): usulan AI, koreksi manual, dan
dasar penilaiannya.

| | |
| --- | --- |
| Modul | Indeks Pemdi |
| Backlog | `FT-10` di [BACKLOG.md](../BACKLOG.md) |
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

Nilai AI tidak boleh dipakai tanpa dasar yang bisa dibaca, dan penilai manusia harus bisa
mengoreksinya tanpa takut ditimpa proses otomatis. Sebelum halaman ini, nilai hanya bisa diubah
dengan menyunting berkas data.

## Yang bisa dilakukan pengguna

1. Memilih indikator dari daftar per aspek; daftar menunjukkan nilai dan apakah nilainya estimasi AI,
   manual, atau belum ada.
2. Melihat indeks sementara, jumlah indikator dinilai, indeks aspek, dan sumbangan indikator yang
   dipilih.
3. Mengisi nilai 1,00–5,00 dengan penggeser atau angka; predikat dan pita skalanya tampil langsung.
4. Membaca kriteria Permen tiap tingkat dan menandai tingkat saat ini serta tingkat berikutnya.
5. Membaca bukti dalam empat tab: temuan dokumen, kebutuhan data, jawaban survei, dan berkas.
6. Meminta estimasi AI untuk indikator itu, membaca dasar dan kekurangannya, lalu memakai atau
   mengabaikannya.
7. Menyimpan nilai dan penjelasan, atau menghapus nilai.
8. Melihat status penyalinan nilai ke lakehouse.
9. Berpindah ke indikator sebelumnya atau berikutnya tanpa kembali ke daftar.

## Tidak termasuk

- Mengesahkan atau mengunci nilai. Tidak ada alur persetujuan.
- Mencatat siapa mengubah nilai dan kapan (selain waktu perubahan).
- Mengubah kriteria Permen.
- Menilai lebih dari satu indikator sekaligus.

## Bertanya ke AI Tubaba

Bisa untuk membaca hasil, misalnya "tampilkan nilai 20 indikator, urut dari yang terendah".
Mengubah nilai lewat AI Tubaba tidak bisa; jalurnya hanya SQL baca.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/penilaian/page.tsx` |
| Tampilan | `src/app/penilaian/penilaian.tsx` |
| API | `src/app/api/penilaian/route.ts` (baca/simpan), `src/app/api/penilaian/ai/route.ts` (usulan) |
| Simpan | `src/lib/penilaian.ts` (`data/penilaian.json`) |
| Usulan AI | `src/lib/estimasi.ts`; bukti dari `src/lib/bukti.ts`, `src/lib/kebutuhan.ts`, `data/dokumen.json` |
| Kriteria & rumus | `src/data/pemdi.ts`, `src/data/permen-kriteria.json` |
| Salinan | `src/lib/sinkron.ts` ke tabel `pemdi_penilaian` |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Nilai manual tidak pernah ditimpa estimasi AI otomatis. Estimasi hanya mengisi indikator yang belum punya nilai manual. | Manual menang | Berlaku (tertulis di kode) |
| 2 | Usulan AI tidak disimpan sampai pengguna menekan "Pakai estimasi ini" lalu "Simpan". | Dua langkah | Berlaku (tertulis di kode) |
| 3 | Nilai di luar 1,00–5,00 ditolak; nilai dibulatkan dua desimal. | Rentang 1–5 | Berlaku (tertulis di kode) |
| 4 | Indikator tanpa temuan dan tanpa jawaban survei tidak diberi usulan AI; pengguna diberi alasan. | Tanpa usulan | Berlaku (tertulis di kode) |
| 5 | Indikator tanpa bukti sama sekali memakai nilai 1,00 dengan alasan tertulis saat estimasi massal berjalan. | Nilai dasar 1,00 | Berlaku (tertulis di kode) |
| 6 | Indeks dihitung kode, bukan model; model hanya mengusulkan nilai per indikator. | Kode menghitung | Berlaku (tertulis di kode dan `docs/ARSITEKTUR.md`) |

## Batasan yang disampaikan ke pengguna

- Usulan AI bisa keliru; selalu baca dasar dan kekurangannya sebelum menyimpan.
- Ini bukan hasil evaluasi resmi dan tidak menggantikan asesor.
- Belum ada catatan audit siapa menilai; hanya waktu perubahan yang tersimpan.
- Menghapus nilai mengeluarkan indikator itu dari indeks sampai dinilai lagi.
- Bila lakehouse tidak terbaca, tab bukti menampilkan peringatan, tetapi penyimpanan nilai tetap
  berjalan.
- Penyalinan ke lakehouse berjalan di latar belakang; kegagalannya tampil sebagai pesan, bukan
  membatalkan nilai yang sudah disimpan.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-10-AC1` | Buka `/penilaian?i=5`, ubah nilai, lalu simpan | Nilai dan predikat berubah; chip "Belum disimpan" hilang; waktu perubahan tampil | Belum dijalankan |
| `FT-10-AC2` | Isi nilai 6 lalu simpan | Ditolak dengan pesan bahwa nilai harus antara 1,00 dan 5,00 | Belum dijalankan |
| `FT-10-AC3` | Tekan "Estimasi AI" pada indikator yang punya bukti | Usulan tampil dengan jumlah temuan, jawaban survei, dan dokumen yang belum ada; belum tersimpan | Belum dijalankan |
| `FT-10-AC4` | Tekan "Estimasi AI" pada indikator tanpa bukti | Pesan bahwa AI tidak punya dasar untuk menilai; tidak ada nilai yang tersimpan | Belum dijalankan |
| `FT-10-AC5` | Pakai estimasi, simpan, lalu proses ulang dokumen (operator) | Nilai berlabel AI boleh diperbarui; nilai manual pada indikator lain tidak berubah | Belum dijalankan |
| `FT-10-AC6` | Simpan nilai manual, lalu jalankan estimasi massal lewat `POST /api/dokumen` (operator) | Nilai manual tidak ditimpa | Belum dijalankan |
| `FT-10-AC7` | Hapus nilai satu indikator | Nilai hilang dari daftar; indeks menjadi sementara dengan jumlah terisi berkurang | Belum dijalankan |
| `FT-10-AC8` | Baca tab Temuan, Kebutuhan, Survei, dan Berkas | Tiap tab memuat bukti indikator itu, atau pesan kosong yang jelas | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
