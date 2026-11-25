# `PORT-15` `prosn-hitung`

| | |
| --- | --- |
| Backlog | `PORT-15` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | tidak ada — tipe `IndikatorProsn`/`PenilaianProsn` dibuat di task ini |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/prosn-hitung.ts` (92 baris) menghitung skor dukungan PROSN. Tiga hal di dalamnya mudah
berubah saat diporting:

- `skor` (`:51-66`): `nilai` dijumlah hanya untuk `kriteria !== null`, sedangkan `maks` menjumlah
  bobot **semua** indikator dalam saringan; tiga pembulatan `Math.round(x*100)/100` di `:63` dan
  `:65`.
- `nilai += p.nilai ?? 0` (`:60`): penilaian dengan `kriteria` terisi tetapi `nilai: null` menambah
  0.
- Penilaian disimpan di `Map` (`:53`): bila ada dua baris dengan `indikator` sama, **yang terakhir
  menang**; `indikator` yang tidak dikenal diabaikan.
- `belumAdaBukti` (`:89-92`) memakai `Set` id berkriteria `null`, lalu menyaring larik indikator
  (urutan kerangka).
- Sumber sengaja tidak konsisten: nilai kriteria a indikator A-1-7 adalah 2,00 padahal bobotnya 1,50
  (komentar `:10-14`). Capaian satu indikator karena itu bisa melewati 100% dan **tidak boleh
  dipangkas**.

`src/lib/prosn-tampil.ts` memanggil fungsi-fungsi ini di setiap kartu halaman PROSN (disembunyikan
sementara oleh `TAMPIL_PROSN=false`, `src/lib/fitur.ts:4`, tetapi angkanya harus tetap benar untuk
`DEC-6`).

## Yang didapat pengguna

Tidak ada yang berubah di layar. Saat PROSN ditampilkan nanti, skor per kelompok dan per program
sama dengan penilaian hari ini, termasuk capaian di atas 100% yang memang berasal dari sumber.

## Rancangan

- `rust/crates/pemdi-domain/src/prosn.rs`: `IndikatorProsn` polos (field `src/lib/prosn.ts:38-58`,
  `bobot` sudah dalam poin 0–100), `PenilaianProsn` (`kriteria: Option<KodeKriteria>`,
  `nilai: Option<f64>`), `Saringan { kelompok: Option<&str>, program: Option<&str> }`, `SkorProsn`,
  `KategoriProsn`, dan `skor`, `kategori_prosn`, `belum_ada_bukti`.
- Pembulatan: satu helper `js_round(x) = (x + 0.5).floor()` untuk nilai non-negatif, dengan
  komentar mengapa bukan `f64::round` (JS membulatkan setengah ke arah +∞; Rust menjauhi nol).
  `skor` hanya menghasilkan nilai ≥ 0, tetapi helper diuji juga pada −0,5 dan −1,5 untuk
  memastikan perilakunya terdokumentasi.
- `Map` diganti `HashMap` untuk pencarian + satu larik urutan, atau `BTreeMap`; yang wajib adalah
  semantik "terakhir menang". Tulis sebagai: iterasi `penilaian` berurutan, `insert` ke map, jadi
  duplikat terakhir menimpa.
- `maks` dibulatkan setelah penjumlahan (`js_round(total * 100) / 100`), bukan per bobot.
- Oracle: modul `prosn-hitung` dengan `skor`, `kategoriProsn`, `belumAdaBukti`; generator:
  himpunan indikator 1–12 dengan bobot 0,5–2,0, penilaian sebagian, `kriteria: null`,
  `nilai: null` dengan kriteria terisi, id ganda, id asing, saringan kelompok saja/program
  saja/keduanya, dan indikator kosong (`maks: 0`, `capaian: 0`).
- Tepi pembulatan: nilai yang menghasilkan `x,xx5` (mis. 2,675; 0,005; 1,005) dan `-0`.
- Daftar "what differs" yang berlaku:
  - **Pembulatan** (di atas) — inti modul ini.
  - **Map order:** duplikat "terakhir menang"; `belumAdaBukti` mengikuti urutan larik indikator.
  - **`null` vs `undefined`:** `p.nilai ?? 0`; `kriteria: null` bukan "tidak ada baris".
  - **Angka JSON:** D-2; `capaian` bisa > 100 dan tidak dipangkas.
  - Tidak ada regex, tanggal, atau teks.

## Kriteria penerimaan

- [ ] `tests/parity/prosn-hitung.cases` ≥ 250 kasus, termasuk 30 kasus pembulatan tepi dan 10
      kasus id ganda.
- [ ] `cargo test -p pemdi-domain --test parity_prosn` lulus.
- [ ] Kasus khusus: indikator dengan nilai kriteria 2,00 dan bobot 1,50 menghasilkan `capaian`
      > 100 tanpa dipangkas, sama dengan oracle.
- [ ] `bun scripts/oracle/unseen.sh prosn-hitung 777` lulus.
- [ ] Baris ledger `PORT-15` **parity green**; perbedaan (bila ada) di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Membaca `src/data/prosn/penilaian.json` dan menyusun 65 indikator dari kerangka (`PORT-23`),
tampilan (`src/lib/prosn-tampil.ts`, tetap TypeScript), dan keputusan menampilkan PROSN (`DEC-6`).
