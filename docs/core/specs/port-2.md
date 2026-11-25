# `PORT-2` `scripts/oracle/unseen.sh`: kasus yang belum dilihat worker

| | |
| --- | --- |
| Backlog | `PORT-2` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

[docs/port/README.md](../../port/README.md) §5 mewajibkan reviewer menjalankan port pada kasus yang
belum dilihat worker, tetapi langkahnya masih manual dan setengah jalan:

- `bun scripts/oracle/cases.ts <modul> 777 /tmp/unseen.cases` menulis berkas
  (`scripts/oracle/cases.ts:12`), tetapi test paritas membaca berkas tetap lewat
  `include_str!("../../../../tests/parity/makro-hitung.cases")`
  (`rust/crates/pemdi-domain/tests/parity_makro.rs:13`). Tidak ada cara memberi berkas lain tanpa
  menyunting test.
- `tests/parity/` dan `rust/crates/*/tests/parity_*` ada di `.agents/protected-paths`. Worker
  dilarang menyuntingnya, jadi solusinya tidak boleh berupa perubahan test.
- Generator hanya punya satu modul (`GEN` di `scripts/oracle/cases.ts:25` berisi
  `"makro-hitung"`). Modul lain keluar dengan `cases: no generator for "<modul>"` dan kode 2
  (`:42-45`).

Akibatnya reviewer hari ini menyalin berkas ke `tests/parity/`, menjalankan `cargo test`, lalu
berharap `git checkout` mengembalikannya. Satu `Ctrl-C` meninggalkan pohon kotor berisi kasus yang
tidak pernah ditinjau.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Reviewer mendapat satu perintah yang menjawab "port ini sama
dengan kode lama juga untuk kasus yang tidak dilihat penulisnya", dengan pohon git tetap bersih.

## Rancangan

Satu skrip baru, `scripts/oracle/unseen.sh <modul> [seed] [--keep]`, tanpa dependensi baru:

1. `seed` default `$(date +%s)`. Berkas kerja `/tmp/pemdi-unseen/<modul>-<seed>.cases`.
2. Panggil `bun scripts/oracle/cases.ts <modul> <seed> <berkas-kerja>`; biarkan kode 2 dan pesan
   `cases: no generator` naik apa adanya.
3. Jalankan test paritas modul itu dengan `PARITY_CASES=<berkas-kerja>`. Setiap test paritas
   membaca case file dari variabel itu bila ada (contoh: `parity_makro.rs`, fungsi `cases()`),
   jadi berkas yang di-commit tidak pernah disentuh. Petakan modul → crate/test di satu tempat
   (`makro-hitung` → `cargo test -p pemdi-domain --test parity_makro`).
4. Cetak satu baris hasil:
   `unseen: <modul> seed=<seed> kasus=<n> hasil=PASS` (atau `FAIL`, dengan 5 baris pertama
   kegagalan dari cargo). `--keep` menyimpan berkas kerja dan menyebut path-nya; tanpa itu berkas
   dihapus.
5. Keluar dengan status cargo.

Sudah dicoba planner pada 2026-11-25: `PARITY_CASES=/tmp/unseen.cases cargo test -p pemdi-domain
--test parity_makro` dengan seed 777 → lolos.

Tambahan dokumentasi: ganti baris "(Langkah ini akan dijadikan skrip `scripts/oracle/unseen.sh`,
backlog `PORT-2`.)" di `docs/port/README.md:89` dengan perintahnya. `docs/port/README.md` bukan path
terlindungi.

Daftar "What differs between languages" yang relevan untuk skrip ini: tidak ada hitungan, jadi
tidak ada pembulatan atau urutan. Yang dijaga hanya: jumlah kasus dilaporkan, dan berkas dipulihkan
walau gagal.

## Kriteria penerimaan

- [ ] `scripts/oracle/unseen.sh makro-hitung 777` mencetak `kasus=452` (atau lebih) dan
      `hasil=PASS`; sesudahnya `git status --porcelain tests/parity` kosong.
- [ ] Seed berbeda menghasilkan berkas berbeda: jalankan `--keep` dengan 777 dan 778, `cmp` kedua
      berkas gagal (berbeda).
- [ ] Seed yang sama menghasilkan berkas identik: dua kali `--keep` dengan 777, `cmp` lulus.
- [ ] `scripts/oracle/unseen.sh tidak-ada` keluar 2 dengan pesan `cases: no generator`.
- [ ] Uji pemulihan: hentikan dengan `Ctrl-C` saat cargo berjalan; `git status --porcelain
      tests/parity` tetap kosong.
- [ ] `bash -n scripts/oracle/unseen.sh` bersih.
- [ ] `docs/port/README.md` §5 menyebut skrip ini; tidak ada teks "akan dijadikan skrip".
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Generator untuk modul yang belum punya entri di `GEN`; itu milik spec masing-masing (mis.
`PORT-11`, `PORT-14`). Menjalankan `unseen.sh` sebagai bagian gate (butuh waktu cargo dan bukan
keputusan worker).
