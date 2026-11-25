# Audit frontend dan struktur target

Keadaan UI Next.js terhadap guidelines dan terhadap rencana port backend ke Rust
([README.md](README.md), [../adr/0001-backend-rust.md](../adr/0001-backend-rust.md)). Isinya
fakta yang diukur dengan perintah, bukan perkiraan. Semua angka diukur pada 2026-11-25 08:02 UTC,
`HEAD` = `464c3c7`, checkout bersama `chore/guidelines`.

## 1. Cara mengukur

```bash
bunx biome lint . --reporter=summary          # 134 error, 8 warning, 7 info, 123 berkas
bunx biome lint . --max-diagnostics=2000 --reporter=json > /tmp/biome.json   # per berkas/per rule
find src/app -name page.tsx | wc -l           # 14
find src/app/api -name route.ts | wc -l       # 13
wc -l $(find src -name '*.ts' -o -name '*.tsx') | tail -1                   # 16128
git ls-files '*.test.ts' '*.test.tsx' | wc -l # 0 — belum ada test TypeScript (TEST-1)
scripts/ratchet.sh                            # ok; ts-lint 134 = lock
```

Ukuran payload diukur dengan memanggil loader data apa adanya dari Bun dan menghitung
`JSON.stringify(...).length`. Skripnya sementara, ditulis di dalam repo (impor relatif, karena
alias `@/` tidak dipakai Bun di luar proyek), lalu dihapus:

```bash
bun .tmp-measure/payload.ts
# makro 73,5 KB · spm 125,5 · prosn 131,4 · dasborPemdi 6,0 · dasbor 279,8
# kerangka pemdi 63,8 · makro 4,6 · spm 14,4 · prosn null (butuh lakehouse)
```

## 2. Rute halaman

Empat belas `page.tsx`, satu `error.tsx`, satu `layout.tsx`. **Semua `page.tsx` adalah server
component, kecuali `/login`; semuanya merender tepat satu komponen klien** — jadi server component
hari ini hanya shim pengambil data, dan setelah API Rust ada, pemindahannya mekanis per halaman.
Sepuluh dari empat belas memakai `export const dynamic = "force-dynamic"` (SSR tiap permintaan).

| Rute | Berkas (baris) | Sifat | Impor `src/lib`/`src/data` server (harus jadi panggilan API) | Komponen akar | Payload props terukur |
|---|---|---|---|---|---|
| `/` | `app/page.tsx` (14) | server → klien | `dasbor-pemdi`, `makro`, `prosn`, `spm`, `fitur` | `DasborPemdi` (478) | **205,0 KB** (6,0 + 73,5 + 125,5; PROSN 131,4 dimatikan flag) |
| `/indeks` | `app/indeks/page.tsx` (8) | server → klien | `dasbor-data` | `Dasbor` (733) | **279,8 KB** |
| `/indikator` | `app/indikator/page.tsx` (14) | server → klien | `dasbor-data` | `Dasbor` | **279,8 KB** |
| `/temuan` | `app/temuan/page.tsx` (14) | server → klien | `dasbor-data` | `Dasbor` | **279,8 KB** |
| `/data` | `app/data/page.tsx` (9) | server → klien | `data` (lakehouse) | `DataTampilan` (163) | tidak diukur (perlu lakehouse) |
| `/dokumen` | `app/dokumen/page.tsx` (14) | server → klien | `data`, `@/data/kebutuhan` | `Dokumen` (464) | registry 293 KB, diambil ulang lewat `/api/dokumen` tiap 3 dtk |
| `/opd` | `app/opd/page.tsx` (19) | server → klien | `data`, `store` | `OpdTampilan` (281) + `susun.ts` (48) | 293 KB dibaca di server; ke klien hanya ringkasan |
| `/kebutuhan` | `app/kebutuhan/page.tsx` (36) | server → klien | `kebutuhan`, `llm`, `@/data/pemdi` | `Kebutuhan` (372) | tidak diukur (perlu lakehouse) |
| `/penilaian` | `app/penilaian/page.tsx` (12) | server → klien | hanya `@/data/pemdi` | `Penilaian` (545) | data lewat `/api/penilaian` |
| `/tanya` | `app/tanya/page.tsx` (5) | server → klien | — | `Tanya` (587) | data lewat `/api/ask` |
| `/login` | `app/login/page.tsx` (69) | klien penuh | — | — | — |
| `/dashboard-pemdi` | `app/dashboard-pemdi/page.tsx` (6) | server | — | redirect ke `/` | — |
| `/dashboard-pemdi/[slug]` | `…/[slug]/page.tsx` (59) | server → klien | `kerangka-data`, `makro`, `spm`, `prosn`, `data/kerangka` | `MakroHalaman` (373), `SpmHalaman` (482), `ProsnHalaman` (448), `KerangkaTampilan` (348) | makro 73,5 / spm 125,5 / prosn 131,4 / kerangka pemdi 63,8 |
| `/dashboard-pemdi/[slug]/[...jalur]` | `…/[...jalur]/page.tsx` (68) | server → klien | idem + `makro-tampil`, `spm-tampil` | `MakroDetail` (368), `SpmBidang`/`SpmLayanan` (490), `Prosn*` (322), `KerangkaTampilan` | idem + kerangka makro 4,6 / spm 14,4 |
| `error.tsx` | `app/error.tsx` (42) | klien | — | — | — |
| `layout.tsx` | `app/layout.tsx` (25) | server | — | `Shell` (180) | — |

Catatan yang memengaruhi slice:

- Dua halaman dinamis memuat **logika routing** (slug/jalur mana yang valid, komponen mana yang
  dirender) bercampur pemuatan data: `[slug]/page.tsx:20-58`, `[...jalur]/page.tsx:20-67`. Setelah
  data pindah ke API, bagian itu tinggal pemilihan komponen + `notFound()`.
- Beranda mengirim seluruh nilai Makro + SPM (199 KB) sebagai props ke satu komponen klien.
- `/dashboard-pemdi/pemdi` mengirim 63,8 KB kerangka; `/indeks` keluarga 279,8 KB.

## 3. Route API

Tiga belas `route.ts`. Legenda pelanggaran `docs/conventions.md`: **E** badan error bukan
`{error:{code,message,requestId}}`; **R** tidak ada `X-Request-Id`; **C** ada field snake_case di
request/response; **L** list tanpa amplop `{data,nextCursor}`; **H** status terlarang (422);
**K** pesan internal (exception/upstream) bocor ke `message`; **A** header wajib tidak ada
(`WWW-Authenticate`, `Retry-After`).

Sesuai AGENTS.md, bentuk `/api/*` **dibekukan sampai cutover**; kolom terakhir adalah checklist
`PORT-48`, bukan pekerjaan frontend sekarang.

| Route | Metode | Permintaan | Respons | Pemanggil di UI | Pelanggaran |
|---|---|---|---|---|---|
| `/api/ask` | POST | `{messages:[{role,content}]}` | NDJSON: `ping`, `status{phase}`, `tool{tool}`, `delta{text}`, `done{answer,sql,columns,rows,queries}`, `error{error}` | `tanya.tsx:359` | E,R,K (baris `error` tanpa `code`/`requestId`) |
| `/api/ask/saran` | POST | `{question,answer}` | `{saran:string[]}`; kegagalan → `{saran:[]}` 200 | `tanya.tsx:391` | R (kegagalan disembunyikan sebagai 200) |
| `/api/dokumen` | GET | — | `{dokumen:Dok[],antrean,estimasi,sinkron}` | `dokumen.tsx:65` (poll 3 dtk) | E,R,C,L |
| `/api/dokumen` | POST | `{ids:string[]\|"semua",ulang?,estimasi?}` | `{diantrekan,antrean}` atau `{estimasi:true}` | `dokumen.tsx:113` | E,R,C,A (503 tanpa `Retry-After`) |
| `/api/dokumen/[id]/berkas` | GET | path `id` | byte berkas | `<a href>` dari `src/data/*/sumber.json` (17 rujukan), lewat `sumber-tampil.ts:16` | E,R |
| `/api/login` | POST | `{nama,sandi}` | `{ok:true,nama}` + cookie `pemdi_sesi` | `login/page.tsx:18` | E,R,C,A (401 tanpa `WWW-Authenticate`, 429 tanpa `Retry-After`) |
| `/api/logout` | POST | — | `{ok:true}`, cookie dihapus | `shell.tsx:166` | R |
| `/api/makro/narasi` | POST | `{indikator,tahun}` | `{narasi:string}` | `makro-halaman.tsx:220` | E,R,K (pesan `LlmError`) |
| `/api/penilaian` | GET | `?i=1..20` | `{penilaian[],bukti,buktiError,kebutuhan[],sync,llm}` | `penilaian.tsx:124` | E,R,C,L (param `i`, `indikator_no`, `diperbarui`) |
| `/api/penilaian` | POST | `{indikator_no,nilai,penjelasan,penilai}` | `{penilaian,sync}` | `penilaian.tsx:154` | E,R,C |
| `/api/penilaian/ai` | POST | `{indikator_no}` | `{nilai,penjelasan,kekurangan[],dasar{temuan,jawaban,kebutuhanBelum}}` | `penilaian.tsx:169` | E,R,C,H (**422**),K |
| `/api/sumber/[...berkas]` | GET | path `kumpulan/nama` | byte berkas (hanya yang ada di `manifest.json`) | `<a href>` dari `src/data/*.json` (54 rujukan) | E,R,A (503 tanpa `Retry-After`) |
| `/api/upload` | GET | — | **array telanjang** `Upload[]` (maks 100) | tidak ada pemanggil | R,L |
| `/api/upload` | POST | multipart `file`, `opd` | `{kind,upload,preview,sheets,suggestedTable}` atau `{kind,dok}` | `dokumen.tsx:89` | E,R,K,A |
| `/api/upload/ingest` | POST | `{id,table?,sheet?,mode?,dryRun?}` | `{preview}` atau `{table,upload}` | `dokumen.tsx:125`, `:415` | E,R,C |
| `/api/upload/status` | GET | `?id=` | objek `Upload` | tidak ada pemanggil | E,R |

Tambahan yang tidak terlihat dari tabel:

- **Empat cara memanggil API**, tanpa satu klien: `api<T>()` di `dokumen.tsx:31`, `api<T>()` lain di
  `penilaian.tsx:22`, `fetch` langsung + `res.ok` di `login/page.tsx:18`, dan pembaca stream NDJSON
  di `tanya.tsx:359`. Tidak satu pun membaca `{error:{code,...}}`; semuanya membaca `error` sebagai
  string (`dokumen.tsx:33`, `penilaian.tsx:26`, `login/page.tsx:19`).
- `src/lib/api.ts:5 fail()` mengirim `e.message` apa adanya untuk 500 → melanggar "no internal text"
  dan tidak punya `code`/`requestId`.
- `/api/upload/status` dan `GET /api/upload` tidak dipakai UI: kandidat dihapus saat PORT-42, bukan
  diporting.

## 4. Komponen dan duplikasi

Sembilan belas berkas di `src/components/` (total 6.269 baris); 17 bertanda `"use client"`, dua
tidak (`ui.tsx`, `kerangka.tsx`). Delapan komponen tampilan lain hidup di dalam folder rute
(`src/app/*/*.tsx`, 3.623 baris) sehingga tidak bisa dipakai ulang antar-rute.

| Komponen | Baris | Klien | Impor `lib`/`data` | Dipakai |
|---|---|---|---|---|
| `viz-laporan.tsx` | 543 | ya | tipe `makro` | 8 berkas (kit laporan de-facto) |
| `spm-detail.tsx` | 490 | ya | tipe `spm`, `spm-tampil`, `sumber-tampil` | rute SPM |
| `spm-halaman.tsx` | 482 | ya | tipe `spm`, `spm-tampil`, `sumber-tampil` | rute SPM |
| `viz-spm.tsx` | 479 | ya | tipe `spm`,`makro`, `spm-hitung`, `spm-tampil` | 3 |
| `viz-makro.tsx` | 472 | ya | tipe `makro`, `makro-hitung`, `makro-tampil` | 3 |
| `prosn-halaman.tsx` | 448 | ya | tipe `prosn`, `prosn-hitung`, `prosn-tampil` | rute PROSN |
| `makro-halaman.tsx` | 373 | ya | tipe `makro`, `makro-hitung`, `makro-tampil` | rute Makro |
| `charts.tsx` | 370 | ya | — (ECharts) | 1 (`tanya`) |
| `makro-detail.tsx` | 368 | ya | tipe `makro`, `makro-hitung`, `makro-tampil` | rute Makro |
| `viz-prosn.tsx` | 352 | ya | tipe `prosn`,`makro`, `prosn-hitung`, `prosn-tampil`, `sumber-tampil` | 3 |
| `kerangka.tsx` | 348 | tidak | `kerangka`, `kerangka-data`, `kerangka-dokumen`, `nilai-tampil` | rute kerangka |
| `prosn-detail.tsx` | 322 | ya | tipe `prosn`, `prosn-tampil`, `sumber-tampil` | rute PROSN |
| `viz.tsx` | 291 | ya | — (Recharts) | 23 |
| `viz-bukti.tsx` | 232 | ya | — (kontrol form + `WARNA_STATUS`) | 7 |
| `ui.tsx` | 202 | tidak | `utils` | 4 halaman |
| `shell.tsx` | 180 | ya | `fitur` | layout |
| `viz-opd.tsx` | 150 | ya | `utils` | 2 |
| `viz-indeks.tsx` | 135 | ya | `data/pemdi`, `utils` | 3 |
| `kerangka-viz.tsx` | 32 | ya | — | 1 |

Duplikasi yang terukur (bukan kecurigaan):

| Yang diduplikasi | Lokasi | Catatan |
|---|---|---|
| `dec(n,d)` / `fmtDec` | `makro-tampil.ts:11`, `spm-tampil.ts:154`, `prosn-tampil.ts:103`, `utils.ts:14` | 4 salinan, badan sama |
| `toLocaleString("id-ID",…)` inline | `viz-laporan.tsx:250`, `viz.tsx:233`, `charts.tsx:327`, `tanya.tsx:50`, `viz-makro.tsx:338`, `viz-spm.tsx:377` | 6 tempat, 3 gaya pembulatan berbeda |
| `fmtL` (angka bertanda `+`/`−`) | `spm-halaman.tsx:223`, `spm-detail.tsx:49` | identik byte-per-byte |
| `ukuran` (KB/MB) | `viz-laporan.tsx:379` vs `fmtBytes` `utils.ts:24` | dua pembulatan berbeda |
| `Judul` | `dasbor.tsx:55`, `dasbor-pemdi.tsx:43`, `viz-laporan.tsx:22`, `viz-opd.tsx:12` | 4 identik |
| `Baris` (baris kunci–nilai) | `dasbor.tsx:56`, `dasbor-pemdi.tsx:44`, `kebutuhan.tsx:41`, `viz-laporan.tsx:23`, `viz-opd.tsx:13` | 5 salinan; satu beda `text-right` |
| `pendek` (potong nama aspek) | `dasbor.tsx:35`, `kebutuhan.tsx:38` | regex berbeda untuk maksud sama |
| `angka` (parse `searchParams`) | `indikator/page.tsx:6`, `temuan/page.tsx:6` | identik; juga `api/ask/route.ts:13` |
| Header halaman | `PageHeader` `ui.tsx:3` vs `KepalaHalaman` `viz-bukti.tsx:16` | dua komponen, dua gaya |
| Chip/badge | `Badge` `ui.tsx:54` vs `Chip` `viz-bukti.tsx:222` | dua komponen |
| Kosakata status | `dasbor.tsx:48`, `kebutuhan.tsx:29`, `penilaian.tsx:36`, `ui.tsx:182`, `viz-bukti.tsx:214` | 5 sumber label/warna untuk 4 status yang sama |
| Pustaka grafik | `charts.tsx` (ECharts) + `viz.tsx` (Recharts) | dua dependensi grafik untuk satu aplikasi; ECharts dipakai 1 berkas |
| Klien HTTP | `dokumen.tsx:31`, `penilaian.tsx:22`, `login/page.tsx:18`, `tanya.tsx:359` | 4 salinan, lihat §3 |

## 5. Lint

`bunx biome lint .`: **134 error, 8 warning, 7 info** pada 123 berkas. Angka ini sama dengan lock
ratchet (`ts-lint 134`). Dari 134 error: **124 di `.ts`/`.tsx` `src/`, 1 di `scripts/seed.ts`, dan 9
di `src/app/globals.css`** (5 `parse` + 4 `noInvalidPositionAtImportRule` — sintaks Tailwind 4 yang
tidak dikenali Biome). Artinya pagu 134 memuat 9 error yang tidak bisa diperbaiki dari TypeScript.

| Direktori | Error | Berkas terbesar |
|---|---|---|
| `src/components/` | 54 | `viz-spm.tsx` 17, `viz-makro.tsx` 10, `viz-prosn.tsx` 9, `prosn-detail.tsx` 5, `makro-detail.tsx` 3, `spm-halaman.tsx` 3 |
| `src/app/` (tanpa CSS) | 51 | `penilaian.tsx` 13, `dokumen.tsx` 9, `dasbor.tsx` 8, `dasbor-pemdi.tsx` 7, `tanya.tsx` 7 |
| `src/app/globals.css` | 9 | parse Tailwind |
| `src/lib/` | 13 | `ringkasan.ts` 3, `sinkron.ts` 3, `prosn-tampil.ts` 2 |
| `src/data/` | 6 | `pemdi.ts` 4, `kerangka/pemdi.ts` 2 |
| `scripts/` | 1 | `seed.ts` |

| Rule | Error | Sifat |
|---|---|---|
| `style/noNonNullAssertion` | 47 | logika: `!` menutupi `undefined` (FE-3) |
| `suspicious/noArrayIndexKey` | 22 | kunci React dari indeks; sebagian data memang tanpa id |
| `a11y/noStaticElementInteractions` | 17 | klik pada `div`/`span` (FE-2) |
| `a11y/useKeyWithClickEvents` | 16 | idem, tidak bisa dipakai keyboard (FE-2) |
| `parse` + `noInvalidPositionAtImportRule` | 9 | `globals.css`, bukan kode TS |
| `suspicious/noAssignInExpressions` | 4 | `if ((x = …))` |
| `a11y/useSemanticElements` | 4 | `div role=…` yang ada elemennya (FE-2) |
| `a11y/noAutofocus` | 3 | input login, tanya, dasbor |
| `correctness/noComponentHookFactories` | 3 | hook di dalam factory |
| `correctness/useExhaustiveDependencies` | 3 | deps `useEffect` kurang |
| `suspicious/noImplicitAnyLet` | 2 | `let isi;` |
| sisanya (4 rule) | 4 | `noLabelWithoutControl`, `noShadowRestrictedNames`, `noSvgWithoutTitle`, `noControlCharactersInRegex` |

Kelompok a11y = 17 + 16 + 4 = **37**, sama dengan teks `FE-2` di backlog. Warning (8) hampir
seluruhnya `style/useImportType` (4) — bisa jadi nol tanpa risiko.

Yang tidak dijaga gate hari ini (dan relevan untuk struktur target):

- `scripts/check.sh:33` hanya menjalankan `typecheck` (+ `bun test` bila ada test). **Biome lint,
  `check-boundaries.ts`, dan `bun test` belum menjadi bagian gate**; lint hanya lewat ratchet.
- `package.json` belum punya `lint`, `boundaries`, `test` yang diminta
  `stacks/typescript/README.md`; `scripts/check-boundaries.ts` belum ada.
- `any` = 0 (satu-satunya temuan `git grep` adalah kata "any" di komentar
  `api/ask/saran/route.ts:5`), suppression = 1 (`tanya.tsx:419`, `eslint-disable` untuk
  `exhaustive-deps`), test = 0.

## 6. Struktur target

Prinsip: **UI tidak boleh menyentuh server**. Semua data lewat satu klien HTTP bertipe; tipe berasal
dari `pemdi-contracts` Rust (ADR 0003). Modul `src/lib` yang tersisa hanya yang murni tampilan.

```
src/app/                     # hanya rute: params + satu komponen fitur, 10–20 baris
src/features/<slice>/        # satu folder per fitur; index.ts = satu-satunya permukaan publik
  index.ts                   #   ekspor yang boleh dipakai rute / fitur lain
  halaman.tsx                #   komponen akar (dulu page.tsx/*-halaman.tsx)
  panel/*.tsx                #   potongan dasbor (dulu isi dasbor.tsx)
  tampil.ts                  #   pemetaan tampilan (dulu *-tampil.ts milik fitur)
  api.ts                     #   satu-satunya tempat memanggil src/api/client
src/api/client.ts            # apiGet/apiPost/apiStream; membaca {error:{code,message,requestId}}
src/contracts/               # dibangkitkan dari rust/crates/pemdi-contracts (PORT-4;
                             #   sebelum itu ditulis tangan sebagai seam, lihat FE-6a)
src/components/              # design system bersama: ui.tsx, viz.tsx, viz-bukti.tsx,
                             #   viz-laporan.tsx, format.ts, status.ts, warna.ts
src/lib/                     # menyusut: setelah cutover hanya format/warna yang murni
src/data/                    # tetap sampai PORT-11/13 memindahkan kerangka ke Rust
src/proxy.ts                 # tetap sampai PORT-40
```

Modul yang **boleh** diimpor UI (11 dari 37 di `src/lib`, murni tanpa I/O): `utils`, `fitur`,
`kerangka`, `makro-hitung`, `makro-tampil`, `nilai-tampil`, `prosn-hitung`, `prosn-tampil`,
`spm-hitung`, `spm-tampil`, `sumber-tampil` — plus semua `src/data/*`. Modul yang **tidak boleh**
(butuh server, transitif, 26 modul): `lakehouse`, `llm`, `store`, `penilaian`, `users`, `auth`,
`berkas`, `intake`, `dokumen`, `makro`, `spm`, `prosn`, `data`, `dasbor-data`, `dasbor-pemdi`,
`kebutuhan`, `bukti`, `estimasi`, `ringkasan`, `proses`, `sinkron`, `kerangka-data`,
`kerangka-dokumen`, `tables`, `user-tables`, `api`.

### Peta berkas sekarang → tujuan

| Sekarang | Tujuan |
|---|---|
| `app/{index,indikator,temuan}/page.tsx`, `app/dasbor.tsx` (733) | `features/indeks-pemdi/{index.ts,halaman.tsx,panel/{ringkasan,indikator,temuan,pilih}.tsx}` |
| `app/page.tsx`, `app/dashboard-pemdi/dasbor-pemdi.tsx` (478) | `features/beranda/` |
| `app/dashboard-pemdi/[slug]` + komponen Makro, `lib/makro-tampil` | `features/kinerja-makro/` |
| idem untuk SPM, `lib/spm-tampil` | `features/capaian-spm/` |
| idem untuk PROSN, `lib/prosn-tampil` | `features/prosn/` |
| `components/kerangka.tsx`, `kerangka-viz.tsx`, `lib/{kerangka,kerangka-data,kerangka-dokumen}` | `features/kerangka/` |
| `app/dokumen/*`, `components/viz-bukti.tsx`, `components/viz-opd.tsx` | `features/dokumen/` |
| `app/kebutuhan/*` | `features/kebutuhan/` |
| `app/penilaian/*` | `features/penilaian/` |
| `app/tanya/*`, `components/charts.tsx` | `features/tanya/` |
| `app/opd/*` | `features/kesiapan-opd/` |
| `app/data/*` | `features/data-aplikasi/` |
| `app/login/page.tsx`, `app/api/{login,logout}`, `proxy.ts` | `features/masuk/` + `features/masuk/sesi.ts` (PORT-40) |
| `components/{ui,viz,viz-laporan}.tsx` | `components/` (tetap, jadi design system) |
| `lib/{utils,makro-tampil,spm-tampil,prosn-tampil,sumber-tampil,nilai-tampil}` | `components/{format,status,warna}.ts` + `features/*/tampil.ts` |
| 13 `app/api/**/route.ts` | dihapus saat cutover (PORT-47); kontraknya pindah ke `src/contracts/` |
| `lib/{lakehouse,llm,store,…}` (26 modul server) | dihapus saat cutover, satu PR per kelompok ledger |

### Aturan `scripts/check-boundaries.ts`

Bentuknya mengikuti `stacks/typescript/check-boundaries.ts` (48 baris, `Glob` + regex per baris),
ditambah enam aturan. Setiap pesan menyebut cara memperbaikinya.

1. `src/app/**`, `src/features/**`, `src/components/**` tidak boleh mengimpor modul server (daftar di
   atas). Pesan: *"UI tidak membaca server. Tambahkan endpoint di Rust, lalu panggil
   `src/api/client.ts`."* Aturan ini menyala untuk `src/features/` sejak kosong, jadi gate tetap
   hijau selama pemindahan bertahap.
2. `src/app/**` tidak boleh mengimpor `@/app/<rute lain>`. Pesan: *"Pindahkan komponen ke
   `src/features/<slice>` dan impor `index.ts`-nya."* (Hari ini dilanggar `indeks`, `indikator`,
   `temuan`, dan `page.tsx`.)
3. Dari `src/features/<a>/x.ts`, impor `../<b>/…` hanya lewat `../<b>` (index). Sama seperti aturan
   bawaan guidelines.
4. `src/contracts/**` tidak mengimpor `features`, `app`, atau `components`.
5. Tidak ada `throw` di `src/features/**`; kembalikan `Result<T,E>` atau biarkan `api.ts` menangani.
6. `fetch(` hanya boleh muncul di `src/api/client.ts`; sisanya memakai `apiGet`/`apiPost`/`apiStream`.

`package.json` mendapat `"lint": "biome check ."`, `"boundaries": "bun scripts/check-boundaries.ts"`,
`"test": "bun test"`; penyambungan ke `scripts/check.sh` adalah keputusan lead/owner
(`scripts/check.sh` ada di `protected-paths`).

## 7. Slice refactor, berurutan

Setiap baris satu PR. Kolom **Bergantung** menyebut urutan, bukan status. Aturan bukti: logika →
test yang gagal sebelum dan lolos sesudah; visual → tangkapan layar sebelum/sesudah pada deployment;
server → transkrip `curl` + screenshot. Angka "…" mengacu §4–§5.

### Bisa sebelum service Rust ada (frontend murni)

| # | Slice | Tujuan | Berkas utama | Bukti | Bergantung |
|---|---|---|---|---|---|
| 1 | **FE-1** | Tidak ada berkas > 600 baris selain data: pecah `dasbor.tsx` 733 → `panel/{ringkasan,indikator,temuan,pilih}.tsx`, `kartu-temuan.tsx`. Batas fungsi sudah ada: `Ringkasan`:297, `TabIndikator`:448, `TabTemuan`:632 | `src/app/dasbor.tsx` | Screenshot `/indeks`, `/indikator?aspek=2`, `/temuan?opd=…` dengan filter+sort sama; `scripts/file-size.sh --list` tidak lagi memuatnya | — (lead menghapus baris `.agents/size-baseline.tsv`; berkas itu protected) |
| 2 | **FE-1b** | Hapus impor lintas-rute: `@/app/dasbor` (3 rute) dan `@/app/dashboard-pemdi/dasbor-pemdi` (1 rute) | kedua komponen → `features/{indeks-pemdi,beranda}/` | Screenshot 4 rute | FE-1 |
| 3 | **FE-4a** | `scripts/check-boundaries.ts` (aturan 2–6; aturan 1 menyala untuk `features/` yang kosong) + skrip `lint`/`boundaries`/`test` di `package.json` | `scripts/check-boundaries.ts`, `package.json` | `boundaries: ok` | — (penyambungan ke `check.sh` oleh lead) |
| 4 | **FE-4b** | Dua slice pertama pindah; rute tinggal 10–20 baris | `features/indeks-pemdi/`, `features/masuk/` | Screenshot + `boundaries: ok` + `typecheck` | 1, 2, 3 |
| 5 | **FE-4c** | Sisa slice, satu PR per fitur, urut: `kesiapan-opd`, `data-aplikasi`, `dokumen`, `kebutuhan`, `penilaian`, `tanya`, `kinerja-makro`, `capaian-spm`, `kerangka`, `prosn`, `beranda` | `app/**/page.tsx`, `features/*/` | Screenshot tiap rute; `boundaries` menolak impor `@/lib` server | 4 |
| 6 | **FE-2** | Ketiga rule a11y = 0 (37 temuan). Urut dampak: `viz-spm` 14, `viz-prosn` 8, `viz-makro` 7, `dasbor-pemdi` 6, lalu `viz`, `dokumen`, `dasbor` | `src/components/*`, `src/app/*` | Angka per rule turun ke 0, ratchet `--update` oleh lead, walkthrough keyboard (Tab/Enter/Space) sebagai screenshot + transkrip | 3 (gate) |
| 7 | **FE-3** | 47 `!` hilang tanpa mengubah angka tampil. Terbesar: `penilaian` 8, `prosn-detail` 4, `data/pemdi.ts` 4, `makro-detail`/`spm-halaman`/`ringkasan`/`sinkron`/`dasbor` 3. Pola: `INDIKATOR.find(...)!.aspek` (`kebutuhan/page.tsx:15`) | `src/**` | `src/data/pemdi.test.ts` baru (lookup ada/tidak ada) + screenshot halaman tersentuh | TEST-1 untuk modul hitung |
| 8 | **FE-7** (usul) | Satu modul format: 4 `dec`, 2 `fmtL`, `ukuran` vs `fmtBytes`, 6 `toLocaleString` inline → `components/format.ts` (`angka`,`desimal`,`persen`,`poin`,`ukuran`,`potong`) | `lib/*-tampil.ts`, `components/*` | `format.test.ts` karakterisasi dari keluaran hari ini + screenshot `/dashboard-pemdi/spm`, `/makro` | 3 |
| 9 | **FE-8** (usul) | Satu kosakata status (5 sumber) dan satu chip: `Badge` vs `Chip` → `components/status.ts` | `dasbor.tsx:48`, `kebutuhan.tsx:29`, `penilaian.tsx:36`, `ui.tsx:182`, `viz-bukti.tsx:214` | Screenshot `/kebutuhan`, `/penilaian`, `/dokumen`; test pemetaan status→label/warna | 8 |
| 10 | **FE-9** (usul) | Satu set primitif: hapus 4 `Judul`, 5 `Baris`, `PageHeader` vs `KepalaHalaman` | `components/` | Screenshot 6 halaman pemakainya | 8 |
| 11 | **FE-10** (usul, P3) | Satu pustaka grafik: `charts.tsx` (ECharts, 370 baris, dipakai `tanya.tsx:8`) → `viz.tsx` (Recharts); `echarts` keluar dari dependensi | `components/charts.tsx`, `tanya.tsx` | Screenshot `/tanya` (grafik, tabel, CSV) + ukuran image **di host Portainer**; `next build` dilarang lokal, jadi penghematan bundle tidak bisa dibuktikan di PR ini | — |
| 12 | **FE-11** (usul, P3) | Pecah berkas 400–600 baris **saat disentuh**, tanpa PR khusus: `tanya` 587, `penilaian` 545, `viz-laporan` 543, `spm-detail` 490, `spm-halaman` 482, `viz-spm` 479, `viz-makro` 472, `dokumen` 464 | idem | Screenshot rute terkait | slice yang menyentuhnya |

### Butuh service Rust

| # | Slice | Tujuan | Endpoint / berkas | Bukti | Bergantung |
|---|---|---|---|---|---|
| 13 | **FE-6a** | Satu klien: `src/api/client.ts` satu-satunya `fetch` dan satu-satunya pembaca `{error:{code,message,requestId}}`; `src/contracts/*.ts` tulisan tangan dari §3 sebagai seam. **Menyimpang dari teks FE-6** ("blocked by PORT-4"): tipe tulisan tangan dipakai sekarang, PORT-4 menggantinya dengan hasil generate | `src/api/client.ts`, `src/contracts/` | Test unit: 200, 400 ber-`code`, 500 tanpa badan, NDJSON terpotong; `typecheck` | — (bisa mulai sekarang) |
| 14 | **FE-5a** `/data` | Halaman pertama lewat API | `GET /api/data/aplikasi`, `GET /api/data/statistik` (PORT-30/45) | `curl` + screenshot `/data` | 13, PORT-20 |
| 15 | **FE-5b** `/opd` | — | `GET /api/opd` (PORT-22/45) | `curl` + screenshot `/opd`, angka per OPD sama | 13, PORT-22 |
| 16 | **FE-5c** `/kebutuhan` | 68 butir + bukti; daftar bukti pakai amplop `{data,nextCursor}` | `GET /api/kebutuhan?status=&aspek=` (PORT-31) | `curl` + screenshot; jumlah butir per status sama | 13, PORT-31 |
| 17 | **FE-5d** `/penilaian` | Paling siap: halaman sudah 100% lewat API | `GET/POST /api/penilaian`, `POST /api/penilaian/ai` (PORT-43) | `curl` GET/POST + screenshot; test kontrak 400 untuk nilai di luar 1–5 | 13, PORT-43 |
| 18 | **FE-5e** `/dokumen` | Perlu keputusan polling 3 dtk vs SSE (konvensi hanya mengatur pesan error terakhir) | `GET/POST /api/dokumen`, `POST /api/upload*` (PORT-42) | Unggah satu berkas nyata + transkrip respons + screenshot | 13, PORT-42 |
| 19 | **FE-5f** `/indeks`,`/indikator`,`/temuan` | Pecah payload 279,8 KB: `ringkasan`, `indikator`, `temuan?limit&cursor` | `GET /api/dashboard` (PORT-33/45) | `curl` tiap endpoint + screenshot tiga tab; angka indeks identik dengan produksi (paritas) | 13, PORT-33 |
| 20 | **FE-5g** `/dashboard-pemdi/*` | Keputusan: slug/jalur valid tetap di Next (usul) atau pindah ke Rust | `GET /api/frameworks/{pemdi,makro,spm,prosn}`, `GET /api/frameworks/{slug}/path` (PORT-13/23/45) | `curl` + screenshot tiap framework dan satu detail | 13, PORT-13/23 |
| 21 | **FE-5h** `/` | Setelah FE-5g hanya menggabungkan tiga ringkasan; props turun dari 205 KB | `GET /api/beranda` (PORT-32) | Screenshot + empat kartu sama | 20, PORT-32 |
| 22 | **FE-5i** `/tanya` | Hanya kontrak stream: NDJSON sama + `error` ber-`code` | `/api/ask` (PORT-41) | Satu pertanyaan nyata, screenshot grafik+tabel, transkrip memuat `ping` tiap 15 dtk | 13, PORT-41 |
| 23 | **FE-5j** `/login` | Cookie `pemdi_sesi` tetap kompatibel | `POST /api/login`, `/logout`, middleware (PORT-40) | Login/logout nyata + cookie; 401 memuat `code` | 13, PORT-40 |
| 24 | **FE-12** (usul) | Hapus kode lama per kelompok ledger | `src/lib` server + `app/api/**/route.ts` | `git grep` impor = 0, `check.sh` hijau, screenshot rute | 14–23, PORT-47 |
| 25 | **FE-13** (usul) | Satu penanganan kesalahan UI: `code` → teks Indonesia di satu tempat | `app/error.tsx`, `api/client.ts` | Test pemetaan code→teks + screenshot satu 400 dan satu 503 | 13 |

Urutan untuk satu lead: 1 → 2 → 3 → 4 → 5 (paralel per fitur) → 6 → 7 → 8 → 9, dengan 13
dikerjakan bersamaan; 14–23 menyusul per endpoint Rust yang sudah cutover; 10–12 dan 24–25
sesudahnya.

## 8. Handoff

**Diukur** (2026-11-25, `HEAD 464c3c7`, checkout bersama):

- 14 rute halaman, 13 route API, 19 komponen di `src/components` + 8 komponen tampilan di folder
  rute; 16.128 baris TS/TSX; 0 test TypeScript; 0 `any`; 1 suppression.
- Biome: 134 error (124 TS `src/`, 1 `scripts/`, 9 `globals.css`), 8 warning, 7 info; rincian per
  direktori, per berkas, dan per rule di §5. Lock ratchet cocok.
- Payload props tiap halaman yang bisa diukur tanpa lakehouse: 279,8 KB (`/indeks` keluarga),
  205,0 KB (`/`), 63,8–131,4 KB (framework).
- Bentuk request/response 13 route dibaca dari kode, termasuk pemanggilnya di UI (2 route tanpa
  pemanggil: `GET /api/upload`, `/api/upload/status`).
- Duplikasi helper dengan `file:line` (§4).

**Tidak diverifikasi / tidak bisa diukur di sini:**

- `/data`, `/kebutuhan` butuh lakehouse hidup; payload dan waktu render-nya tidak diukur.
- Bundle dan ukuran image tidak diukur: `next build` dilarang di mesin pengembang (harus di host
  Portainer). Karena itu FE-10 tidak bisa membuktikan penghematan secara lokal.
- Perilaku runtime hari ini (polling `/api/dokumen` tiap 3 dtk, stream `/api/ask`) dibaca dari kode,
  tidak dijalankan.
- Ratchet sempat terbaca 135 error di awal pengukuran lalu 134 beberapa menit kemudian tanpa
  perubahan `src/`: checkout ini dipakai bersama worker lain (`scripts/oracle/cases.ts` berubah,
  `rust/` muncul, `AGENTS.md` berubah dua kali selama audit). Semua angka di dokumen ini dari
  pengukuran terakhir, `HEAD 464c3c7`.
- Tidak ada test yang bisa dijalankan untuk membuktikan perilaku tampilan; setiap slice logika di §7
  karena itu menyebut test karakterisasi yang harus dibuat lebih dulu.
- Pemetaan slice baru (FE-7 sampai FE-13) adalah usulan; hanya FE-1 sampai FE-6 yang sudah punya
  baris backlog. Menambah barisnya adalah keputusan desk/owner.
