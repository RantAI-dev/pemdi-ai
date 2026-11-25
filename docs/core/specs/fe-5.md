# `FE-5` Halaman mengambil data lewat klien API, satu PR per halaman

| | |
| --- | --- |
| Backlog | `FE-5` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | L, sepuluh PR (a–j), satu halaman per PR |
| Blocked by | `FE-6` untuk semua bagian; tiap bagian juga menunggu route Rust-nya (kolom **Port** di bawah) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Semua `page.tsx` kecuali `/login` adalah server component yang membaca `src/lib` langsung
(`docs/port/frontend-audit.md` §2). Payload props terukur: `/` 205,0 KB, `/indeks` keluarga
279,8 KB, framework 63,8–131,4 KB. Selama halaman membaca `src/lib`, kode server tidak bisa
dihapus dan UI tetap terikat pada proses Next.js. Setiap halaman juga memuat logika sendiri di
`page.tsx`: `[slug]/page.tsx:20-58` dan `[...jalur]/page.tsx:20-67` mencampur pemilihan komponen,
validasi jalur, dan pemuatan data.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Halaman memuat lebih cepat dan gagal dengan pesan yang jelas,
karena datanya datang dari satu service dengan kontrak tetap, bukan dari fungsi yang berbeda-beda.

## Rancangan

Setiap bagian satu PR, satu halaman, dengan bentuk yang sama:

1. `src/features/<slice>/api.ts` memanggil `apiGet`/`apiPost` dari `src/api/client.ts` dan
   mengembalikan tipe dari `src/contracts/`. Tidak ada `fetch` lain.
2. `page.tsx` tinggal 10–20 baris: `params`/`searchParams` + satu komponen dari
   `src/features/<slice>/index.ts`. Tanpa impor `src/lib` server.
3. Komponen menerima data sebagai props dari loader klien (`api.ts`), atau memuatnya sendiri bila
   halaman butuh penyegaran (dokumen, penilaian).
4. Bukti per PR: transkrip `curl` endpoint yang dipakai, tangkapan layar sebelum/sesudah, dan
   perbandingan angka dengan `epemdi.ai.id`.

Daftar bagian, endpoint, dan PORT yang memblokirnya (audit §7 #14–23):

| Bagian | Halaman | Endpoint | Port |
| --- | --- | --- | --- |
| a | `/data` | `GET /api/data/aplikasi`, `GET /api/data/statistik` | `PORT-30` (use case) + `PORT-45` (endpoint halaman); adapter `PORT-20` |
| b | `/opd` | `GET /api/opd` | `PORT-22` + `PORT-45` |
| c | `/kebutuhan` | `GET /api/kebutuhan?status=&aspek=` | `PORT-31` |
| d | `/penilaian` | `GET/POST /api/penilaian`, `POST /api/penilaian/ai` | `PORT-43` |
| e | `/dokumen` | `GET/POST /api/dokumen`, `POST /api/upload`, `POST /api/upload/ingest` | `PORT-42` |
| f | `/indeks`, `/indikator`, `/temuan` | `GET /api/dashboard` — boleh dipecah menjadi `ringkasan`, `indikator`, dan `temuan?limit&cursor` | `PORT-33` + `PORT-45` |
| g | `/dashboard-pemdi/*` | `GET /api/frameworks/{pemdi,makro,spm,prosn}`, `GET /api/frameworks/{slug}/path` | `PORT-13` + `PORT-23` + `PORT-45` |
| h | `/` | `GET /api/beranda` | `PORT-32` (setelah g) |
| i | `/tanya` | `POST /api/ask` (NDJSON) | `PORT-41` |
| j | `/login` | `POST /api/login`, `POST /api/logout`, middleware sesi | `PORT-40` |

Catatan per bagian:

- **(a)** `/data` hari ini membaca lakehouse lewat `src/lib/data.ts`. Dua endpoint: katalog
  aplikasi (`pemdi_aplikasi`) dan statistik sektoral (`pemdi_data_statistik`), keduanya di
  `src/lib/tables.ts:127-153`. Tabel katalog 100+ baris: pakai `{data,nextCursor}` dengan
  `limit` bawaan 50.
- **(b)** `/opd` membaca registry 293 KB di server dan mengirim ringkasan
  (`src/app/opd/page.tsx` + `susun.ts`). Endpoint harus mengembalikan angka per OPD yang sama
  persis: jumlah pertanyaan, terjawab, dokumen.
- **(c)** Daftar bukti wajib memakai amplop `{data,nextCursor}`; jumlah butir per status
  (68 butir) harus sama dengan produksi.
- **(d)** Halaman ini sudah 100% lewat API, jadi PR-nya paling kecil: ganti `api<T>` lokal
  (`penilaian.tsx:22`) dengan klien, pindahkan `type` ke `src/contracts/penilaian.ts`, dan tambah
  test kontrak: nilai di luar 1–5 → 400 `invalid_request` (bukan 422 seperti hari ini di
  `src/app/api/penilaian/ai/route.ts:14`).
- **(e)** Perlu keputusan polling 3 detik vs SSE. Jangan memutuskan sendiri: pakai polling
  sekarang (perilaku hari ini), catat pilihannya di PR. Unggah satu berkas nyata dan tempel
  responsnya.
- **(f)** Memecah payload 279,8 KB menjadi tiga panggilan: `ringkasan` (indeks + aspek),
  `indikator`, dan `temuan` berhalaman. Angka indeks harus identik dengan produksi — itu bukti
  paritas, bukan tangkapan layar saja.
- **(g)** Keputusan yang harus diambil sebelum PR: slug/jalur yang valid tetap diperiksa di Next
  (usul audit) atau pindah ke Rust. Bila tetap di Next, `page.tsx` hanya memilih komponen dan
  memanggil `notFound()`; daftar jalur yang sah datang dari `GET /api/frameworks/{slug}/path`.
- **(h)** Setelah (g), `/` hanya menggabungkan tiga ringkasan; props turun dari 205 KB. Empat kartu
  harus sama dengan produksi.
- **(i)** Hanya kontrak stream: bentuk NDJSON sama, `ping` tiap 15 detik tetap ada (Cloudflare
  memutus respons diam 100 detik), dan baris `error` membawa `code` + `requestId`. Satu pertanyaan
  nyata, tangkapan layar grafik + tabel, transkrip yang memuat `ping`.
- **(j)** Cookie `pemdi_sesi` tetap kompatibel; login dan logout nyata, 401 memuat `code` dan
  header `WWW-Authenticate`. Middleware sesi pindah ke `src/features/masuk/sesi.ts` saat `PORT-40`
  cutover.

## Kriteria penerimaan

Berlaku untuk setiap bagian:

- [ ] `bun run boundaries` → `boundaries: ok`; `git grep -n 'from "@/lib/\(lakehouse\|store\|data\|makro\|spm\|prosn\|kebutuhan\|penilaian\|opd\)' -- src/app` tidak memuat halaman bagian itu.
- [ ] `wc -l` halaman bagian itu ≤ 20 baris (kecuali `/login`, ≤ 5 baris + komponen fitur).
- [ ] Transkrip `curl -i` endpoint yang dipakai: status 200, `X-Request-Id` ada, badan sesuai
      `src/contracts/`. Untuk endpoint dengan daftar: `{data,nextCursor}`.
- [ ] Tangkapan layar sebelum/sesudah halaman itu, dari `bun run dev` atau `epemdi.ai.id` —
      **bukan** `next build` (build image hanya di host Portainer, `AGENTS.md` Traps).
- [ ] Angka di layar sama dengan produksi; sebutkan angka pembanding di badan PR (indeks, jumlah
      baris, atau angka per OPD sesuai bagian).
- [ ] `bun run typecheck` lulus dan `scripts/check.sh` PASS.

Khusus:

- [ ] (d) test kontrak: `POST /api/penilaian` dengan `nilai: 9` → 400 `invalid_request`.
- [ ] (i) transkrip stream memuat minimal satu `ping` dan satu `done`; memutus koneksi di tengah
      menghasilkan pesan galat, bukan jawaban kosong.
- [ ] (j) login → cookie → buka `/dashboard-pemdi` → logout → `/login`; 401 memuat `code`.

## Yang tidak dikerjakan

- Menghapus `src/lib` server dan `src/app/api/**/route.ts`: `FE-12`, setelah cutover `PORT-47`.
- `GET /api/upload` dan `/api/upload/status` yang tidak dipakai UI: kandidat dihapus di
  `PORT-42`, jangan diporting ke UI.
- Perubahan bentuk respons: dibekukan sampai `PORT-48`.
- Teks galat per `code`: `FE-13`.
