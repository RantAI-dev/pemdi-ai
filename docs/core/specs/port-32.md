# `PORT-32` Use case ringkasan dan dasbor Pemdi

| | |
| --- | --- |
| Backlog | `PORT-32` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `PORT-13` (pohon kerangka) dan `PORT-22` (registry penilaian/dokumen) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Empat modul menyusun hampir semua angka dasbor, dan semuanya mencampur hitungan dengan pembacaan
berkas:

- `src/lib/ringkasan.ts` (53 baris): `getPipeline` (`:9-35`) menghitung 10 angka (dokumen, terbaca,
  OCR, tanpa teks, dibaca AI, menunggu, gagal, temuan, metrik, dinilai, dinilai AI) dan memanggil
  `hitungIndeks`; `perIndikator` (`:40-53`) memakai `ASPEK.find(...)!.nama` (`:45`) — non-null
  assertion yang harus menjadi pencarian aman di Rust.
- `src/lib/dasbor-pemdi.ts` (206 baris): `TINGKAT_INDIKATOR` (`:12-17`), `ALIAS` 8 entri (`:25-34`),
  `BUKAN_OPD` (`:35`), `SINGKAT` 23 entri (`:38-62`), `perTingkat` (`:87-96`),
  `indikatorDenganOpd` (`:103-121`), `ringkasDari` dengan regex `^(.{20,220}?[.;])(\s|$)` (`:124`),
  `satuanDari` dengan `/Satuan:\s*([^\n]+?)\.?\s*$/m` (`:130`), dan pengurutan OPD
  `b.total - a.total || a.nama.localeCompare(b.nama)` (`:186`) lalu `slice(0, 15)` (`:203`).
- `src/lib/kerangka-data.ts` (33 baris): `muatKerangka(slug, jalur)` merakit jejak, node, `ketemu`,
  `hasil`, `nilai` (Map), `bukti` (Map).
- `src/lib/kerangka-dokumen.ts` (63 baris): dokumen per indikator dari temuan, metrik, dan kebutuhan;
  urutan `b.temuan - a.temuan || a.nama.localeCompare(b.nama)` (`:61`).

`localeCompare` adalah risiko nyata: Node memakai ICU (kolasi `id`), Rust membandingkan byte. Urutan
kartu OPD dan daftar bukti bisa berubah tanpa satu angka pun berubah.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Beranda, Indeks Pemdi, Temuan, dan setiap halaman kerangka
menampilkan angka, urutan OPD, dan daftar bukti yang sama.

## Rancangan

- `pemdi-app/src/ringkasan.rs`: `get_pipeline(&R, &KB) -> Pipeline` dan `per_indikator(&Pipeline) ->
  Vec<BarisIndikator>`; `aspek_nama` memakai `?`/`Option`, bukan `!`.
- `pemdi-app/src/dasbor_pemdi.rs`: `muat_dasbor_pemdi(&R, &K) -> DasborPemdiData`; tabel `ALIAS`,
  `SINGKAT`, `BUKAN_OPD`, `TINGKAT_INDIKATOR` disalin apa adanya (23 nama OPD harus sama huruf per
  huruf). Regex `ringkasDari`/`satuanDari` memakai crate `regex` (`PORT-12`).
- `pemdi-app/src/kerangka_data.rs` dan `kerangka_dokumen.rs`: `muat_kerangka`, `dokumen_per_indikator`.
- `pemdi-contracts/src/dasbor.rs`: `DasborPemdiData`, `RingkasKerangkaPemdi`, `DataKerangka`,
  `DokBukti`, `Pipeline` — bentuk kabel yang dipakai `PORT-45`; `Option<f64>` untuk indeks, `null`
  saat belum lengkap.
- Urutan: implementasi `urut_opd` = (total menurun, lalu `locale_compare_id`). `locale_compare_id`
  ditulis sebagai fungsi kecil; kasus uji memakai 23 nama OPD nyata dari oracle. **Bila hasilnya
  berbeda dari `localeCompare`, itu dilaporkan sebagai DEVIATION dan masuk differences.md; jangan
  menyerahkannya diam-diam.**
- Oracle: `muatDasborPemdi` tidak murni (membaca `readPenilaian`), jadi fungsi dipecah dan diuji
  satu per satu. `scripts/oracle/modules.ts` mendaftarkan `perTingkat(kerangka)`, `ringkas` dan
  `satuan` (dua regex), `urutOpd` (daftar `{nama, per}`), dan `dokumenPerIndikator(dok)` yang
  menerima larik `Dok` sebagai argumen JSON. `getPipeline`/`muatDasborPemdi` diuji di Rust dengan
  fixture registry yang sama.
- Fixture: `tests/fixtures/registry/` (dari `PORT-22`) + `tests/fixtures/penilaian/*.json` (tiga
  keadaan: kosong, sebagian, lengkap).

Daftar "what differs" yang berlaku, spesifik:
- **Urutan/kolasi:** `localeCompare` (di atas).
- **Regex:** `\s`, `\n`, `m` flag, `.{20,220}?` menghitung satuan UTF-16.
- **Angka:** `hitungIndeks` dari `PORT-11`; `Object.values(per).reduce` urutan penjumlahan integer.
- **`null` vs `undefined`:** `indeks: null`, `predikat: null`; `n.indikator` boleh `null` di metrik.
- **Map:** `nilai`/`bukti` menjadi `BTreeMap<u8, _>`; JSON-nya objek dengan kunci angka sebagai
  string — bentuk ini hanya untuk internal, bukan kabel.

## Kriteria penerimaan

- [ ] `tests/parity/dasbor-pemdi.cases` ≥ 40 kasus lulus (`perTingkat`, `ringkas`, `satuan`,
      `urutOpd`, `dokumenPerIndikator`).
- [ ] `getPipeline` di Rust dengan fixture kosong/sebagian/lengkap menghasilkan 10 angka dan `hasil`
      yang sama dengan oracle (dicetak sebagai JSON dan dibandingkan).
- [ ] `muatDasborPemdi` dengan data nyata (`src/data/kerangka` versi Rust + fixture penilaian)
      menghasilkan 15 OPD teratas dengan urutan yang sama; bila `localeCompare` tidak bisa
      ditiru, perbedaannya tercatat dan disetujui owner.
- [ ] `muatKerangka("tidak-ada", [])` → `None`; jalur asing → `ketemu: false` dengan `jejak`
      sepanjang segmen yang cocok.
- [ ] Baris ledger `PORT-32` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Endpoint data halaman (`PORT-45`), narasi LLM di dasbor data (`PORT-33`), dan pemecahan
`src/app/dasbor.tsx` (`FE-1`).
