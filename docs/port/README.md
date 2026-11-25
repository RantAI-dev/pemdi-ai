# Porting backend ke Rust

Rencana memindahkan seluruh backend Pemdi-AI dari TypeScript (Next.js route handlers dan
`src/lib`) ke service Rust (`rust/`). Next.js tetap ada, tetapi hanya sebagai UI. Prosedurnya
mengikuti skill `port-code` (`.agents/skills/port-code/SKILL.md`): **kode lama adalah
spesifikasinya**, dan sebuah modul dianggap selesai bila skrip menyatakan kedua implementasi
berperilaku sama, bukan bila pembaca merasa begitu.

| Dokumen | Isi |
|---|---|
| [ledger.md](ledger.md) | Satu baris per modul: path lama, path baru, dependensi, case file, status |
| [differences.md](differences.md) | Perbedaan perilaku yang disengaja, dan bug lama yang ikut diporting |
| [port-brief.md](port-brief.md) | Brief untuk worker yang memporting satu modul |
| [frontend-audit.md](frontend-audit.md) | Audit frontend terhadap guidelines dan slice refactor UI |
| [`../adr/0001-backend-rust.md`](../adr/0001-backend-rust.md) | Keputusan dan alasannya |
| [`../adr/0002-rust-crate-layout.md`](../adr/0002-rust-crate-layout.md) | Susunan crate dan arah dependensi |
| [`../adr/0003-kontrak-api.md`](../adr/0003-kontrak-api.md) | Kontrak HTTP bersama Rust dan UI |

## 0. Alasan dan angka keberhasilan

Diputuskan owner pada 2026-11-25 (backlog `DEC-1`): **satu stack dengan RantAI Lakehouse**,
yang juga Rust/axum. Satu toolchain, satu pola deploy, satu cara menangani error, dan kode yang
bisa dipakai bersama antar-produk.

Angka keberhasilan, diukur di host Portainer sebelum dan sesudah cutover (backlog `PORT-0`
mencatat baseline):

1. Memori kontainer backend saat idle dan saat AI Tubaba menjawab: turun (target: setengah dari
   kontainer `app` Next.js sekarang).
2. Ukuran image backend: turun (target: < 100 MB, tanpa Node, Python, dan uv di image backend).
3. Nol selisih angka di dasbor: setiap case paritas lolos, dan pembandingan bayangan (§7) tidak
   mencatat selisih selama 7 hari.

## 1. Bekukan sisi luar

Selama porting, yang dilihat pemanggil tidak berubah: bentuk respons `/api/*`, nama variabel
lingkungan, format `data/dokumen.json`, format berkas di `src/data/`, dan cookie `pemdi_sesi`.
Tipe HTTP ditulis di `rust/crates/pemdi-contracts` dan tipe TypeScript-nya dibangkitkan dari sana
(ADR 0003). Konvensi respons baru (`docs/conventions.md`) baru diterapkan **setelah** cutover,
satu endpoint per PR, dicatat di [differences.md](differences.md).

## 2. Oracle

Oracle adalah perintah yang menjalankan implementasi **lama** dan mencetak hasilnya:

```bash
echo '{"fn":"capaian","args":[80,100,"naik"]}' | bun scripts/oracle/run.ts makro-hitung
# {"fn":"capaian","args":[80,100,"naik"]} => 80
```

- `scripts/oracle/modules.ts` mendaftarkan fungsi per modul.
- `scripts/oracle/cases.ts <modul> [seed]` membangkitkan input (termasuk nilai tepi dari daftar
  "What differs between languages") dan menulis `tests/parity/<modul>.cases`. Jangan pernah
  menyunting case file dengan tangan.
- Test paritas Rust (`rust/crates/*/tests/parity_*.rs`) membaca case file yang sama, atau berkas
  lain bila `PARITY_CASES` di-set (untuk kasus yang belum dilihat, §5). Ikuti pola `cases()` di
  `parity_makro.rs`.
- Oracle, case file, dan test paritas ada di `.agents/protected-paths`.

Untuk modul yang memakai I/O (lakehouse, LLM, berkas), oracle-nya berupa rekaman
permintaan dan respons, dengan rahasia dan data pribadi dihapus (backlog `PORT-3`).

## 3. Urutan: daun dulu

Urutannya mengikuti dependensi (lihat ledger). Kelompok besarnya:

1. **Domain murni** → `pemdi-domain`: kerangka indikator, `hitungIndeks`, `*-hitung`.
2. **Adapter** → `pemdi-adapters`: lakehouse, LLM, penyimpanan registry, berkas sumber, intake/OCR,
   pengguna.
3. **Use case** → `pemdi-app`: bukti, kebutuhan, ringkasan, dasbor, penilaian, proses dokumen,
   sinkron ke lakehouse, estimasi.
4. **Route** → `pemdi-api`: satu modul route per kelompok endpoint, mendaftarkan dirinya sendiri.

Modul yang hanya menyiapkan tampilan (`*-tampil.ts`, `nilai-tampil.ts`, `utils.ts`) **tetap di
TypeScript**; mereka milik UI.

## 4. Satu modul per slice

Setiap slice: satu baris ledger, satu PR, satu worker dengan [port-brief.md](port-brief.md).
Nama dan struktur dijaga dekat dengan kode lama; Rust yang idiomatis datang setelah cutover.

## 5. Gate dengan kasus yang belum dilihat worker

Sebelum slice diterima, reviewer membangkitkan kasus baru dengan seed lain dan menjalankan port
pada kasus itu:

```bash
bun scripts/oracle/cases.ts makro-hitung 777 /tmp/unseen.cases
(cd rust && PARITY_CASES=/tmp/unseen.cases cargo test -p pemdi-domain --test parity_makro)
```

(Langkah ini akan dijadikan skrip `scripts/oracle/unseen.sh`, backlog `PORT-2`.)

## 6. Perbedaan adalah keputusan

Setiap perbedaan perilaku yang disengaja masuk [differences.md](differences.md) beserta alasan,
tanggal, dan siapa yang setuju. Perbedaan yang ditemukan test paritas dan tidak ada di daftar
adalah bug.

## 7. Jalankan keduanya, lalu cutover

Service Rust berjalan di samping Next.js dalam stack yang sama. Next.js meneruskan permintaan
`/api/*` yang sudah diporting ke Rust, sambil mencatat selisih respons di mode bayangan.
Urutannya: baca dulu, lalu tulis, lalu jalur lama dipensiunkan. Rollback tetap tersedia sampai
7 hari tanpa selisih.

## 8. Hapus kode lama

Pada minggu yang sama dengan cutover. Lalu Rust dirapikan menjadi idiomatis dengan skill
`adopt-guidelines`.
