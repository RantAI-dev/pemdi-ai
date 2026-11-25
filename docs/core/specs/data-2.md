# `DATA-2` Sinkronkan angka Makro dan SPM ke lakehouse

| | |
| --- | --- |
| Backlog | `DATA-2` di [BACKLOG.md](../BACKLOG.md) |
| Module | Data |
| Size | M |
| Blocked by | tidak ada untuk kode; memuat ke lakehouse butuh lakehouse hidup (`scripts/lakehouse.sh up`) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

AI Tubaba tidak bisa menjawab pertanyaan tentang angka Makro dan SPM, dan itu tertulis sebagai
batasan: `docs/core/features/kinerja-makro.md:52` dan `capaian-spm.md:49` ("Tabel belum
disinkronkan ke lakehouse"). Angkanya sudah ada di repo — 148 baris Makro (`src/data/makro/nilai.json`
plus target RPJMD di `src/data/makro/rpjmd.json`) dan 219 baris SPM (`src/data/spm/nilai.json`) —
tetapi tidak ada tabelnya di lakehouse, jadi tidak ada di konteks skema yang dikirim ke kopilot
(`src/lib/tables.ts:179`). Yang disinkronkan hari ini hanya tabel pipeline di `src/lib/sinkron.ts:42-84`
(dokumen, temuan, metrik, kebutuhan, penilaian); tidak ada satu pun tabel angka daerah.

## Yang didapat pengguna

"Berapa IPM Tulang Bawang Barat 2025 dan targetnya?" dijawab 70,61 dan target 70,46, beserta SQL
yang bisa diperiksa — sama dengan dasbor Makro. "Indeks SPM bidang kesehatan 2025?" dijawab 79,54.

## Rancangan

### Satu tabel, bukan dua

Konteks skema dibatasi 6.000 karakter oleh lakehouse (`src/lib/tables.ts:168`, `CONTEXT_MAX =
5900`). Hari ini `schemaContext()` 5.401 karakter untuk 12 tabel, jadi tersisa ± 499. Dua tabel baru
(Makro dan SPM) tidak muat; satu tabel bentuk panjang muat.

Entri baru di `src/lib/tables.ts`:

```ts
{
  name: "tbb_indikator_daerah",
  about: "Angka resmi daerah: indikator Makro (BPS/RPJMD) dan capaian SPM per layanan, per tahun dan wilayah.",
  columns: {
    kelompok: "'makro' atau 'spm'",
    kunci: "slug indikator makro, atau id layanan SPM",
    nama: "nama indikator atau layanan",
    bidang: "bidang SPM 1-6; kosong untuk makro",
    komponen: "komponen indikator (mis. UHH, HLS); kosong bila tidak ada",
    wilayah: "tubaba, lampung, atau nasional",
    tahun: "2020-2029",
    jenis: "realisasi/target (makro) atau capaian/indeks (spm)",
    nilai: "angka sebagai teks",
    satuan: "%, indeks, tahun, rupiah, ...",
    sumber: "id sumber, mis. bps-tubaba-dalam-angka-2026",
    halaman: "halaman di PDF sumber",
    terverifikasi: "'ya'/'tidak' — belum dicek Bappeda (lihat DATA-1)",
  },
},
```

Nama berawalan `tbb_` karena ini angka resmi daerah, seperti `tbb_dalam_angka`; `pemdi_` dipakai
untuk tabel pipeline Pemdi.

### Pembangun baris yang murni

Berkas baru `src/lib/sinkron-daerah.ts`, tanpa I/O:

```ts
export function barisIndikatorDaerah(makro: DataMakro, spm: DataSpm): Record<string, unknown>[];
```

- Makro: satu baris per `NilaiMakro` dari `makro.nilai` + `makro.target` (target RPJMD ikut, dengan
  `jenis: "target"`), `nama` = `IndikatorMakro.nama`, `bidang` = `""`, `komponen` dari nilai itu.
- SPM: satu baris per `NilaiSpm` dari `spm.nilai`, `kunci` = `layanan ?? bidang ?? "kabupaten"`,
  `nama` = judul layanan/bidang dari kerangka (`src/lib/spm.ts`), `komponen` = `""`.
- `nilai` selalu `String(nilai)`; kolom lain `String(x ?? "")` — semua kolom teks karena tabel bronze
  dimuat sebagai CSV (`src/lib/tables.ts:183`). `terverifikasi`: `"ya"` hanya bila
  `n.terverifikasi === true`, selain itu `"tidak"`.

`src/lib/sinkron.ts` memanggilnya di `semuaTabel()`:

```ts
tbb_indikator_daerah: barisIndikatorDaerah(await muatMakro(), await muatSpm()),
```

dengan `muatMakro` dari `src/lib/makro.ts:127` dan `muatSpm` dari `src/lib/spm.ts:89`. `run()` sudah
melewati tabel tanpa baris dan mengganti seluruh isi tabel (`src/lib/sinkron.ts:91-95`).

### Konteks skema harus tetap muat

Setelah entri baru, `schemaContext().length` harus ≤ 5900. Bila lebih, pendekkan `about`/kolom tabel
terpanjang (`pemdi_data_statistik` 658 karakter, `pemdi_dokumen` 587, `pemdi_kebutuhan` 570) —
**jangan** menaikkan `CONTEXT_MAX`: 6.000 adalah batas lakehouse.

### Test

- `src/lib/sinkron-daerah.test.ts`: satu baris Makro + satu baris SPM contoh; kunci objeknya persis
  sama dengan definisi `tbb_indikator_daerah` di `TABLES` (ambil dengan `find`, gagalkan test bila
  `undefined` — tanpa `!`, dilarang `FE-3`); `nilai` string; `terverifikasi` `"ya"` hanya untuk baris
  bertanda true; baris target RPJMD ikut keluar.
- `src/lib/tables.test.ts`: setiap `name` unik, `tableRef` sah, dan `schemaContext().length <= 5900`
  — test ini yang menahan godaan menambah tabel ke-14 nanti.

## Kriteria penerimaan

- [ ] `bun test src/lib/sinkron-daerah.test.ts src/lib/tables.test.ts` lulus.
- [ ] `schemaContext()` memuat `tbb_indikator_daerah` dan panjangnya ≤ 5900; lampirkan keluaran
      `bun -e 'import {schemaContext} from "./src/lib/tables"; console.log(schemaContext().length)'`.
- [ ] Muat nyata di lakehouse lokal/staging: `bun run scripts/seed.ts`, lalu
      `SELECT count() FROM <db>.\`bronze.tbb_indikator_daerah\`` → **367** baris (148 + 219).
- [ ] Transkrip AI Tubaba di `/tanya`: "Berapa IPM Kabupaten Tulang Bawang Barat tahun 2025 dan
      target RPJMD-nya?" → 70,61 dan 70,46 dengan SQL yang menyebut `tbb_indikator_daerah`; satu
      pertanyaan SPM "Indeks SPM bidang kesehatan 2025?" → 79,54.
- [ ] Tangkapan layar jawaban itu (grafik/tabel + SQL) di badan PR.
- [ ] `docs/core/features/kinerja-makro.md:50-53` dan `capaian-spm.md:47-50` diperbarui: batasan
      "belum disinkronkan" diganti kalimat bahwa angkanya bisa ditanya lewat AI Tubaba.
- [ ] `bun run typecheck` lulus dan `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- Memuat angka `DATA-1` yang belum diverifikasi; kolom `terverifikasi` membuat AI bisa menyebutnya.
- Tabel PROSN: kerangkanya masih di `src/data/kerangka/prosn.ts` (1.056 baris, dibekukan) dan
  `muatProsn` belum ada di jalur sinkron; tunggu `DEC-6`.
