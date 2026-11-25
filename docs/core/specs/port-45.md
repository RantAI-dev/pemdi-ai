# `PORT-45` Endpoint data halaman

| | |
| --- | --- |
| Backlog | `PORT-45` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | tidak ada di backlog; tiap endpoint baru bisa mendarat setelah use case yang dipanggilnya parity green |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Sembilan halaman server component membaca `src/lib` langsung, sehingga UI masih memegang logika
backend meski route `/api/*` sudah diporting. Bukti (`grep -rn 'from "@/lib/…"' src/app`):

| Halaman | Membaca |
| --- | --- |
| `src/app/page.tsx` | `muatDasborPemdi`, `muatMakro`, `muatSpm`, `muatProsn` |
| `src/app/indeks/page.tsx`, `indikator/page.tsx`, `temuan/page.tsx` | `muatDasbor` |
| `src/app/kebutuhan/page.tsx` | `hitungKebutuhan` |
| `src/app/dokumen/page.tsx` | `getOpd`, `KEBUTUHAN` (nama) |
| `src/app/opd/page.tsx` | `getOpd`, `getTemaPerOpd`, `readDok` |
| `src/app/data/page.tsx` | `getAplikasi`, `getDataStatistik` |
| `src/app/dashboard-pemdi/[slug]/page.tsx` | `muatKerangka`, `muatMakro`, `muatSpm`, `muatProsn` |
| `src/app/dashboard-pemdi/[slug]/[...jalur]/page.tsx` | `muatKerangka`, `muatMakro`, `muatSpm`, `muatProsn` |
| `src/app/penilaian/page.tsx` | `ASPEK`, `INDIKATOR`, `KRITERIA`, `PREDIKAT` |
| `src/app/tanya`, `src/app/login` | route API (sudah diporting) |

Tanpa endpoint ini, `FE-5` tidak bisa memindahkan halaman satu per satu, dan image `app` tetap
membawa seluruh backend TypeScript.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Setiap halaman menerima data yang sama; yang berubah hanya dari
mana data itu datang.

## Rancangan

- Satu modul route per halaman di `rust/crates/pemdi-api/src/routes/halaman/`, masing-masing
  mendaftarkan route-nya sendiri (`routes::halaman::indeks::routes()`, ADR 0002):
  `GET /api/halaman/beranda`, `/indeks`, `/kebutuhan`, `/dokumen`, `/opd`, `/data`,
  `/dashboard-pemdi/{slug}`, `/dashboard-pemdi/{slug}/{*jalur}`, `/penilaian`.
- Bentuk respons = props yang hari ini dikirim server component ke komponen klien, bukan bentuk
  internal:
  - `/indeks` → `DasborData` (`PORT-33`), sama untuk `/indikator` dan `/temuan` (satu endpoint,
    tiga halaman; halaman memilih field).
  - `/kebutuhan` → `{ kebutuhan: [...] }` tanpa `kata` (seperti `src/app/api/penilaian/route.ts:24`).
  - `/dokumen` → `{ opd: string[], kebutuhan: Record<string, string> }` (dari `KEBUTUHAN`).
  - `/opd` → `{ opd, tema, dok }` bahan `susunOpd` (`src/app/opd/susun.ts`); `susunOpd` sendiri
    tetap di UI karena murni tampilan.
  - `/data` → `{ aplikasi, statistik }` dari `data.ts`.
  - `/dashboard-pemdi/{slug}` → `{ kerangka: DataKerangka }` untuk `pemdi`/`spm`/`prosn`;
    `/dashboard-pemdi/makro` → `{ makro: DataMakro }`; `?tahun=` divalidasi ke `TAHUN_PILIHAN`
    (`src/lib/makro-tampil.ts`), default `data.tahunUtama`.
  - `/dashboard-pemdi/{slug}/{*jalur}` → `DataKerangka` dengan `ketemu: false` → `404`
    `{"error":"Halaman tidak ditemukan."}`.
  - `/penilaian` → `{ aspek, indikator, kriteria, predikat }` (data statis `src/data/pemdi.ts`).
- `TAMPIL_PROSN=false` dipertahankan di UI (`src/lib/fitur.ts`): endpoint `prosn` tetap ada, halaman
  yang menyembunyikan. Keputusan menampilkan PROSN adalah `DEC-6`.
- Penambahan bersifat aditif: halaman **tidak diubah** di task ini; `FE-5` yang mengganti pembacaan
  `src/lib` menjadi panggilan API per halaman.
- Oracle: tidak ada logika baru; yang diuji adalah bentuk. Setiap endpoint punya satu kasus
  "bentuk" di `tests/rekaman/halaman/*.json` berisi JSON harapan yang diambil dari render hari ini
  (diambil dengan mencetak props di server component sementara, lalu dibuang).

Daftar "what differs" yang berlaku, spesifik:
- **`undefined` vs `null`:** field opsional di props (`ai`, `nilai`, `catatan`) menjadi `null` di
  kontrak; komponen sudah memakai `??`/`?.`, jadi tidak berubah tampilan.
- **Urutan:** urutan larik sama dengan use case; jangan diurutkan ulang di route.
- **Angka JSON:** D-2; angka tak hingga/NaN tidak boleh muncul (sudah `null` di sumber).
- **Tanggal:** string ISO apa adanya.
- Regex/panjang teks: tidak ada di lapisan ini.

## Kriteria penerimaan

- [ ] Sembilan endpoint mendarat, masing-masing dengan transkrip `curl` di PR.
- [ ] `GET /api/halaman/beranda` memuat empat kunci (`kerangka`, `makro`, `spm`, `prosn`) dan
      `totalIndikator` sama dengan halaman hari ini.
- [ ] `GET /api/halaman/dashboard-pemdi/pemdi/3/1` mengembalikan `jejak` 2 node; jalur asing → `404`.
- [ ] `GET /api/halaman/penilaian` memuat 7 aspek, 20 indikator, 20 kriteria (5 tingkat), 5 predikat.
- [ ] Tidak ada berkas `src/app/**/page.tsx` yang berubah di PR ini (`git diff --stat src/app` hanya
      kosong atau berkas baru).
- [ ] Tidak ada endpoint yang mengembalikan `RegExp`/`kata`.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Mengubah halaman menjadi klien API (`FE-5`), menghapus `src/lib` yang sudah tidak dipakai
(`FE-12`, setelah `PORT-47`), dan endpoint `/api/ask/saran` (tetap TS sampai halaman Tanya pindah).
