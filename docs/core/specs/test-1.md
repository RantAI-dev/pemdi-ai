# `TEST-1` Test karakterisasi TypeScript untuk hitungan yang belum diporting

| | |
| --- | --- |
| Backlog | `TEST-1` di [BACKLOG.md](../BACKLOG.md) |
| Module | Platform |
| Size | S (hari) |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Tidak ada satu pun `*.test.ts` di repo ini: `git ls-files '*.test.ts'` kosong, dan karena itu
`scripts/check.sh:33` melewati langkah `bun test` (`git ls-files '*.test.ts' … | grep -q . && bun test
|| true`). Artinya `typecheck` adalah satu-satunya penjaga angka di UI.

Tiga modul yang akan disentuh pekerja frontend sesudah ini:

- `src/lib/makro-hitung.ts` (72 baris): `laju` :9, `lajuBaik` :14, `capaian` :23, `kategori` :31,
  `seri` :40, `terkini` :58.
- `src/lib/spm-hitung.ts` (79 baris): `dariBaris` :18, `capaianLayanan` :34, `capaianBidang` :44,
  `kategoriSpm` :62, `seriLayanan` :73.
- `src/data/pemdi.ts` (153 baris): `predikat` :56, `hitungIndeks` :80 (termasuk `sementara` dan
  `terisi`), `indikatorUntukKode` :151.

`FE-3` menghapus 47 non-null assertion dan `FE-7` menggabungkan pembulatan angka. Keduanya bisa
mengubah keluaran tanpa gate yang menangkapnya.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Angka indeks, capaian SPM, dan laju makro dijamin tidak bergeser
selama frontend dirapikan dan backend diporting.

## Rancangan

Tiga berkas test baru, semuanya di samping modulnya (kebiasaan repo: `bun test <berkas>.test.ts`):

1. `src/lib/makro-hitung.test.ts` — baca `tests/parity/makro-hitung.cases` (452 baris, sudah ada,
   dibangkitkan oracle, **dibaca saja, jangan disunting**). Setiap baris `{"fn":…,"args":[…]}` dan
   hasil `=> <json>` dijalankan ke fungsi TypeScript yang sama; nilai dibandingkan sebagai angka
   (`1 === 1.0`, `0 === -0`) dan `NaN`/`Infinity` sebagai string, persis aturan D-1 di
   [differences.md](../../port/differences.md). Ini memberi 452 asersi tanpa menulis ulang harapan.
2. `src/lib/spm-hitung.test.ts` — tabel kasus tangan: `capaianLayanan` dengan hanya `sasaran`,
   hanya `terlayani`, keduanya, `sasaran` 0 dan negatif, beberapa baris `capaian` (rata-rata),
   fallback `tubaba` → semua wilayah; `capaianBidang` dengan dan tanpa baris `indeks`;
   `kategoriSpm` pada 89,999 / 90 / 99,999 / 100; `seriLayanan` pada tahun ganda dan kosong.
3. `src/data/pemdi.test.ts` — `hitungIndeks` untuk: 20 indikator terisi, kosong (`indeks: null`,
   `sementara: null`), satu aspek penuh dan aspek lain kosong (nilai sementara per aspek), satu
   indikator saja, nilai 1 dan 5; `predikat` pada 0,9999 / 1 / 1,4999 / 1,5 / 2,5 / 3,5 / 4 / 5 /
   5,0001; `indikatorUntukKode` untuk ke-38 pola di `KODE_INDIKATOR` (:110-149) plus kode tak dikenal.

Aturan penulisan: tanpa `any` (ratchet `ts-any` tidak boleh naik), tanpa `@ts-ignore`, tanpa impor
dari `@/app/*` atau React. Harapan ditulis sebagai literal, bukan `toMatchSnapshot`, supaya
perubahannya terbaca di diff.

`bun test` otomatis ikut gate setelah berkas pertama ada; tidak perlu menyunting `scripts/check.sh`
(path terlindungi).

**Tipe `bun:test`.** `tsc` hari ini menolak `import { test } from "bun:test"` (TS2307, dicoba
planner 2026-11-25), karena `@types/bun` belum ada. Tambahkan `@types/bun` sebagai devDependency
(butuh persetujuan owner, tulis di PR) dan masukkan ke `compilerOptions.types` bila perlu; tanpa
itu test pertama membuat gate merah. Sejak 2026-11-25 `scripts/check.sh` menjalankan `bun test`
begitu ada berkas `*.test.ts` dan **gagal bila test gagal** (bug lama `|| true` sudah diperbaiki).

## Kriteria penerimaan

- [ ] `bun test src/lib/makro-hitung.test.ts` melaporkan ≥ 452 asersi lulus dan 0 gagal.
- [ ] `bun test` (semua berkas) lulus; `scripts/check.sh --part ts` mencetak jumlah test yang sama.
- [ ] Uji negatif: ubah sementara `0.15` → `0.16` pada `ASPEK` aspek 3 di `src/data/pemdi.ts`,
      `bun test src/data/pemdi.test.ts` GAGAL; kembalikan.
- [ ] Uji negatif: ubah sementara `>= 91` → `>= 92` di `src/lib/makro-hitung.ts:32`, test
      `kategori` GAGAL; kembalikan.
- [ ] `git grep -c 'any' -- '*.test.ts'` nol; ratchet `ts-any` dan `ts-suppress` tidak naik
      (`scripts/ratchet.sh` sebelum dan sesudah).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Test untuk komponen React dan route handler (butuh runtime Next; tidak ada di gate hari ini), dan
test untuk `seri`/`terkini` yang butuh data makro asli (ditempel di `PORT-10` lewat oracle). Test
karakterisasi UI per halaman milik `FE-5`.
