# `PORT-13` Kerangka Makro/SPM/PROSN/Pemdi

| | |
| --- | --- |
| Backlog | `PORT-13` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | L (lebih dari 2 minggu) |
| Blocked by | `PORT-12` — kerangka memakai `indikator`/`aspek` Pemdi dan katalog kebutuhan untuk `opd` |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Pohon indikator adalah data besar yang dipakai setiap halaman dasbor:

- `src/lib/kerangka.ts` (87 baris): `KerangkaNode`/`Kerangka` (`:11-34`), `ringkasKerangka` `:39`,
  `bukaJalur` `:64`, `indikatorDalam` `:77`.
- `src/data/kerangka/pemdi.ts` 92 baris, `makro.ts` 96, `spm.ts` 218, `prosn.ts` 1.056 — total
  1.462 baris literal.
- `src/data/kerangka/prosn.ts` dibekukan ratchet: `.agents/size-baseline.tsv:1` mencatat
  `src/data/kerangka/prosn.ts	1056`, dan berkas itu "hanya boleh mengecil". Menyuntingnya untuk
  memindahkan data dilarang.
- Urutan dan filter ada di `src/data/kerangka/index.ts:11`: `TAMPIL_PROSN ? [makro, spm, prosn,
  pemdi] : [makro, spm, pemdi]`.
- Pemakai: `src/lib/kerangka-data.ts:4`, `src/lib/dasbor-pemdi.ts:6`, `src/lib/spm.ts:15`,
  `src/lib/prosn.ts:26`, `src/app/dashboard-pemdi/[slug]/page.tsx:5`.

`bukaJalur` dan `indikatorDalam` juga menentukan 404 halaman kerangka (`ketemu: false`), jadi salah
satu id berarti halaman mati.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Setiap halaman kerangka (Makro, SPM, PROSN, Indeks Pemdi) punya
pohon, jumlah indikator, kedalaman, dan tautan OPD yang sama, dan tautan lama yang basi tetap
menghasilkan 404.

## Rancangan

- `rust/crates/pemdi-domain/src/kerangka/mod.rs` — tipe tanpa serde, memakai slice statis supaya
  pohon menjadi `const`:
  `pub struct Node { pub id: &'static str, pub kode: Option<&'static str>, pub judul: &'static str,
  pub penjelasan: &'static str, pub bobot: Option<f64>, pub opd: &'static [&'static str],
  pub indikator: Option<u8>, pub aspek: Option<u8>, pub anak: &'static [Node] }`, dan
  `pub struct Kerangka { pub slug: &'static str, pub judul: &'static str, pub dasar: &'static str,
  pub deskripsi: &'static str, pub anak: &'static [Node] }`.
- Fungsi: `ringkas_kerangka`, `buka_jalur` (kembalikan `{jejak, node, ketemu}`), `indikator_dalam`
  (dedup + urut naik), dan `kerangka_urut(tampil_prosn: bool) -> &'static [Kerangka]` — flag
  tampilan menjadi parameter, bukan konstanta yang diporting, karena `TAMPIL_PROSN` milik UI
  (`src/lib/fitur.ts:4`).
- Data: `rust/crates/pemdi-domain/src/kerangka/data/{pemdi,makro,spm,prosn}.rs`, dibangkitkan
  **sekali** oleh `scripts/kerangka-rust.ts` (mengimpor modul TS yang sama) dan di-commit. Alasan
  dibangkitkan, bukan ditulis tangan: 1.462 baris literal, dan `prosn.ts` dibekukan sehingga tidak
  bisa dijadikan sumber yang disunting. Skrip tidak masuk gate (`scripts/check.sh` path
  terlindungi); kebasiannya ditangkap test paritas, bukan build step.
- Oracle: modul `kerangka` dengan `pohon(slug)` mengembalikan **dump kanonik** satu baris per node
  dalam pre-order:
  `id|kode|judul|bobot|opd1,opd2|indikator|aspek` dengan pemisah kedalaman `>`, sehingga pohon
  utuh dapat dibandingkan sebagai satu string tanpa serde di domain. Juga `ringkas(slug)`,
  `jalur(slug, jalur[])`, dan `indikatorDalam(slug, jalur[])`.
- Generator `kerangka`: empat slug, jalur valid dan tidak valid (segmen asing di tengah dan di
  akhir), jalur kosong, `bobot` `null`, node tanpa `opd`, node dengan `indikator` dan `aspek`
  sekaligus.
- Daftar "what differs" yang berlaku, spesifik modul ini:
  - **Angka JSON:** `bobot` adalah pecahan (`0.05`). Di dump dipakai format tetap 6 desimal lalu
    nol di belakang dibuang, dengan aturan yang sama di oracle dan Rust, supaya `String(0.1)` vs
    `format!("{}")` tidak menjadi sumber selisih palsu.
  - **Urutan:** `indikatorDalam` mengembalikan `[...Set].sort((a,b)=>a-b)`; Rust `sort_unstable` +
    `dedup` boleh, karena hasilnya angka unik terurut.
  - **`undefined` vs kunci hilang:** di dump, field yang tidak ada ditulis kosong; di tipe kabel
    (`pemdi-contracts`) nanti menjadi `Option`/`null`.
  - **Panjang teks:** tidak ada pemotongan di modul ini (`judul`/`penjelasan` utuh).
  - Tidak ada regex, tanggal, atau pembulatan.

## Kriteria penerimaan

- [ ] `tests/parity/kerangka.cases` ≥ 150 kasus: 4 dump pohon, 4 `ringkas`, ≥ 60 jalur (valid dan
      tidak), ≥ 40 `indikatorDalam`.
- [ ] `cargo test -p pemdi-domain --test parity_kerangka` lulus; jumlah node per pohon sama dengan
      keluaran `ringkasKerangka` hari ini (dicetak test).
- [ ] Menyunting satu `judul` di `data/pemdi.rs` membuat test gagal (uji negatif, dikembalikan).
- [ ] `bun scripts/oracle/unseen.sh kerangka 777` lulus.
- [ ] `scripts/kerangka-rust.ts` dijalankan ulang menghasilkan berkas yang sama
      (`git diff --exit-code rust/crates/pemdi-domain/src/kerangka/data`).
- [ ] Baris ledger `PORT-13` **parity green**; `kerangka_urut(false)` mengembalikan tiga pohon,
      `kerangka_urut(true)` empat.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Memuat/menyusun kerangka dari berkas (`PORT-23`), ringkasan dasbor (`PORT-32`), dan halaman kerangka
(`PORT-45`). Memindahkan `TAMPIL_PROSN` ke backend: keputusan `DEC-6`.
