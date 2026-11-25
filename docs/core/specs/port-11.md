# `PORT-11` Kerangka Indeks Pemdi dan `hitungIndeks` di Rust

| | |
| --- | --- |
| Backlog | `PORT-11` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Angka Indeks Pemdi adalah angka resmi yang paling sering dilihat. Rumusnya ada di
`src/data/pemdi.ts` (`hitungIndeks`, termasuk nilai sementara per aspek dan keseluruhan) dan
predikatnya mengikuti pita Permen PANRB 8/2026 (Kurang 1,00–<1,50; Cukup 1,50–<2,50; Baik
2,50–<3,50; Sangat Baik 3,50–<4,00; Memuaskan 4,00–5,00). Ini daun paling penting di ledger:
`kebutuhan`, `kerangka`, `ringkasan`, dan `dasbor-pemdi` bergantung padanya.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Angka indeks yang nanti dihitung service Rust dijamin sama
dengan hari ini, untuk setiap kombinasi nilai indikator yang diuji.

## Rancangan

- `rust/crates/pemdi-domain/src/pemdi/`: tipe aspek dan indikator dengan bobotnya
  (tabel `ASPEK`/`INDIKATOR` di `src/data/pemdi.ts`), `hitung_indeks`, `predikat`.
- Data kerangka menjadi `static` Rust, **tidak** diurai saat jalan: `pemdi-domain` tidak boleh
  memakai serde atau membaca berkas (ADR 0002). Skrip `scripts/kerangka-rust.ts` membangkitkan
  `src/pemdi/data.rs` dari `src/data/pemdi.ts` dan `src/data/permen-kriteria.json`; gate
  memeriksa hasilnya sama (seperti `scripts/error-codes.sh`). Spec `PORT-12`/`PORT-13` memakai
  cara yang sama.
- Oracle: entri `pemdi` di `scripts/oracle/modules.ts`; generator di `cases.ts` dengan kasus
  semua indikator dinilai, sebagian dinilai (nilai sementara), nilai tepi pita predikat (1,4999;
  1,5; 2,4999; …), dan nilai di luar 1–5.
- Test paritas `rust/crates/pemdi-domain/tests/parity_pemdi.rs`.
- Perhatian dari daftar "what differs": pembulatan (bila ada `toFixed`/`Math.round`), urutan
  aspek (Map vs HashMap), dan `undefined` vs `null` untuk indikator yang belum dinilai.

## Kriteria penerimaan

- [ ] `tests/parity/pemdi.cases` dibangkitkan oracle, ≥ 300 kasus, termasuk semua tepi pita.
- [ ] Test paritas lolos; kasus baru dengan seed lain juga lolos (`PORT-2`).
- [ ] Baris ledger `PORT-11` berstatus "parity green"; perbedaan (bila ada) di `differences.md`.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Membaca nilai indikator dari registry (`PORT-22`) dan endpoint ringkasan (`PORT-32`).
