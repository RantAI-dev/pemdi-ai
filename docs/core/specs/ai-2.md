# `AI-2` Jawaban per tahun digambar sebagai grafik garis

| | |
| --- | --- |
| Backlog | `AI-2` di [BACKLOG.md](../BACKLOG.md) |
| Module | AI Tubaba |
| Size | S |
| Blocked by | tidak ada. Penyebab pertama ada di `AI-1`, tetapi PR ini tidak menunggunya |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Jawaban berisi satu angka per tahun digambar sebagai batang, dan kadang batangnya berasal dari
kueri lain (tes 2026-11-05). Ada dua sebab, keduanya terbaca di kode:

1. **Kueri yang salah dipilih** — `hasil` di `src/app/api/ask/route.ts:31` memilih `run_sql`
   terakhir yang bisa digambar, yang belum tentu kueri jawaban. Itu tugas `AI-1`; spec ini tidak
   mengubahnya, tetapi tanpa `AI-1` bukti per tahun tetap bisa salah.
2. **Kolom label tidak mencari kolom waktu.** `chartOf` di `src/app/tanya/tanya.tsx:57`
   memilih kolom label sebagai kolom **pertama yang bukan angka**:

   ```ts
   const labelCol = r.columns.find((c) => !numeric.includes(c)) ?? r.columns[0];   // :60
   const labels = r.rows.map((row) => String(row[labelCol] ?? ""));                // :64
   return { …, time: labels.every((l) => /^\d{4}(-\d{2})?(-\d{2})?$/.test(l)) };  // :65
   ```

   Kueri `SELECT kabupaten, tahun, jumlah …` memberi label nama kabupaten, jadi `time` palsu.
   Kueri yang benar pun menjadi batang karena `AutoChart line={chart.time}` (`tanya.tsx:187`,
   `charts.tsx:288-291`). Selain itu `every` terlalu ketat: satu baris "Jumlah"/"Total" di akhir
   mengubah deret tahun menjadi batang.

Keputusan yang berlaku: grafik hanya untuk 2–40 baris dengan satu kolom angka
(`docs/core/features/ai-tubaba.md:80`). Itu tidak diubah.

## Yang didapat pengguna

Pertanyaan "per tahun" tampil sebagai garis yang menunjukkan arah; pertanyaan "per kecamatan" tetap
batang. Bentuk grafik mengikuti isi kueri, bukan urutan kolomnya.

## Rancangan

Pindahkan pemilihan grafik ke berkas murni `src/lib/tanya-grafik.ts`, supaya bisa diuji tanpa
browser:

```ts
export type Hasil = { columns: string[]; rows: Record<string, unknown>[] };
export type Grafik = { labels: string[]; values: number[]; name: string; time: boolean };
export function chartOf(r: Hasil): Grafik | null;
```

`src/app/tanya/tanya.tsx` mengimpor `chartOf` dari sana dan menghapus salinannya. `csvOf`,
`unduh`, dan komponen tidak berubah.

### Aturan

1. Penjaga lama tetap: `rows.length` 2–40, `columns.length ≥ 2`; selain itu `null`.
2. **Cari kolom waktu lebih dulu.** Kolom waktu = nama kolom cocok `/^(tahun|year|periode|tanggal|bulan)$/i`,
   nilainya **unik** di seluruh baris, dan paling sedikit `labels.length - 1` nilainya cocok
   `^\d{4}(-\d{2})?(-\d{2})?$`. Bila ada, ia menjadi kolom label.
3. Bila tidak ada, pakai aturan lama: kolom pertama yang bukan angka, atau `columns[0]`.
4. `time` = jumlah label yang cocok pola tahun ≥ 2 **dan** ≥ `labels.length - 1`. Satu baris total di
   akhir ("Jumlah", "Total") tidak membatalkan garis.
5. Kolom nilai: angka terakhir yang bukan kolom label dan bukan penomoran (`/^(no|id|nomor)$/i`),
   sama seperti sekarang (`tanya.tsx:62`). Bila tidak ada, `null`.
6. Kolom tahun yang berisi `null` di sebagian baris tidak boleh melempar; kolom itu gagal syarat
   "unik + cocok" dan aturan 3 yang dipakai.

Jangan mengubah `AutoChart` (`src/components/charts.tsx:273`) atau menambah tipe grafik baru.

### Test

`src/lib/tanya-grafik.test.ts`:

| # | Baris (kolom berurutan) | Harapan |
| --- | --- | --- |
| 1 | `tahun, jumlah` 2021–2023 | `labels ["2021","2022","2023"]`, `time true`, `name "jumlah"` |
| 2 | `kabupaten, tahun, jumlah` dengan tahun unik | `time true`, label tahun — bug hari ini |
| 3 | `kabupaten, tahun, jumlah`, satu tahun, dua kabupaten | `time false`, label nama kabupaten |
| 4 | `tahun, jumlah` + baris terakhir `"Jumlah"` | `time true` |
| 5 | 1 baris / 41 baris / 1 kolom | `null` |
| 6 | `tahun` berisi `null` di satu baris | tidak melempar; `time false` |
| 7 | label berupa angka (bukan string) `2021` | `labels ["2021"]`, `time true` |
| 8 | `indikator_no, indikator, nilai` 20 baris (pertanyaan indikator) | `time false`, label nama indikator — regresi yang dijaga |

## Kriteria penerimaan

- [ ] `bun test src/lib/tanya-grafik.test.ts` lulus kedelapan kasus; kasus 2 **gagal** pada kode
      sebelum perubahan (lampirkan keluaran itu di PR).
- [ ] `src/app/tanya/tanya.tsx` tidak lagi memuat definisi `chartOf`; hanya impor.
- [ ] Tangkapan layar dari `bun run dev` atau `epemdi.ai.id` (bukan `next build`):
      - "jumlah penduduk Kabupaten Tulang Bawang Barat per tahun" → **garis**;
      - "jumlah penduduk per kecamatan" → **batang**;
      - "nilai 20 indikator, urut dari yang terendah" → **batang** dengan label indikator
        (regresi).
      Sertakan juga blok SQL yang ditampilkan di bawah setiap grafik.
- [ ] Unduh CSV pada salah satu jawaban menghasilkan berkas yang sama dengan tabel di layar.
- [ ] `bun run typecheck` lulus dan `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- Memilih kueri yang digambar: `AI-1`.
- Menambah tipe grafik (area, stacked, multi-seri). Satu kolom angka saja, sesuai keputusan 9 di
  `docs/core/features/ai-tubaba.md:80`.
- Memindahkan `charts.tsx` (ECharts) ke Recharts: audit §7 #11 (`FE-10`).
