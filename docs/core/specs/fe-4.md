# `FE-4` Struktur per fitur: batas modul, dua fitur pertama, sisanya

| | |
| --- | --- |
| Backlog | `FE-4` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | L, tiga PR: (a) gate, (b) dua fitur, (c) satu PR per fitur sisanya |
| Blocked by | (b) menunggu `FE-1b` dan `FE-4a`; (c) menunggu `FE-4b` |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Tidak ada aturan yang menjaga arah dependensi UI, dan gate tidak menjalankannya. Terukur:

- `scripts/check.sh:33` hanya menjalankan `typecheck`; `package.json` belum punya `lint`,
  `boundaries`, `test` yang diminta `stacks/typescript/README.md` di repo guidelines RantAI, dan
  `scripts/check-boundaries.ts` belum ada.
- Empat rute mengimpor komponen dari folder rute lain (`src/app/indeks/page.tsx:1`,
  `src/app/indikator/page.tsx:1`, `src/app/temuan/page.tsx:1`, `src/app/page.tsx:1`).
- Tujuh `fetch(` di UI tanpa satu klien: `src/app/penilaian/penilaian.tsx:23`,
  `src/app/dokumen/dokumen.tsx:32`, `src/app/login/page.tsx:18`, `src/app/tanya/tanya.tsx:359`
  dan `:391`, `src/components/makro-halaman.tsx:220`, `src/components/shell.tsx:166`.
- `src/lib` berisi 37 modul, 26 butuh server (lakehouse, store, penilaian, …); tidak ada yang
  mencegah komponen klien mengimpornya.

## Yang didapat pengguna

Tidak ada yang berubah di layar; kesalahan arsitektur gagal di gate, bukan di produksi.

## Rancangan

### Bagian (a) — `scripts/check-boundaries.ts` + skrip, satu PR

Bentuk mengikuti `/home/shiro/.rantai/guidelines/stacks/typescript/check-boundaries.ts` (48 baris,
`Glob` + regex per baris, kumpulkan `failures`, cetak ke stderr, `process.exit(1)`; sukses mencetak
`boundaries: ok`). Enam aturan, masing-masing dengan pesan perbaikannya:

1. **UI tidak menyentuh server.** Di `src/features/**`, impor bernilai `@/lib/<nama>` hanya untuk 11
   modul murni (`utils`, `fitur`, `kerangka`, `makro-hitung`, `makro-tampil`, `nilai-tampil`,
   `prosn-hitung`, `prosn-tampil`, `spm-hitung`, `spm-tampil`, `sumber-tampil`); `@/data/**`,
   `@/components/**`, `@/api/client`, `@/contracts/**` boleh; `import type` dikecualikan dan
   jumlahnya dicetak sebagai info. Pesan: `<path>:<line> mengimpor <modul>, modul server. UI tidak
   membaca server. Tambahkan endpoint di Rust, lalu panggil src/api/client.ts.`
2. **Rute tidak mengimpor rute lain.** Di `src/app/<seg>/…`, specifier `@/app/<lain>/…` dengan
   `<lain> ≠ <seg>` gagal; di berkas tanpa segmen (`page.tsx`, `layout.tsx`, `error.tsx`) semua
   `@/app/` gagal. Pesan: `<path>:<line> mengimpor <spec>. Pindahkan komponen ke
   src/features/<slice> dan impor index.ts-nya.`
3. **Satu fitur lewat `index.ts` fitur lain.** Di `src/features/<a>/**`, `../<b>/…` atau
   `@/features/<b>/…` dengan `<b> ≠ <a>` harus persis `../<b>` atau `@/features/<b>`. Pesan:
   `<path>:<line> masuk ke dalam fitur <b> (<spec>). Impor dari "../<b>" (index.ts) saja.`
4. **Kontrak tidak tahu UI.** `src/contracts/**` tidak boleh mengimpor `@/features`, `@/app`, atau
   `@/components`. Pesan: `<path>:<line> mengimpor <spec> dari kontrak. Pindahkan tipe bersama ke
   src/contracts/.`
5. **Fitur tidak melempar.** Di `src/features/**` selain `*.test.ts(x)`, token `throw` pada baris
   kode (komentar `//` dibuang) gagal. Pesan: `<path>:<line> memakai throw. Kode fitur
   mengembalikan Result<T,E>, atau biarkan src/api/client.ts yang menangani galat.`
6. **Satu `fetch`.** `fetch(` di `src/app/**`, `src/features/**`, `src/components/**` gagal kecuali di
   `src/api/client.ts`. Pesan: `<path>:<line> memanggil fetch. Pakai apiGet/apiPost/apiStream dari
   src/api/client.ts.` Tujuh pelanggaran yang diketahui ditaruh di `const FETCH_SEMENTARA = [ … ]`
   ("berkurang oleh FE-6; jangan ditambah"); `--strict` mencetak ketujuhnya sebagai kegagalan.

Aturan 1 menyala untuk `src/features/**` dulu (14 `page.tsx` masih mengimpor `src/lib` server);
`src/app/**` dan `src/components/**` menyusul di PR yang menghapus modul server (`FE-12`).

`package.json` mendapat `"lint": "biome check ."`, `"boundaries": "bun scripts/check-boundaries.ts"`,
`"test": "bun test"`; `bun run lint` setara `bunx biome lint .` (`biome.json` mematikan formatter dan
membatasi `files.includes`), dan angkanya harus sama dengan metrik `ts-lint` (125 pada 2026-11-25).
Penyambungan ke `scripts/check.sh`, satu baris di blok CONFIGURE:

```bash
ts_full()  { bun run typecheck && bun run boundaries && if git ls-files '*.test.ts' '*.test.tsx' | grep -q .; then bun test; fi; }
```

Bug lama `scripts/check.sh:33` (`{ … && bun test || true; }`, test gagal tetap lolos) sudah diperbaiki
planner pada 2026-11-25; bagian ini cukup menambah `lint`/`boundaries` ke `ts_full`.

PR ini menyentuh `scripts/check.sh`, `biome.json`, dan mungkin `.agents/*` — **protected path**
(`.agents/protected-paths`). Badan PR **wajib menyebut** "owner menyetujui perubahan
`scripts/check.sh`" dan menandai reviewer owner; tanpa itu jangan merge, jalankan
`scripts/guard-diff.sh` lebih dulu.

### Bagian (b) — `indeks-pemdi` dan `masuk`, satu PR

`src/features/indeks-pemdi/` berisi `index.ts` (satu-satunya permukaan publik), `halaman.tsx`
(`Dasbor` dari `FE-1b`), `panel/{ringkasan,indikator,temuan,pilih}.tsx`, `kartu-temuan.tsx`,
`jenis.ts`, `tampil.ts`; `src/app/{indeks,indikator,temuan}/page.tsx` tinggal 10–20 baris.
`src/features/masuk/` berisi `index.ts` + `halaman.tsx` (isi `src/app/login/page.tsx`); rutenya 5 baris.

### Bagian (c) — sisanya, satu PR per fitur

Urutan: `kesiapan-opd`, `data-aplikasi`, `dokumen`, `kebutuhan`, `penilaian`, `tanya`,
`kinerja-makro`, `capaian-spm`, `kerangka`, `prosn`, `beranda`. Setiap PR memindahkan berkas rute,
komponen tampilan rute, dan `*-tampil.ts` fitur itu ke `src/features/<slice>/`, dengan `index.ts`
sebagai satu-satunya ekspor.

## Kriteria penerimaan

Bagian (a):

- [ ] `bun scripts/check-boundaries.ts` → `boundaries: ok`; `--strict` gagal dan mencetak tepat
      tujuh pelanggaran `fetch` dari daftar di atas; uji negatif keenam aturan dilampirkan di PR.
- [ ] `bun run lint` mencetak angka yang sama dengan metrik `ts-lint`; `scripts/check.sh` PASS dan
      menyebut `ts ok`; `scripts/check.sh --changed` di bawah 2 menit.
- [ ] Badan PR menyebut persetujuan owner untuk `scripts/check.sh` (protected).

Bagian (b) dan (c):

- [ ] `grep -rn 'from "@/app/' src | wc -l` → `0`; `bun run boundaries` → `ok`; keempat `page.tsx`
      ≤ 20 baris; `bun run typecheck` lulus.
- [ ] Tiap PR: `bun run boundaries` → `ok` dan tangkapan layar rute yang dipindah, sebelum/sesudah,
      dari `bun run dev` atau `epemdi.ai.id` (bukan `next build`).
- [ ] `git grep -n 'from "@/lib/\(lakehouse\|store\|penilaian\|makro\|spm\|prosn\|data\|kebutuhan\)' -- 'src/app' 'src/components'`
      tidak bertambah di tiap PR; di PR terakhir aturan 1 menyala untuk `src/app/**` dan
      `src/components/**`.

## Yang tidak dikerjakan

- Mengganti 26 modul server dengan panggilan API (`FE-5a`–`FE-5j`, `FE-12`); `src/proxy.ts` dan
  `src/app/api/**` hilang saat cutover (`PORT-47`).
