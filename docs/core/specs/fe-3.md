# `FE-3` Hapus 47 non-null assertion tanpa mengubah angka tampil

| | |
| --- | --- |
| Backlog | `FE-3` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | M |
| Blocked by | `TEST-1` — test karakterisasi `hitungIndeks`/`makro-hitung`/`spm-hitung` harus ada lebih dulu |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`!` menyembunyikan `undefined`: kalau pencarian gagal, galatnya muncul jauh dari penyebabnya atau
angkanya menjadi `NaN`. Biome menghitung 47 temuan `style/noNonNullAssertion` (46 di `src/`, 1 di
`scripts/seed.ts`), dan rule itu error di `biome.json:13`.

Sebaran yang diukur 2026-11-25 (`bunx biome lint src --reporter=json`):

| Berkas | `!` | Bentuk yang khas |
| --- | --- | --- |
| `src/app/penilaian/penilaian.tsx` | 8 | `data!.penilaian`, hasil `find` |
| `src/components/prosn-detail.tsx` | 4 | `baris!`, `nilai!` |
| `src/data/pemdi.ts` | 4 | `INDIKATOR.find(...)!.nama` |
| `src/app/dasbor.tsx` | 3 | `i.nilai!`, `b.hilang!` |
| `src/components/makro-detail.tsx` | 3 | `nilai!` |
| `src/components/spm-halaman.tsx` | 3 | `n!.sumber` |
| `src/lib/ringkasan.ts` | 3 | `d.ai!.temuan`, `ASPEK.find(...)!.nama` (`:45`) |
| `src/lib/sinkron.ts` | 3 | `d.ai!.temuan` (`:48`), `TABLES.find(...)!.columns` (`:94`) |
| `src/app/dokumen/dokumen.tsx` | 2 | `ai!.status` |
| `src/components/viz-makro.tsx` | 2 | `nilai!` |
| `src/data/kerangka/pemdi.ts` | 2 | indeks larik |
| 9 berkas lain | 1 masing-masing | `dasbor-pemdi.tsx`, `kebutuhan.tsx`, `kebutuhan/page.tsx`, `spm-detail.tsx`, `viz-prosn.tsx`, `viz-spm.tsx`, `lib/llm.ts`, `lib/sumber-tampil.ts`, `lib/user-tables.ts` |
| `scripts/seed.ts` | 1 | `d.ai!.temuan` |

`src/app/kebutuhan/page.tsx:15` adalah contoh yang harus dibereskan dengan benar:
`aspek: INDIKATOR.find((i) => i.no === k.indikator)!.aspek`. Indikator 20 selalu ada, jadi hasilnya
tidak pernah `undefined` — tetapi tipe tidak tahu itu.

## Yang didapat pengguna

Tidak ada yang berubah di layar: setiap angka, label, dan warna tetap sama. Yang berubah: bila
datanya tidak lengkap, halaman menampilkan sel kosong alih-alih `NaN` atau galat di tempat lain.

## Rancangan

`tsconfig.json` **tidak** memakai `noUncheckedIndexedAccess`, jadi menghapus `!` saja akan gagal
`tsc`. Setiap temuan diperbaiki dengan salah satu dari empat pola; pilih yang paling dekat dengan
maksud kode:

1. **Pencarian yang dijamin ada** (tabel statis 1–20 indikator, 1–7 aspek): tambah helper murni di
   `src/lib/utils.ts` atau di modul pemiliknya, mis.
   `export function aspekDari(no: number): number { return INDIKATOR.find(i => i.no === no)?.aspek ?? 1; }`
   dan satu test yang membuktikan setiap nomor 1–20 memetakan ke aspek 1–7. Jangan menyebar `?? 0`
   tanpa alasan: nilai cadangan yang salah lebih buruk daripada `!`.
2. **Nilai opsional yang memang boleh kosong** (`i.nilai`, `d.ai`, `b.hilang`): pindahkan ke cabang
   eksplisit — `if (x == null) return …` atau tampilkan `"–"`, sama seperti `fmtDec` di
   `src/lib/utils.ts:14`.
3. **Indeks larik**: ubah ke `for (const x of …)` atau `.at(i)`, lalu tangani `undefined` di tempat
   pemakaian. Untuk larik yang panjangnya pasti (mis. 7 aspek, 12 bulan), tulis
   `const x = arr[i]; if (!x) continue;`.
4. **Type predicate**: bila `!` dipakai setelah `.filter()`, ganti filter itu dengan
   `(x): x is T => x.ai != null` supaya `!` tidak diperlukan sama sekali (pola `selesai` di
   `src/lib/sinkron.ts:44`).

Aturan tambahan:

- Jangan mengubah rumus, urutan, label, atau jumlah desimal. PR yang mengubah angka tampil ditolak.
- Jangan memakai `as`, `@ts-expect-error`, atau `biome-ignore` sebagai pengganti `!`.
- Satu PR per kelompok: (1) `src/data/**` + `src/lib/**`, (2) `src/components/**`, (3) `src/app/**`,
  (4) `scripts/seed.ts`. Tiap PR berdiri sendiri dan hijau.
- Test baru: `src/data/pemdi.test.ts` — `INDIKATOR` 20 baris, `ASPEK` 7 baris, setiap indikator
  punya aspek yang ada, dan helper baru mengembalikan aspek yang sama dengan `.find(...)!.aspek`
  hari ini untuk nomor 1–20.

### Ratchet

Setiap PR menurunkan `ts-lint`. Jalankan `scripts/ratchet.sh --update` di PR yang sama;
`.agents/ratchet.lock` **protected**, jadi sebutkan di PR bahwa owner menyetujui penurunannya.
Total akhir: 125 − 47 = **78** (37 lebih rendah bila `FE-2` sudah merge lebih dulu).

## Kriteria penerimaan

- [ ] `bunx biome lint . --reporter=summary` → `lint/style/noNonNullAssertion` **0**.
- [ ] `git grep -nE '\bas any\b'` tetap 0 dan tidak ada `biome-ignore` baru (ratchet `ts-suppress`
      tetap 1).
- [ ] `src/data/pemdi.test.ts` lulus: `bun test src/data/pemdi.test.ts`.
- [ ] `scripts/ratchet.sh` → `ratchet: ok` dengan lock yang sudah diturunkan.
- [ ] Tangkapan layar sebelum/sesudah, dari `bun run dev` atau `epemdi.ai.id` (bukan
      `next build`), untuk setiap halaman yang tersentuh: `/penilaian`, `/dashboard-pemdi/prosn`,
      `/dashboard-pemdi/makro`, `/dashboard-pemdi/spm`, `/kebutuhan`, `/dokumen`, `/indeks`.
      Angka dan label harus identik; sebutkan di PR halaman mana yang tidak berubah sama sekali.
- [ ] `bun run typecheck` lulus dan `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- `suspicious/noArrayIndexKey` (22) dan rule a11y: `FE-2`.
- Menyatukan `dec`/`fmtL`/`ukuran`: `FE-7`.
- Menambah `noUncheckedIndexedAccess` ke `tsconfig.json`: itu perubahan setelan compiler di
  protected path, dan akan memunculkan ratusan temuan baru. Usulkan ke owner, jangan dikerjakan di
  sini.
