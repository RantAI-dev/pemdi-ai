# `FE-8` Satu kosakata status dan satu chip

| | |
| --- | --- |
| Backlog | `FE-8` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | S |
| Blocked by | `FE-7` (modul format dipakai ulang oleh chip yang menampilkan angka) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Empat status yang sama (`terpenuhi`, `sebagian`, `perlu_dicek`, `belum_ada`) didefinisikan lima
kali, dengan warna dan label yang tidak selalu sama:

| Sumber | Isi | Dipakai |
| --- | --- | --- |
| `src/app/dasbor.tsx:48` | `STATUS`: key, `nama`, `warna` (4 baris) | 3 rute indeks |
| `src/app/kebutuhan/kebutuhan.tsx:29` | `STATUS`: key, `label`, `arti` + `LABEL` turunan di `:36` | `/kebutuhan` |
| `src/app/penilaian/penilaian.tsx` (`LABEL_STATUS`) | label saja | `/penilaian` |
| `src/components/ui.tsx:182` | `STATUS_KEBUTUHAN` + `StatusKebutuhan` memakai `Badge` (`:54`) | `/opd`, `/penilaian` |
| `src/components/viz-bukti.tsx:214` | `WARNA_STATUS` + `Chip` (`:222`) | 8 berkas |

Ada dua ketidakcocokan yang terlihat di layar:

- `perlu_dicek` berwarna `var(--viz-ref)` di `dasbor.tsx:51` tetapi `var(--status-none)` di
  `viz-bukti.tsx:217`. Satu status, dua warna.
- Dua komponen chip yang berbeda: `Badge` (`h-5`, `text-xs`, tanpa titik, hanya dipakai
  `src/app/opd/opd-tampilan.tsx` dan `StatusKebutuhan`) dan `Chip` (`h-5`, `text-[11px]`, dengan
  titik, dipakai 8 berkas).

## Yang didapat pengguna

Warna dan kata untuk satu status sama di semua halaman. Satu perubahan warna berlaku di seluruh
aplikasi.

## Rancangan

Modul baru `src/components/status.ts`, murni, tanpa React:

```ts
export type Status = "terpenuhi" | "sebagian" | "perlu_dicek" | "belum_ada";

export const STATUS: Record<Status, { label: string; warna: string; arti: string }> = {
  belum_ada: { label: "Belum ada", warna: "var(--status-serious)", arti: "…" },
  sebagian: { label: "Sebagian", warna: "var(--status-warning)", arti: "…" },
  perlu_dicek: { label: "Perlu dicek", warna: "var(--status-none)", arti: "…" },
  terpenuhi: { label: "Terpenuhi", warna: "var(--status-good)", arti: "…" },
};
export const URUT_STATUS: Status[];   // belum_ada, sebagian, perlu_dicek, terpenuhi
export const labelStatus = (s: Status) => STATUS[s].label;
export const warnaStatus = (s: Status) => STATUS[s].warna;
export const artiStatus = (s: Status) => STATUS[s].arti;
```

Keputusan yang diambil di sini, supaya pelaksana tidak memilih sendiri:

- Warna `perlu_dicek` menjadi `var(--status-none)` (dari `viz-bukti.tsx:217`), karena
  `--status-none` adalah token status dan `--viz-ref` token grafik. Ini mengubah warna satu chip di
  `/indeks` keluarga; tangkap layarnya ada di bukti.
- Teks `arti` diambil dari `kebutuhan.tsx:30-33` apa adanya; itu satu-satunya sumber yang punya
  kalimat penjelas.
- `URUT_STATUS` mengikuti urutan tampil `dasbor.tsx:48-53` (belum ada → terpenuhi).

Chip tunggal: `Chip` pindah dari `src/components/viz-bukti.tsx` ke `src/components/ui.tsx`
(design system), dengan tanda tangan yang sama (`{ warna?, children, className? }`). Lalu:

- `Badge` dihapus dari `src/components/ui.tsx`. Pemakainya dipindah ke `Chip`;
  `src/app/opd/opd-tampilan.tsx` ikut berubah dari `text-xs` ke `text-[11px]` — itu satu-satunya
  perubahan tampilan yang disengaja, dan masuk tangkapan layar `/opd`.
- `StatusKebutuhan` menjadi `StatusChip` di `src/components/ui.tsx`, memakai `STATUS` dan `Chip`:

```tsx
export function StatusChip({ status }: { status: Status }) {
  return <Chip warna={warnaStatus(status)}>{labelStatus(status)}</Chip>;
}
```

- Kelima tabel di bagian Kenapa dihapus. `kebutuhan.tsx` memakai `StatusChip` + `artiStatus` untuk
  tooltip; `dasbor.tsx` memakai `URUT_STATUS` untuk legenda; `penilaian.tsx` memakai
  `labelStatus`; `viz-bukti.tsx` mengekspor ulang `Chip` dari `ui.tsx` selama pemakainya belum
  pindah, lalu ekspor itu dihapus di PR yang sama.

### Test

`src/components/status.test.ts`:

- `Object.keys(STATUS).sort()` sama dengan keempat `Status` (menangkap status baru yang lupa
  ditambahkan).
- Setiap label dan warna persis seperti tabel di atas.
- `URUT_STATUS` berisi keempat status, tanpa duplikat.
- `labelStatus("perlu_dicek")` → `"Perlu dicek"` (bukan `"Perlu di cek"`).

## Kriteria penerimaan

- [ ] `src/components/status.ts` ada; `bun test src/components/status.test.ts` lulus.
- [ ] `git grep -n 'STATUS_KEBUTUHAN\|LABEL_STATUS\|WARNA_STATUS' src` → 0.
- [ ] `git grep -n 'export function Badge' src` → 0; `git grep -n '<Badge' src` → 0.
- [ ] Hanya satu definisi chip: `git grep -n 'export function Chip' src` → 1 (di
      `src/components/ui.tsx`).
- [ ] `bun run typecheck` lulus; `bunx biome lint .` tidak bertambah.
- [ ] Tangkapan layar sebelum/sesudah dari `bun run dev` atau `epemdi.ai.id` (bukan
      `next build`): `/kebutuhan`, `/penilaian`, `/dokumen`, `/opd`, `/indeks`, `/temuan`.
      Perubahan yang diizinkan hanya warna chip `perlu_dicek` dan ukuran teks chip di `/opd`.
- [ ] `scripts/check.sh` PASS; bila `ts-lint` turun, `scripts/ratchet.sh --update` di PR yang sama
      (lock protected, sebutkan persetujuan owner).

## Yang tidak dikerjakan

- Status di luar empat ini (mis. `Draft`, `Terkirim`, `Diverifikasi` di `/opd`): kosakata berbeda
  untuk keadaan yang berbeda; jangan digabung tanpa keputusan owner.
- Menyatukan `InfoTip`/`Tip` dan `PageHeader`/`KepalaHalaman`: `FE-9`.
- Pustaka grafik (ECharts vs Recharts): audit §7 #11, `FE-10`.
