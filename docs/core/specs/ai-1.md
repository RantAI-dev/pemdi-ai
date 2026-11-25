# `AI-1` Grafik memilih kueri jawaban, bukan kueri pencarian

| | |
| --- | --- |
| Backlog | `AI-1` di [BACKLOG.md](../BACKLOG.md) |
| Module | AI Tubaba |
| Size | S |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Grafik di bawah jawaban kadang menggambar kueri pencarian, bukan kueri yang menjawab. Contoh dari
tes produksi 2026-11-13: pertanyaan tentang data prioritas, jawabannya benar, tetapi grafiknya
menampilkan hitungan berapa judul tabel yang memuat sebuah kata kunci.

Penyebabnya di `src/app/api/ask/route.ts`. Tool trace berisi beberapa `run_sql`; `hasil` (baris 28)
memilih **yang terakhir yang bisa digambar**:

```ts
const runs = trace.filter((t) => t.tool === "run_sql" && t.ok);     // :30
const last = runs.filter(bisaDigambar).pop() ?? runs[runs.length - 1]; // :31
```

`bisaDigambar` (baris 16) hanya memeriksa 2–40 baris, ≥ 2 kolom, dan ada kolom angka. Kueri
"hitung judul yang memuat kata X" menghasilkan 2–40 baris dan satu kolom angka, jadi ia lolos.
Karena model sering menutup dengan kueri seperti itu, ia menang atas kueri jawaban yang dijalankan
lebih dulu. Akibat yang sama menjelaskan `AI-2` (jawaban per tahun digambar batang dari kueri
lain).

Kontrak `done` (`{answer, sql, columns, rows, queries}`) dibekukan sampai cutover (`PORT-41`),
jadi perbaikannya harus di dalam pemilihan, bukan dengan menambah field.

## Yang didapat pengguna

Grafik di bawah jawaban adalah data yang menjawab pertanyaannya. Kalau model hanya menjalankan
kueri pencarian, tabelnya tetap tampil seperti sekarang — tidak ada jawaban yang menjadi kosong.

## Rancangan

Pisahkan pemilihan dari route supaya bisa diuji tanpa lakehouse:

- Berkas baru `src/lib/ask-hasil.ts` (murni, tanpa I/O): `bisaDigambar`, `eksplorasi`,
  `pilihRun`, `susunHasil`.
- `src/app/api/ask/route.ts` mengimpor `susunHasil`, dan `hasil` tinggal satu baris panggilan.
  Bentuk objek `done` tidak berubah satu field pun.

### Aturan pemilihan

1. **Eksplorasi**: satu `run_sql` dianggap eksplorasi bila SQL-nya (komentar `--`/`/* */` dibuang,
   huruf kecil) memuat `count(` **dan** salah satu dari ` like `, ` ilike `, `position(`,
   `match(`. Itu pola "berapa banyak baris yang memuat kata kunci" — kueri untuk mencari, bukan
   untuk menjawab.
2. Kandidat = run non-eksplorasi. Bila kosong, pakai semua run (jangan mengembalikan hasil kosong).
3. Pilih `kandidat.filter(bisaDigambar).pop() ?? kandidat[kandidat.length - 1]` — aturan lama,
   dipersempit ke kandidat. Model yang menutup dengan kueri pemeriksaan satu baris tidak lagi
   menang, karena kueri itu tidak bisa digambar.
4. `queries` tetap berisi jumlah seluruh `run_sql` yang berhasil (`runs.length`), termasuk yang
   eksplorasi: pengguna masih melihat "berapa kueri dipakai" (`ai-tubaba.md:33`).

Jangan menebak dari isi jawaban (paragraf bahasa Indonesia) — rapuh dan tidak bisa diuji. Jangan
menambah field ke `done`; jangan mengubah `bisaDigambar`.

### Test

`src/lib/ask-hasil.test.ts`, fixture `ToolTrace` = `{tool:"run_sql",args:{sql},ok:true,result:{columns,rows}}`
(`src/lib/lakehouse.ts:215`):

| # | Trace | Harapan |
| --- | --- | --- |
| 1 | kueri jawaban (12 baris, `tahun`+`jumlah`), lalu kueri kata kunci (`SELECT count(*) … FROM … WHERE judul LIKE '%data%'`, 3 baris) | `sql` = kueri jawaban (bug hari ini: kueri kata kunci) |
| 2 | kueri jawaban, lalu kueri pemeriksaan 1 baris | `sql` = kueri jawaban |
| 3 | hanya kueri kata kunci | `sql` = kueri kata kunci; `rows` tidak kosong |
| 4 | kueri jawaban, kata kunci, lalu `ok:false` | `sql` = kueri jawaban |
| 5 | tidak ada `run_sql` | `sql: null`, `columns: []`, `rows: []`, `queries: 0` |
| 6 | `count(*)` tanpa `LIKE` (mis. "berapa OPD") 5 baris | bukan eksplorasi: tetap dipilih |
| 7 | hanya `ok:false` | `sql: null`, `queries: 0` |

Kasus 6 penting: jangan menandai semua `count(` sebagai eksplorasi — hitungan per kelompok adalah
jawaban yang sah.

## Kriteria penerimaan

- [ ] `bun test src/lib/ask-hasil.test.ts` lulus ketujuh kasus; kasus 1 **gagal** pada kode sebelum
      perubahan (lampirkan keluaran itu di PR).
- [ ] `src/app/api/ask/route.ts` tidak lagi memuat `bisaDigambar`/`pilihRun`; hanya memanggil
      `susunHasil(body)`.
- [ ] Bentuk `done` tidak berubah: `git diff` pada `route.ts` tidak menyentuh daftar field.
- [ ] Satu pertanyaan nyata di `/tanya` (dev atau `epemdi.ai.id`) yang dulu salah: tangkapan layar
      grafik sebelum/sesudah + SQL yang ditampilkan. Pilih pertanyaan yang memicu kueri kata kunci
      (mis. "data prioritas pusat mana yang belum masuk").
- [ ] `bun run typecheck` lulus dan `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- Bentuk grafik (garis vs batang) dan pemilihan kolom label: `AI-2`.
- Membatasi jumlah kueri yang dijalankan model, atau mengubah prompt: itu keputusan prompt di
  lakehouse, bukan repo ini (`AGENTS.md` Traps).
- Menambah `code`/`requestId` pada baris `error` stream: `PORT-41`/`FE-5i`.
