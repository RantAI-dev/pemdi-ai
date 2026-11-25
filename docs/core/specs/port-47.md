# `PORT-47` Cutover per kelompok route dan hapus kode TS

| | |
| --- | --- |
| Backlog | `PORT-47` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `PORT-46` — kedua backend harus berjalan berdampingan dengan laporan selisih |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

[docs/port/README.md](../../port/README.md) §7-8 menetapkan urutan: baca dulu, lalu tulis, lalu
jalur lama dipensiunkan, dan kode lama dihapus **pada minggu yang sama dengan cutover**. Tanpa aturan
ini, repo berisi dua implementasi untuk waktu lama, dan perubahan fitur masuk ke yang salah
(diperingatkan `docs/port/ledger.md:10-11`: "Tidak ada pekerjaan fitur di modul yang in progress").

Hari ini semuanya masih `todo`. `PORT-46` memberi angka pembanding; `PORT-47` memakai angka itu
untuk memindahkan lalu lintas dan menghapus kode.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Satu-satunya perbedaan yang mungkin terasa: backend lebih ringan
(target memori setengah, image < 100 MB — `docs/port/README.md` §0), dan route yang sudah cutover
tidak lagi bergantung pada proses Next.

## Rancangan

Kelompok dan urutannya (satu kelompok satu PR; jangan gabung):

| # | Kelompok | Route | Setelah cutover, dihapus |
| --- | --- | --- | --- |
| 1 | Baca data | `GET /api/halaman/*`, `GET /api/dokumen`, `GET /api/upload`, `GET /api/upload/status` | `src/app/api/dokumen/route.ts` (bagian GET), `src/app/api/upload/route.ts` (GET), `src/app/api/upload/status/route.ts`, `src/lib/ringkasan.ts`, `dasbor-pemdi.ts`, `kerangka-data.ts`, `kerangka-dokumen.ts`, `dasbor-data.ts` |
| 2 | Sesi | `POST /api/login`, `POST /api/logout` | `src/app/api/login/route.ts`, `src/app/api/logout/route.ts`, `src/lib/auth.ts`, `src/lib/users.ts` (kecuali yang dipakai `src/proxy.ts`) |
| 3 | Baca lakehouse & AI | `POST /api/ask`, `POST /api/penilaian/ai`, `POST /api/makro/narasi` | `src/app/api/ask/route.ts`, `src/app/api/penilaian/ai/route.ts`, `src/app/api/makro/narasi/route.ts`, `src/lib/tables.ts`, `user-tables.ts`, `data.ts`, `estimasi.ts` |
| 4 | Tulis | `POST /api/penilaian`, `POST /api/upload`, `POST /api/upload/ingest`, `POST /api/dokumen`, `GET /api/dokumen/{id}/berkas` | route sisanya, `src/lib/store.ts`, `penilaian.ts`, `proses.ts`, `sinkron.ts`, `dokumen.ts`, `intake.ts`, `kebutuhan.ts`, `bukti.ts` |

Aturan per kelompok:

1. **Prasyarat angka.** `scripts/shadow-report.sh 7` mencetak `0 selisih` untuk semua route kelompok
   itu selama **7 hari berturut-turut**, dengan volume permintaan wajar (minimal 50 permintaan per
   route per minggu; bila kurang, tunggu). Laporan ditempel di PR.
2. **Pindahkan lalu lintas.** Tambah route ke `PORTED_API`, rilis (`scripts/portainer.sh build` +
   `stack`), lalu amati 24 jam: `scripts/shadow-report.sh 1` tetap 0 selisih, dan tidak ada 5xx baru
   di log `api`. Untuk kelompok tulis, `PEMDI_API_READONLY` dimatikan **hanya** untuk proses yang
   memegang route itu, dan route tulis TS dikeluarkan dari `PORTED_API` pada saat yang sama
   (tidak ada dua penulis).
3. **Hapus kode lama minggu itu juga.** Hapus berkas di kolom terakhir tabel, jalankan
   `git grep -n '<nama simbol>'` sampai kosong, `bun run typecheck`, `scripts/check.sh` PASS.
   Jangan menghapus `src/data/*` yang masih dipakai UI, `src/lib/*-tampil.ts`, atau `src/proxy.ts`
   (halaman masih dijaga proxy sampai `FE-5`).
4. **Ledger dan backlog.** Baris ledger tiap modul → `cut over`, lalu `old code deleted`; baris
   backlog `PORT-47` → Done hanya setelah keempat kelompok selesai.

Rollback: dalam 7 hari setelah cutover, kembalikan route ke TS dengan menghapus dari `PORTED_API`
dan merilis ulang image `app` tag sebelumnya (simpan 5 tag terakhir). Setelah kode TS dihapus,
rollback berarti mengembalikan commit penghapusan, bukan mengaktifkan kembali route — karena itu
penghapusan dilakukan **setelah** 7 hari, bukan bersamaan dengan pemindahan lalu lintas.

## Kriteria penerimaan

- [ ] Empat PR (satu per kelompok), masing-masing: laporan `0 selisih` 7 hari, transkrip 24 jam
      sesudah cutover, dan `git diff --stat` yang menunjukkan berkas TS terhapus.
- [ ] Setelah kelompok 4: `git grep -nE 'from "@/lib/(store|penilaian|proses|sinkron|dokumen|intake|kebutuhan|bukti|tables|user-tables|data|estimasi|ringkasan|dasbor-pemdi|kerangka-data|kerangka-dokumen|dasbor-data)"' src/app` kosong.
- [ ] `git grep -n 'api/upload\|api/dokumen\|api/penilaian\|api/ask\|api/login\|api/sumber' src/app -- '*route.ts'` kosong.
- [ ] `bun run typecheck` lulus; `scripts/check.sh` PASS di setiap PR.
- [ ] Baris ledger semua modul §2–§4 berstatus `old code deleted`; `differences.md` memuat setiap
      perbedaan yang ditemukan selama bayangan.
- [ ] Ukuran image dan RAM backend dicatat di PR kelompok 4 dan dibandingkan dengan baseline
      `PORT-0` (`docs/port/README.md` §0).

## Yang tidak dikerjakan

Konvensi respons baru (`PORT-48`), pembersihan idiomatik Rust (`adopt-guidelines`), penghapusan
`src/lib` yang masih dipakai halaman (`FE-12`, setelah `FE-5`), dan alat build data `scripts/*`
(`DEC-4`).
