# `FE-2` Tiga rule aksesibilitas Biome ke nol

| | |
| --- | --- |
| Backlog | `FE-2` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | M |
| Blocked by | `FE-4a` — tanpa `bun run lint` di gate, penurunan angka tidak bisa dibuktikan |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Tiga rule aksesibilitas Biome berisi 37 error pada 6 berkas. Hanya `div`/`span` yang bisa diklik
dengan mouse, jadi satu bagian aplikasi tidak bisa dipakai dengan keyboard.

Diukur 2026-11-25 dengan `bunx biome lint . --max-diagnostics=3000 --reporter=json`:

| Berkas | `noStaticElementInteractions` | `useKeyWithClickEvents` | `useSemanticElements` | Total |
| --- | --- | --- | --- | --- |
| `src/components/viz-spm.tsx` | 6 | 6 | 2 | 14 |
| `src/components/viz-prosn.tsx` | 3 | 4 | 1 | 8 |
| `src/components/viz-makro.tsx` | 3 | 3 | 1 | 7 |
| `src/app/dashboard-pemdi/dasbor-pemdi.tsx` | 3 | 3 | 0 | 6 |
| `src/app/dokumen/dokumen.tsx` | 1 | 0 | 0 | 1 |
| `src/components/viz.tsx` | 1 | 0 | 0 | 1 |
| **Jumlah** | **17** | **16** | **4** | **37** |

Polanya sedikit dan berulang:

- Kartu yang bisa diklik seluruhnya: `role="link" tabIndex={0} onClick` di
  `src/components/viz-spm.tsx:180`, `:289`. Isinya lalu memasang `onClick={(e) =>
  e.stopPropagation()}` di setiap pembungkus (`:188`, `:226`, `:253`, `:316`) supaya klik di dalam
  kartu tidak ikut menavigasi.
- Pembungkus grafik dan chip yang hanya menghentikan gelembung: `src/components/viz-spm.tsx:220`,
  `src/components/viz-makro.tsx`, `src/components/viz-prosn.tsx`, sama polanya.
- Zona unggah seret-lepas: `src/app/dokumen/dokumen.tsx:229` (`onDragOver`/`onDrop` di `div`).
- Pemicu tooltip: `src/components/viz.tsx:51` (`span` dengan `onMouseEnter`/`onFocus`).

## Yang didapat pengguna

Kartu, chip, dan sel peta bisa dicapai dengan Tab, lalu dibuka dengan Enter atau Space. Pembaca
layar mengumumkan hal yang sama dengan yang terlihat.

## Rancangan

Perbaiki sumbernya, bukan gejalanya. Untuk setiap temuan pilih satu dari tiga pola:

1. **Kartu yang seluruhnya bisa diklik** → jadikan elemen yang memang interaktif. Bila tujuannya
   satu tautan, seluruh isi kartu dibungkus `<Link href={…}>` dari `next/link`; bila aksinya
   JavaScript, pakai `<button type="button">`. Setelah itu hapus semua pembungkus
   `onClick={(e) => e.stopPropagation()}` yang tadi hanya menahan gelembung — kecuali yang benar-
   benar menahan klik pada tombol di dalam tautan.
2. **Grafik/chip di dalam kartu** → tetap `div`/`span` tanpa `onClick`. Yang diklik adalah
   elemen interaktif di kartu itu, bukan pembungkusnya.
3. **`div role="…"` yang ada elemen aslinya** → ganti dengan elemen itu: `role="link"` → `<a>` atau
   `<Link>`, `role="table"`/`row`/`cell` → `<table>`/`<tr>`/`<td>`; `role="list"` → `<ul>`/`<li>`.
4. **Zona seret-lepas** → `<button type="button">` yang membuka pemilih berkas (`<input
   type="file">` tersembunyi tetap ada), atau `div` dengan `role="button" tabIndex={0}` dan
   `onKeyDown` untuk Enter/Space. Pilih satu; jangan dua-duanya.
5. **Pemicu tooltip** → `<button type="button">` dengan `aria-describedby` ke isi tooltip.

Jangan memakai `biome-ignore`, jangan menghapus `tabIndex`, dan jangan menambah handler keyboard
pada `div` bila elemen aslinya tersedia — itu hanya memindahkan temuan ke `useSemanticElements`.

Urutan PR: satu berkas per PR bila memungkinkan, mulai dari `viz-spm.tsx` (14) karena polanya
paling jelas, lalu `viz-prosn.tsx`, `viz-makro.tsx`, `dasbor-pemdi.tsx`, `dokumen.tsx`, `viz.tsx`.
Bila satu PR memuat semua, selesaikan per berkas dan sebutkan hasil per berkas di badan PR.

### Gate dan ratchet

`bun run lint` baru bisa masuk gate setelah angkanya nol (`FE-4a`). Sampai itu, buktinya adalah
angka per rule. Turunkan `ts-lint` di `.agents/ratchet.lock` dengan `scripts/ratchet.sh --update`
di PR terakhir; berkas lock **protected**, jadi sebutkan di PR bahwa owner harus menyetujuinya.
Jangan menaikkan angka rule lain, termasuk `suspicious/noArrayIndexKey` (22) yang tidak termasuk
tugas ini.

### Bukti keyboard

Selain tangkapan layar, tulis transkrip: Tab dari atas halaman sampai kartu pertama, Enter membuka
halaman layanan, Space pada tombol, dan fokus kembali sesudah dialog ditutup. Simpan sebagai teks
di badan PR, bukan berkas di repo.

## Kriteria penerimaan

- [ ] `bunx biome lint . --reporter=summary` menunjukkan
      `lint/a11y/noStaticElementInteractions` 0, `lint/a11y/useKeyWithClickEvents` 0,
      `lint/a11y/useSemanticElements` 0.
- [ ] Total error Biome turun tepat 37 dari angka saat PR dibuka (125 pada 2026-11-25; 88 bila
      `FE-3` belum merge, 41 bila `FE-3` sudah). Tidak ada rule lain yang naik. Angka yang dipakai
      adalah keluaran perintah yang sama dengan `ts-lint` di `.agents/ratchet.tsv`.
- [ ] `scripts/ratchet.sh` → `ratchet: ok`; lock diturunkan lewat `--update` dan disetujui owner.
- [ ] Tangkapan layar sebelum/sesudah `/dashboard-pemdi/spm`, `/dashboard-pemdi/spm/<bidang>`,
      `/dashboard-pemdi/makro`, `/dashboard-pemdi/prosn`, `/`, `/dokumen` — dari `bun run dev`
      atau `epemdi.ai.id`, bukan `next build`.
- [ ] Transkrip keyboard di badan PR: Tab mencapai setiap kartu yang tadi bisa diklik, Enter/Space
      membukanya, dan fokus terlihat (cincin fokus tidak dihapus).
- [ ] `bun run typecheck` lulus dan `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- `suspicious/noArrayIndexKey` (22) — kunci React dari indeks; sebagian data memang tanpa id.
  Perlu keputusan bentuk data, catat sebagai temuan di PR.
- `a11y/noAutofocus` (3) dan `a11y/noSvgWithoutTitle` (1): rule lain, bukan tugas ini.
- Menyatukan `Badge` dan `Chip`: `FE-8`.
