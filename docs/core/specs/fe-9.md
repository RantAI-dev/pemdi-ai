# `FE-9` Satu set primitif tampilan

| | |
| --- | --- |
| Backlog | `FE-9` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | S |
| Blocked by | `FE-7` (primitive memakai `src/components/format.ts` untuk angka) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Tiga primitive yang sama ditulis berkali-kali, dengan satu perbedaan kecil yang membuat hasilnya
tidak seragam:

| Primitive | Salinan | Beda |
| --- | --- | --- |
| `Judul` | `src/app/dasbor.tsx:55`, `src/app/dashboard-pemdi/dasbor-pemdi.tsx:43`, `src/components/viz-laporan.tsx:22`, `src/components/viz-opd.tsx:12` | empat badan identik |
| `Baris` (kunci–nilai) | `src/app/dasbor.tsx:56`, `src/app/dashboard-pemdi/dasbor-pemdi.tsx:44`, `src/app/kebutuhan/kebutuhan.tsx:41`, `src/components/viz-laporan.tsx:23`, `src/components/viz-opd.tsx:13` | `viz-laporan` memakai `text-right` pada nilai, empat lainnya tidak |
| Header halaman | `PageHeader` `src/components/ui.tsx:3` vs `KepalaHalaman` `src/components/viz-bukti.tsx:16` | dua komponen, dua gaya: `PageHeader` punya `description` + `actions`; `KepalaHalaman` punya `subjudul` "Kab. Tulang Bawang Barat", `info` (InfoTip), `angka[]`, `aksi` |

`<Judul>` dipakai 64 kali dan `<Baris>` 70 kali di `src/app` dan `src/components`. Satu perubahan gaya
label harus dikerjakan lima kali hari ini.

## Yang didapat pengguna

Tidak ada yang berubah di layar, kecuali bahwa header dan baris kunci–nilai tampil sama di semua
halaman: judul, (i), angka ringkas, dan tombol aksi berada di tempat yang sama.

## Rancangan

Semua masuk `src/components/ui.tsx` (design system, 202 baris — jauh di bawah batas 600). Jangan
membuat berkas baru untuk tiga komponen; `ui.tsx` sudah jadi tempatnya.

```tsx
export function Judul({ children }: { children: React.ReactNode });

export function Baris({ k, v, rata }: { k: React.ReactNode; v: React.ReactNode; rata?: "kanan" });

export function KepalaHalaman({
  judul, sub, info, angka, aksi,
}: {
  judul: string;
  sub?: React.ReactNode;              // dulu `description` (PageHeader) atau "Kab. …" (KepalaHalaman)
  info?: React.ReactNode;             // isi InfoTip di samping judul
  angka?: [React.ReactNode, string][];
  aksi?: React.ReactNode;
});
```

Aturan:

- `Baris` dengan `rata="kanan"` menghasilkan `text-right` pada nilai — itu satu-satunya perbedaan
  yang dipertahankan, karena nilai panjang di tabel laporan terbungkus ke kiri tanpa itu.
- `KepalaHalaman` mempertahankan kedua tampilan: `sub` boleh string atau node; baris kecil
  "Kab. Tulang Bawang Barat" hanya dirender bila `sub` **tidak** diberikan (itu perilaku
  `KepalaHalaman` sekarang, `viz-bukti.tsx:19`).
- `PageHeader` dan `KepalaHalaman` lama dihapus setelah pemakainya pindah; jangan menyisakan alias.
- Angka diformat dengan `src/components/format.ts` (`FE-7`), bukan `toLocaleString` baru.

Pemakainya yang harus dipindah (semua, satu PR):

| Primitive | Berkas |
| --- | --- |
| `Judul` | `src/app/dasbor.tsx` (atau `src/features/indeks-pemdi/**` bila `FE-1b` sudah merge), `src/app/dashboard-pemdi/dasbor-pemdi.tsx` (atau `src/features/beranda/**`), `src/components/viz-laporan.tsx`, `src/components/viz-opd.tsx` |
| `Baris` | idem + `src/app/kebutuhan/kebutuhan.tsx` |
| Header | `src/components/ui.tsx` (`PageHeader`), `src/components/viz-bukti.tsx` (`KepalaHalaman`), dan pemakainya: `src/app/{kebutuhan,penilaian,dokumen,opd,data}/**`, `src/components/{makro,spm,prosn}-halaman.tsx` |

Karena `FE-1`/`FE-4` memindahkan berkas, kerjakan PR ini **setelah** PR pemindahan yang
menyentuhnya merge, atau ubah juga impor di lokasi barunya. Jangan mengerjakan dua-duanya sekaligus
di satu berkas.

### Test

`src/components/ui.test.tsx` tidak dipakai: repo ini belum punya React Testing Library dan
menambah dependensi butuh persetujuan owner. Bukti untuk primitive tampilan adalah tangkapan layar,
ditambah satu test murni bila ada logika: `Baris` tidak punya logika, `KepalaHalaman` hanya
memutuskan baris "Kab. …". Bila keputusan itu diekstrak ke `subjudulDari(sub)`, uji fungsi itu di
`src/components/ui.test.ts` (tanpa render).

## Kriteria penerimaan

- [ ] `git grep -n 'const Judul = ' src` → 0; `git grep -n 'const Baris = ' src` → 0.
- [ ] `git grep -n 'export function PageHeader\|export function KepalaHalaman' src` → 1 (keduanya
      di `src/components/ui.tsx`, sebagai satu `KepalaHalaman`).
- [ ] `bun run typecheck` lulus; `bunx biome lint .` tidak bertambah.
- [ ] Tangkapan layar sebelum/sesudah dari `bun run dev` atau `epemdi.ai.id` (bukan
      `next build`) untuk enam halaman: `/kebutuhan`, `/penilaian`, `/dokumen`, `/opd`,
      `/dashboard-pemdi/makro` (tab Laporan), `/dashboard-pemdi/spm`. Header, (i), angka ringkas,
      dan tombol aksi harus di posisi yang sama; nilai panjang pada tabel laporan tetap rata kanan.
- [ ] `scripts/check.sh` PASS; bila `ts-lint` turun, `scripts/ratchet.sh --update` di PR yang sama
      (lock protected, sebutkan persetujuan owner).

## Yang tidak dikerjakan

- Menambah React Testing Library atau Playwright: dependensi baru, butuh persetujuan owner.
  Bukti visual tetap tangkapan layar.
- Menyatukan `InfoTip` (`src/components/viz.tsx`) dan `Tip` (`src/components/viz.tsx`): keduanya
  beda maksud (tooltip ikon vs tooltip grafik); bukan duplikasi.
- Memecah `src/components/viz-laporan.tsx` (543 baris): audit §7 #12, hanya saat disentuh oleh
  `FE-10`/`FE-11`.
