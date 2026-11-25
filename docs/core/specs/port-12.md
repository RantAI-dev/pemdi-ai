# `PORT-12` Katalog 68 kebutuhan data

| | |
| --- | --- |
| Backlog | `PORT-12` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `PORT-11` — indikator dan aspek Pemdi harus ada di `pemdi-domain` lebih dulu |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/data/kebutuhan.ts` berisi 68 kebutuhan data (`grep -c '^  k("' src/data/kebutuhan.ts` = 68),
145 baris, dalam urutan indikator 1–20. Bentuknya memuat satu hal yang tidak bisa disalin begitu
saja ke Rust:

- `kata: RegExp` (`:21`) — 68 pola dengan alternasi, `\b`, `.{0,40}`, dan flag `i`.
- `indikator` dihitung dari awalan id: `Number(id.split(".")[0])` (`:26`), jadi `"20.4"` → 20.
- `KEBUTUHAN_BY_ID` (`:145`) adalah `Map` dengan urutan = urutan larik.

Katalog ini dipakai di mana-mana: `src/lib/kebutuhan.ts:10`, `src/lib/bukti.ts:3`,
`src/lib/kerangka-dokumen.ts:8`, `src/lib/proses.ts:12`, `src/app/dokumen/page.tsx:1`. `PORT-31`
mencocokkan berkas ke kebutuhan dengan pola-pola ini, jadi salah satu pola pindah = status
"terpenuhi" berubah di layar Kebutuhan Data.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Status 68 kebutuhan (terpenuhi / sebagian / perlu dicek / belum
ada) dihitung dari katalog yang sama, dengan pola pencocokan yang sama.

## Rancangan

- `rust/crates/pemdi-domain/src/kebutuhan.rs`:
  - `pub enum Lingkup { Kabupaten, Opd }`
  - `pub struct Kebutuhan { pub id: &'static str, pub indikator: u8, pub nama: &'static str,
    pub tingkat: u8, pub pemilik: &'static str, pub lingkup: Lingkup,
    pub kode: &'static [&'static str], pub kata: &'static str }`
  - `pub static KEBUTUHAN: &[Kebutuhan] = &[…]` dengan 68 entri, urutan sama dengan TS; `id`,
    `nama`, `pemilik`, `tingkat`, `lingkup`, `kode`, dan **teks pola** disalin apa adanya. Nilai
    `indikator` ditulis eksplisit (bukan dihitung saat runtime) dan sebuah test memeriksa
    `id.split('.')[0]` cocok.
  - `pub fn cocok(k: &Kebutuhan, teks: &str) -> bool`, dengan `Regex` dikompilasi sekali:
    `static POLA: OnceLock<Vec<Option<Regex>>>`. Pola yang gagal dikompilasi menjadi `None` (tidak
    pernah cocok) dan sebuah test memastikan tidak ada `None`.
- Dependensi baru: **`regex` — butuh persetujuan owner.** Alasannya: 68 pola memakai alternasi,
  `\b`, `.{0,N}`, dan flag `i`; menuliskannya ulang sebagai pencocokan kata kunci akan mengubah
  hasil, dan `PORT-31` akan gagal paritas. Tanpa persetujuan, task berhenti (STATUS blocked).
- Oracle: modul `kebutuhan` di `scripts/oracle/modules.ts` dengan `daftar` (mengembalikan 68 baris
  `{id, indikator, nama, tingkat, pemilik, lingkup, kode, kata: {source, flags}}`) dan `cocok`
  (`[id, teks]` → boolean). Generator `kebutuhan` di `scripts/oracle/cases.ts`: setiap pola diuji
  dengan (a) teks yang seharusnya cocok, diambil dari `nama` yang dimaksud, (b) teks yang tidak
  cocok, (c) teks OCR tanpa spasi (mis. `rencanaaksi`), (d) huruf besar/kecil campuran.
- Daftar "what differs" yang berlaku untuk modul ini, spesifik:
  - **Regex:** `i` di JavaScript melipat huruf ASCII; `(?i)` di Rust melipat Unicode. `\b` di
    JavaScript batas kata ASCII (`\w` = `[A-Za-z0-9_]`), di Rust Unicode. `.{0,40}` menghitung
    satuan UTF-16 di JavaScript, `char` di Rust. Pola di sini berbahasa Indonesia tanpa aksen,
    jadi diharapkan sama; kasus (c)/(d) membuktikannya.
  - **Panjang teks:** `cocok` menerima potongan 1.500 karakter (`src/lib/kebutuhan.ts:59`); patokan
    potong ada di pemanggil, bukan di sini.
  - **Urutan:** larik, bukan `Map`; jangan pakai `HashMap`.
  - Tidak ada pembulatan, tanggal, atau angka JSON di modul ini.

## Kriteria penerimaan

- [ ] `tests/parity/kebutuhan.cases` berisi 68 baris `daftar` + ≥ 400 baris `cocok`, dan test Rust
      mencetak jumlah kasus yang dibandingkan.
- [ ] `cargo test -p pemdi-domain --test parity_kebutuhan` lulus; 68 baris `daftar` sama persis
      dengan keluaran oracle, termasuk `kata.source` dan `kata.flags`.
- [ ] Test khusus: setiap pola berhasil dikompilasi (tidak ada `None` di `POLA`), dan
      `indikator == id[..id.find('.')]` untuk ke-68 baris.
- [ ] `bun scripts/oracle/unseen.sh kebutuhan 777` lulus (`PORT-2`).
- [ ] Baris ledger `PORT-12` **parity green**; perbedaan `\b`/case-folding (bila ada) tercatat di
      [differences.md](../../port/differences.md) dengan persetujuan owner.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Pencocokan berkas ke kebutuhan (`hitungKebutuhan`, `PORT-31`), pemakaian pola untuk memilih berkas
di intake (`PORT-24`), dan perbaikan isi katalog (68 entri adalah tafsiran Pemdi-AI atas Permen,
bukan kutipan; koreksi isi adalah tugas pemilik data, bukan port).
