# `FE-1` Pecah `dasbor.tsx` dan hapus impor lintas-rute

| | |
| --- | --- |
| Backlog | `FE-1` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | M dua PR: (a) pecah berkas, (b) hapus impor lintas-rute |
| Blocked by | tidak ada; bagian (b) menunggu `FE-1a` |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/app/dasbor.tsx` 733 baris. Berkas itu dibekukan di `.agents/size-baseline.tsv` (baris
`src/app/dasbor.tsx 733`), jadi hari ini **tidak boleh tumbuh satu baris pun**, dan
`scripts/file-size.sh` melaporkannya sebagai melewati batas 600. Isinya empat panel yang tidak
saling memanggil: `Ringkasan` mulai baris 297, `TabIndikator` 448, `TabTemuan` 632, ditambah
`Pilih` (70) dan `KartuTemuan` (132). Tiga rute mengimpor berkas itu lewat jalur rute lain
(`src/app/indeks/page.tsx:1`, `src/app/indikator/page.tsx:1`, `src/app/temuan/page.tsx:1`), dan
`src/app/page.tsx:1` mengimpor `@/app/dashboard-pemdi/dasbor-pemdi`. Setelah `FE-4a` menyala,
aturan 2 `scripts/check-boundaries.ts` menolak keempat impor itu. Keduanya harus beres sebelum
pemindahan fitur di `FE-4b`/`FE-4c`.

## Yang didapat pengguna

Tidak ada yang berubah di layar. `/indeks`, `/indikator`, dan `/temuan` tetap menampilkan angka,
filter, dan urutan yang sama, dengan kode yang bisa diubah satu panel tanpa menyentuh panel lain.

## Rancangan

### Bagian (a) — pecah berkas, satu PR

`src/app/dasbor.tsx` menjadi folder `src/app/dasbor/`. Tidak ada `page.tsx` di dalamnya, jadi Next
tidak membuat rute baru.

| Berkas baru | Isi (baris lama) |
| --- | --- |
| `src/app/dasbor/jenis.ts` | `Status`, `DasborData`, `Tab`, `Sort`, `Hasil`, `AspekTampil`, `PerInd`; `WARNA`, `pendek`, `pendekAspek`, `tombol`, `JUDUL`, `STATUS` (32–67, 162–163, 290–295) |
| `src/app/dasbor/panel/pilih.tsx` | `Pilih` (70–129) |
| `src/app/dasbor/kartu-temuan.tsx` | `KartuTemuan` (132–160) |
| `src/app/dasbor/panel/ringkasan.tsx` | `Ringkasan` (297–444) |
| `src/app/dasbor/panel/indikator.tsx` | `TabIndikator` (448–628) |
| `src/app/dasbor/panel/temuan.tsx` | `TabTemuan` (632–733) |
| `src/app/dasbor/index.tsx` | `Dasbor` (164–289) + re-export `DasborData`, `Tab` |

Aturan pemindahan:

- Pindahkan kode apa adanya. Jangan mengubah angka, label, kelas, urutan filter, atau rumus.
- `index.tsx` tetap satu-satunya berkas yang mengekspor `Dasbor`; rute tidak berubah.
- Setiap berkas baru di bawah 600 baris (perkiraan terbesar: `panel/indikator.tsx` ≈ 185).
- Komentar `/** … */` di kepala berkas ikut pindah ke `index.tsx`.
- `bunx biome lint src/app/dasbor` tidak boleh menambah temuan: `dasbor.tsx` hari ini 8 error
  1 warning, dan jumlah itu berpindah, bukan bertambah.

### Bagian (b) — hapus impor lintas-rute, satu PR

1. `git mv src/app/dasbor src/features/indeks-pemdi/dasbor`, lalu tambah
   `src/features/indeks-pemdi/index.ts` yang mengekspor `Dasbor`, `DasborData`, `Tab`,
   `KartuTemuan`.
2. `git mv src/app/dashboard-pemdi/dasbor-pemdi.tsx src/features/beranda/dasbor-pemdi.tsx`, lalu
   tambah `src/features/beranda/index.ts` yang mengekspor `DasborPemdi`.
3. Empat rute mengimpor dari `@/features/…` (bukan `@/app/…`). `src/lib/dasbor-data.ts:6` mengimpor
   `type DasborData` dari `@/features/indeks-pemdi`; impor tipe saja, dan `FE-6` nanti memindahkan
   tipe itu ke `src/contracts/`.
4. `src/app/dasbor/` dan `src/app/dashboard-pemdi/dasbor-pemdi.tsx` tidak ada lagi.

### Bukti visual

Tangkapan layar sebelum dan sesudah, dari `bun run dev` (http://localhost:3100) atau
`epemdi.ai.id` — **bukan** `next build`, karena build image hanya di host Portainer (`AGENTS.md`
Traps). Rute dan keadaan yang wajib:

- `/indeks`
- `/indikator?aspek=2`
- `/temuan?opd=<satu nama OPD dari daftar di halaman>` (pakai OPD yang punya temuan)
- `/` (hanya bagian b, untuk `DasborPemdi`)

Tempel di badan PR sebagai pasangan sebelum/sesudah dengan nama rute dan resolusi layar.

### Ratchet

Kalau jumlah temuan lint turun, jalankan `scripts/ratchet.sh --update` di PR yang sama. Angka di
`.agents/ratchet.lock` adalah lock; berkas itu **protected path**, jadi perubahan itu harus
disetujui owner di PR. Jangan `--reset`, jangan menaikkan angka.

## Kriteria penerimaan

Bagian (a):

- [ ] `scripts/file-size.sh --list` tidak lagi memuat `src/app/dasbor.tsx`.
- [ ] `wc -l src/app/dasbor/*.ts* src/app/dasbor/panel/*.tsx` — tidak ada berkas di atas 600.
- [ ] `bun run typecheck` lulus.
- [ ] `bunx biome lint src/app` ≤ 51 error dan `scripts/ratchet.sh` → `ratchet: ok`.
- [ ] Tangkapan layar `/indeks`, `/indikator?aspek=2`, `/temuan?opd=…` sebelum/sesudah: angka,
      filter, dan urutan sama.
- [ ] Baris `src/app/dasbor.tsx` di `.agents/size-baseline.tsv` dihapus di PR yang sama
      (**protected**, owner menyetujui), atau dicatat di PR bila owner belum menjawab.
- [ ] `scripts/check.sh` PASS.

Bagian (b):

- [ ] `grep -rn 'from "@/app/' src | wc -l` → `0`.
- [ ] `bun run boundaries` → `boundaries: ok` (bila `FE-4a` sudah merge).
- [ ] Empat rute pada daftar bukti visual punya pasangan tangkapan layar sebelum/sesudah.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- Memecah `src/app/dasbor/` menjadi `halaman.tsx` + `panel/*` penuh dengan `index.ts` sebagai satu-
  satunya permukaan publik, dan `tampil.ts`: itu `FE-4b`.
- Memindahkan `src/app/page.tsx` dan rute lain ke satu komponen per fitur: `FE-4c`.
- Menghapus `src/lib/dasbor-data.ts`: modul server itu hilang saat `FE-5f` mengambil data lewat API.
