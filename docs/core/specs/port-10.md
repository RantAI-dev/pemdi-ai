# `PORT-10` `seri` dan `terkini` (makro-hitung)

| | |
| --- | --- |
| Backlog | `PORT-10` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | tidak ada — `PORT-1` sudah parity green; tipe `NilaiMakro` dibuat di task ini |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/makro-hitung.ts` (72 baris) baru diporting sebagian. `laju`, `lajuBaik`, `capaian`, dan
`kategori` sudah ada di `rust/crates/pemdi-domain/src/makro.rs` (lihat komentar baris 2 berkas itu:
"`seri` and `terkini` wait for the `NilaiMakro` contract"). Dua fungsi sisanya masih hanya di
TypeScript:

- `seri` (`src/lib/makro-hitung.ts:40-51`): filter `indikator`, `wilayah`, `jenis`, `komponen`,
  urut naik menurut `tahun`, lalu petakan ke `{tahun, nilai, n}`.
- `terkini` (`:58-72`): realisasi terakhir ≤ `tahun`; target tahun itu, jika tidak ada target
  terakhir ≤ `tahun`; `lalu` hanya bila realisasi tahun `realisasi.tahun - 1` ada.

Keduanya dipakai dasbor makro (`src/components/makro-halaman.tsx`, `src/lib/makro-tampil.ts:18`),
dan akan dipanggil use case `PORT-32`/`PORT-44`/`PORT-45`. Tanpa port ini, dasbor makro tidak bisa
pindah ke Rust.

Perilaku yang harus tetap: `sort` di JavaScript **stabil**, jadi dua baris dengan `tahun` sama
mempertahankan urutan berkas; `terkini` mengambil `[0]` dari hasil urut menurun, yaitu baris pertama
di antara tahun yang sama. `realisasi`/`target`/`lalu` yang tidak ada **tidak ditulis** ke JSON
(`JSON.stringify` membuang `undefined`), sehingga `terkini` bisa menghasilkan `{}`.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Grafik dan kartu Kinerja Makro nanti menampilkan titik dan target
yang sama persis dengan hari ini, termasuk tahun yang berulang di data BPS.

## Rancangan

- `rust/crates/pemdi-domain/src/makro.rs`: tambah tipe polos tanpa serde — `SlugMakro` (enam nilai
  dari `src/lib/makro.ts:11`), `Wilayah` (`tubaba`, `lampung`, `nasional`), `Jenis` (`realisasi`,
  `target`), `NilaiMakro` (field `src/lib/makro.ts:35-49`, `komponen`/`halaman`/`catatan` sebagai
  `Option`), lalu `seri(&[NilaiMakro], indikator, wilayah, jenis, komponen: Option<&str>) ->
  Vec<TitikSeri>` dan `terkini(&[NilaiMakro], indikator, tahun) -> Terkini`.
- `rust/crates/pemdi-contracts/src/makro.rs`: bentuk kabel `NilaiMakro` (serde, camelCase,
  `skip_serializing_if = "Option::is_none"` untuk `komponen`/`halaman`/`catatan`), dan `Terkini`
  dengan tiga `Option` yang di-skip saat `None`. Konversi kabel → domain di `pemdi-app`.
- Urut: `sort_by` (stabil). Jangan `sort_unstable_by`: pada tahun kembar hasilnya bisa berbeda.
- Oracle: entri `makro-seri` di `scripts/oracle/modules.ts` dengan `seri` dan `terkini`; generator
  di `scripts/oracle/cases.ts` membangkitkan `nilai` berisi: tahun kembar, `komponen: null` dan
  string, target hanya di tahun lebih lambat, target di tahun yang diminta, tanpa target sama
  sekali, indikator/wilayah lain, larik kosong, dan `tahun` di luar rentang data.
- Berkas kasus `tests/parity/makro-seri.cases`; test
  `rust/crates/pemdi-domain/tests/parity_makro_seri.rs` (pola `same`/`number` sama dengan
  `parity_makro.rs:35-58`, termasuk aturan D-1).
- Daftar "what differs": urutan stabil; `undefined` vs kunci hilang (di atas); angka JSON D-2
  (`tahun` integer, `nilai` desimal); tidak ada pembulatan di kedua fungsi, jadi pembulatan hanya
  soal representasi; tidak ada Map, teks, regex, atau tanggal.

## Kriteria penerimaan

- [ ] `tests/parity/makro-seri.cases` ≥ 200 kasus, termasuk 20 kasus tahun kembar dan 10 kasus
      `terkini` yang menghasilkan `{}`.
- [ ] `cargo test -p pemdi-domain --test parity_makro_seri` lulus; `bun scripts/oracle/unseen.sh
      makro-seri 777` lulus (`PORT-2`).
- [ ] Kasus yang membuktikan urutan stabil: dua baris `tahun: 2024` dengan `nilai` berbeda, hasil
      `seri` mempertahankan urutan masukan.
- [ ] Baris ledger `PORT-10` berstatus **parity green**, kolom case file terisi
      `tests/parity/makro-seri.cases`; perbedaan (bila ada) di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Memuat `src/data/makro/nilai.json` (itu `PORT-23`) dan endpoint narasi/grafik (`PORT-44`,
`PORT-45`); kasus dengan `NaN`/`Infinity` tidak dibuat karena `nilai.json` dihasilkan
`scripts/makro-bangun.ts` dan tidak pernah memuatnya.
