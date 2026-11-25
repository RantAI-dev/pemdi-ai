# `PORT-31` Use case kebutuhan dan bukti

| | |
| --- | --- |
| Backlog | `PORT-31` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `PORT-12` (katalog 68 kebutuhan) dan `PORT-22` (registry dokumen) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/kebutuhan.ts` (80 baris) menentukan status 68 kebutuhan, dan `src/lib/bukti.ts` (41 baris)
menentukan bukti satu indikator. Aturan yang harus sama persis:

- `cocok` (`kebutuhan.ts:27-31`): pola dicoba apa adanya; bila gagal, pola yang sama dibuang `\b`-nya
  dan spasinya diubah menjadi `\s*`, untuk teks OCR yang kehilangan spasi.
- `cocokDok` (`:34-38`): bila AI selesai → cocok hanya jika `ai.kebutuhan` memuat id; bila belum →
  `d.kode` yang termasuk `k.kode` dianggap "terdeteksi"; bila tidak → kata kunci pada
  `nama + "\n" + kepala`.
- `dimintaPerKode` (`:41-53`): `SELECT kode, opd … WHERE jenis = 'As-Is' ORDER BY opd LIMIT 2000`;
  galat lakehouse → peta kosong.
- `hitungKebutuhan` (`:55-79`): kepala dokumen = 1.500 karakter pertama (`:59`); `terbaca` bila
  `karakter > 80` (`:66`); `asked` = gabungan unik kode lalu **diurutkan** (`:68`); `belum` hanya
  untuk lingkup `opd` (`:70`); matriks status di `:72-76`.
- `getBuktiIndikator` (`bukti.ts:10-40`): `indikator_no = '<n>'` dengan `Math.trunc` (`:11`), `LIMIT
  400`, dan aturan pemilihan berkas: temuan AI, atau kebutuhan yang dipenuhi, atau (belum dibaca AI)
  kode survei yang dipetakan `indikatorUntukKode`.

`/api/penilaian` membuang field `kata` sebelum mengirim (`src/app/api/penilaian/route.ts:24`), jadi
bentuk kabel tidak memuat `RegExp`.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Halaman Kebutuhan Data dan panel bukti indikator menunjukkan status,
OPD yang belum menyerahkan, dan daftar berkas yang sama.

## Rancangan

- `pemdi-app/src/kebutuhan.rs`:
  - `pub fn hitung(dok: &[Dok], kepala: &HashMap<String, String>, diminta: &HashMap<String,
    Vec<String>>) -> Vec<HasilKebutuhan>` — **murni**, tanpa I/O, sehingga diuji dengan fixture.
  - `HasilKebutuhan { id, indikator, nama, tingkat, pemilik, lingkup, kode, status, bukti, diminta,
    belum }`; `StatusKebutuhan` enum `snake_case` (`terpenuhi`, `sebagian`, `perlu_dicek`,
    `belum_ada`).
  - `cocok` memakai `regex` dari `PORT-12`; `cocokDok` mengembalikan `Option<Dasar>` dengan
    `Dasar::Ai | Dasar::Terdeteksi`.
- `pemdi-app/src/bukti.rs`: `get_bukti_indikator(&L, &R, no)` memanggil `Lakehouse::query` dan
  `Registry::read_dok` secara paralel (`tokio::join!`).
- Kontrak: `pemdi-contracts/src/kebutuhan.rs` dengan `bukti: Vec<BuktiKebutuhan>` dan
  `dasar: "ai" | "terdeteksi"`, tanpa field `kata`.
- Oracle: modul `kebutuhan-hitung` dengan `cocok`, `cocokDok`, `status` (matriks keputusan sebagai
  fungsi murni) dan `susun` (masukan: larik `Dok` + `diminta`, keluaran: `HasilKebutuhan` tanpa
  `kata`). Generator menyusun: dokumen `ai.selesai` dengan/tanpa id, `ai.gagal`, `kode` cocok,
  kata kunci hanya di nama, hanya di kepala (di bawah 1.500 karakter), `karakter` 80/81, lingkup
  `kabupaten` vs `opd`, `asked` kosong/penuh/sebagian.
- Urutan: keluaran mengikuti urutan `KEBUTUHAN`; `asked` diurutkan dengan `sort()` JavaScript
  (leksikografis UTF-16) — untuk nama OPD ASCII sama dengan urutan byte.

Daftar "what differs" yang berlaku, spesifik:
- **Regex:** `\b` dibuang dan spasi → `\s*` (jalur longgar); mesin regex Rust vs JS (lihat
  `PORT-12`).
- **Panjang teks:** `slice(0, 1500)` satuan UTF-16; potong per `char` dan catat bila non-BMP.
- **`null` vs `undefined`:** `d.kode` kosong (`""`) bukan `null`; `ai` hilang vs `status: "gagal"`.
- **Urutan:** `[...new Set].sort()`; `Vec` + `sort`.
- Angka/tanggal: tidak ada; SQL literal sama byte.

## Kriteria penerimaan

- [ ] `tests/parity/kebutuhan-hitung.cases` ≥ 250 kasus lulus (fungsi `hitung` murni).
- [ ] Kasus matriks status lengkap: 4 status × lingkup `kabupaten`/`opd` × `asked` kosong/penuh,
      minimal 16 kombinasi terbukti.
- [ ] Kasus `cocok` longgar: teks OCR `"rencanaaksi pemdi"` cocok untuk `1.1`, teks `"laporan
      keuangan"` tidak cocok.
- [ ] Test `get_bukti_indikator` dengan `Lakehouse` palsu: `no = 3.9` memakai `'3'`; `no = 0`/`21`
      tetap mengembalikan struktur kosong seperti TS.
- [ ] Dua string SQL (`dimintaPerKode`, `getBuktiIndikator`) sama byte dengan sumber TS (konstanta di
      test).
- [ ] Baris ledger `PORT-31` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Menyalin hasil ke tabel lakehouse (`PORT-35`), endpoint `/api/penilaian` (`PORT-43`), dan penilaian
AI (`PORT-34`).
