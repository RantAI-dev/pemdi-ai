# `FE-7` Satu modul format angka

| | |
| --- | --- |
| Backlog | `FE-7` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | S |
| Blocked by | `FE-4a` (gate yang menjalankan `bun test`) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Angka di aplikasi ini diformat oleh 13 tempat berbeda. Yang terukur (`docs/port/frontend-audit.md`
§4):

| Yang diduplikasi | Lokasi | Catatan |
| --- | --- | --- |
| `dec(n, d)` | `src/lib/makro-tampil.ts:11`, `src/lib/spm-tampil.ts:154`, `src/lib/prosn-tampil.ts:103`, `src/lib/utils.ts:14` (`fmtDec`) | empat salinan, badan sama |
| `fmtL` (angka bertanda `+/−/±` dengan `%`) | `src/components/spm-halaman.tsx:223`, `src/components/spm-detail.tsx:49` | identik byte-per-byte |
| `ukuran` (KB/MB) | `src/components/viz-laporan.tsx:379` vs `fmtBytes` di `src/lib/utils.ts:24` | dua pembulatan berbeda |
| `toLocaleString("id-ID", …)` inline | `src/components/viz-laporan.tsx:250`, `src/components/viz.tsx:233`, `src/components/charts.tsx:327`, `src/app/tanya/tanya.tsx:50`, `src/components/viz-makro.tsx:338`, `src/components/viz-spm.tsx:377` | enam tempat, tiga gaya pembulatan |

Akibatnya satu angka bisa tampil `4,88` di satu halaman dan `4,9` di halaman lain, dan tidak ada
satu tempat untuk membetulkan pemisah desimal.

## Yang didapat pengguna

Tidak ada yang berubah di layar: setiap angka yang tampil hari ini tampil sama setelah PR ini.
Yang berubah: satu fungsi untuk satu maksud, dan test yang menangkap perubahan pembulatan yang
tidak disengaja.

## Rancangan

Modul baru `src/components/format.ts` (bukan `src/lib`: `src/components` adalah design system,
`src/lib` menyusut setelah cutover). Murni, tanpa React, tanpa I/O.

```ts
export function angka(n: number | null | undefined, maksDesimal = 2): string;      // 1234 -> "1.234"
export function desimal(n: number | null | undefined, d = 2): string;              // 4.8 -> "4,80"
export function persen(n: number | null | undefined, d = 2): string;               // 96.59 -> "96,59%"
export function persenPecahan(n: number | null | undefined, d = 0): string;        // 0.9659 -> "97%"
export function bertanda(n: number, d = 2): string;                                // 4.8 -> "+4,80", -4.8 -> "−4,80", 0 -> "±0,00"
export function laju(n: number | null | undefined, d = 2): string;                 // bertanda + "%"
export function poin(n: number | null | undefined, d = 2): string;                 // bertanda + " poin"
export function ukuranKb(kb: number | null, d = 1): string;                        // 2048 -> "2 MB", 512 -> "512 KB"
export function ukuranByte(b: number): string;                                     // 2048 -> "2 KB", 1.500.000 -> "1.4 MB"
export function potong(s: string, maks: number): string;                           // label grafik
export function kosong(): string;                                                  // "–" (en dash)
```

Aturan yang harus dipertahankan persis, karena semuanya terlihat di layar:

- Nilai `null`, `undefined`, atau `NaN` → `"–"` (en dash U+2013), bukan `"-"` atau `"0"`.
- Tanda minus memakai U+2212 (`−`), bukan hyphen. Nol bertanda `±`.
- `persen(100)` → `"100%"` tanpa desimal (perilaku `fmtSpm` di `src/lib/spm-tampil.ts:156`).
- `persenPecahan` mengalikan 100 lebih dulu (perilaku `fmtPct` di `src/lib/utils.ts:20`);
  `persen` menerima angka 0–100. Dua nama sengaja dibedakan supaya tidak ada yang salah kalikan.
- `ukuranKb` dan `ukuranByte` **berbeda pembulatan dengan sengaja**: `ukuranKb` (dari
  `viz-laporan.tsx:379`) memakai 1 desimal untuk MB; `ukuranByte` (dari `utils.ts:24`) memakai
  `toFixed(0)` untuk KB dan `toFixed(1)` untuk MB. Menyeragamkannya mengubah tangkapan layar
  `/dokumen` dan daftar sumber; jangan. Beri komentar satu baris di masing-masing fungsi.
- `Intl.NumberFormat` dibuat sekali di tingkat modul, bukan per panggilan.

Pemakaian: ganti keempat `dec`, kedua `fmtL`, `ukuran`, `fmtBytes`, dan keenam `toLocaleString`
inline dengan fungsi di atas. Hapus salinannya; jangan menyisakan satu pun sebagai alias
(`export const fmtL = laju` ditolak — nanti ada yang memakai yang lama).

`src/lib/utils.ts` menyimpan `cn`, `fmtInt`, `fmtDec`, `fmtPct`, `fmtBytes` yang dipakai 20+ berkas.
Jangan hapus di PR ini: jadikan `fmtDec`/`fmtPct`/`fmtBytes` delegasi satu baris ke
`src/components/format.ts`, dan catat penghapusannya untuk PR yang menyentuh pemakainya terakhir.
`src/lib/utils.ts` tidak boleh mengimpor React; `src/components/format.ts` juga tidak.

### Test karakterisasi

`src/components/format.test.ts`, ditulis **sebelum** mengganti pemanggil, dengan nilai harapan
diambil dari keluaran hari ini (jalankan fungsi lama, salin stringnya):

| Fungsi | Masukan | Harapan |
| --- | --- | --- |
| `desimal` | `4.8, 2` | `"4,80"` |
| `desimal` | `null` | `"–"` |
| `angka` | `1234567` | `"1.234.567"` |
| `persen` | `96.59` | `"96,59%"` |
| `persen` | `100` | `"100%"` |
| `persenPecahan` | `0.9659, 0` | `"97%"` |
| `bertanda` | `-4.8` | `"−4,80"` |
| `bertanda` | `0` | `"±0,00"` |
| `laju` | `2.345` | `"+2,35%"` |
| `poin` | `-1.2` | `"−1,20 poin"` |
| `ukuranKb` | `2048` | `"2 MB"` |
| `ukuranByte` | `1500000` | `"1.4 MB"` |
| `potong` | `"Pelayanan Pencegahan dan Kesiapsiagaan"`, `18` | sama dengan `short()` di `src/components/charts.tsx:75` |

## Kriteria penerimaan

- [ ] `src/components/format.ts` ada; `bun test src/components/format.test.ts` lulus semua baris
      tabel di atas.
- [ ] `git grep -n 'const dec = ' src` → 0; `git grep -n 'const fmtL = ' src` → 0;
      `git grep -n 'toLocaleString("id-ID"' src` hanya menyisakan `src/components/format.ts`.
- [ ] `bun run typecheck` lulus; `bunx biome lint .` tidak bertambah (125 pada 2026-11-25).
- [ ] Tangkapan layar sebelum/sesudah, dari `bun run dev` atau `epemdi.ai.id` (bukan
      `next build`): `/dashboard-pemdi/makro`, `/dashboard-pemdi/spm`,
      `/dashboard-pemdi/spm/<bidang>/<layanan>`, `/dashboard-pemdi/prosn`, `/indeks`, `/tanya`.
      Setiap angka harus identik; sebutkan di PR bila ada yang berubah dan mengapa.
- [ ] `scripts/ratchet.sh` → `ratchet: ok`. Bila `ts-lint` turun, jalankan
      `scripts/ratchet.sh --update` di PR yang sama dan sebutkan di PR bahwa
      `.agents/ratchet.lock` (protected) disetujui owner.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- Kosakata status dan chip: `FE-8`.
- Primitif `Judul`/`Baris`/header halaman: `FE-9`.
- Menghapus `fmtDec`/`fmtPct`/`fmtBytes` dari `src/lib/utils.ts`: PR yang menyentuh pemakai
  terakhirnya.
- Format tanggal dan waktu: belum ada duplikasi yang terukur; jangan menambah permukaan baru.
