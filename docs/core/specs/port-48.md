# `PORT-48` Konvensi respons API setelah cutover

| | |
| --- | --- |
| Backlog | `PORT-48` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | tidak ada di backlog; baru boleh mulai setelah `PORT-47` (respons dibekukan sampai cutover) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Selama porting bentuk respons dibekukan (ADR 0001, `docs/port/README.md` §1). Bentuk itu melanggar
konvensi RantAI di [docs/conventions.md](../../conventions.md):

- Galat hari ini `{"error":"<pesan>"}` (`src/lib/api.ts:5-9`), tanpa `code`, tanpa `requestId`.
  Pesannya memuat teks internal, mis. `Login ke lakehouse gagal (500).`
  (`src/lib/lakehouse.ts:54`) dan badan upstream 300 karakter (`:81`).
- Daftar dikembalikan sebagai larik telanjang: `GET /api/upload` → `Upload[]`
  (`src/app/api/upload/route.ts:16`).
- Field `snake_case` di mana-mana: `indikator_no`, `nama_file`, `ukuran_kb`, `diunggah`,
  `jumlah_karakter` (`src/lib/store.ts:32-45`, `src/lib/penilaian.ts:9-15`,
  `src/lib/lakehouse.ts:140-154`).
- Waktu berupa string ISO dari `new Date().toISOString()` dengan nama `diunggah`/`diperbarui`, bukan
  field berakhiran `At`.
- `422` dipakai (`src/app/api/penilaian/ai/route.ts:15`), padahal konvensi memakai `400`.

`pemdi-api/src/api_error.rs` dan `.agents/error-codes.tsv` sudah ada; task ini memakainya.

## Yang didapat pengguna

Tidak ada yang berubah di layar, kecuali teks galat yang lebih jelas dan tidak membocorkan detail
server. Pengembang mendapat `code` yang stabil untuk diterjemahkan UI (`FE-13`) dan `requestId` yang
sama dengan baris log.

## Rancangan

Satu endpoint per PR. Untuk setiap endpoint:

1. `ApiError` dengan kode dari registry: `invalid_request` (400), `unauthenticated` (401),
   `not_found` (404), `conflict` (409), `payload_too_large` (413),
   `unsupported_media_type` (415), `rate_limited` (429), `internal` (500), `upstream_failed` (502),
   `unavailable` (503), `timeout` (504). `422` → `invalid_request` 400.
   Badan: `{"error":{"code","message","requestId"}}`; `requestId` = header `X-Request-Id`.
2. Field `camelCase` di `pemdi-contracts`; `#[serde(rename_all = "camelCase")]`; tidak ada kunci
   ber-`_`. Nilai enum `lower_snake_case`.
3. Waktu: `diunggahAt`, `diperbaruiAt`, `pada` → `padaAt`, format `2026-11-25T08:30:00.000Z`
   (tiga desimal).
4. Daftar: `GET /api/upload` → `{"data":[…],"nextCursor":null}`. Objek gabungan yang memuat daftar
   (`GET /api/dokumen` → `{dokumen, antrean, estimasi, sinkron}`) tetap objek, tetapi `dokumen`
   menjadi `data` dan field di dalamnya camelCase.
5. `/api/ask` tetap NDJSON; hanya baris `error` berubah menjadi
   `{"type":"error","error":{…}}`, dan UI (`src/app/tanya`) diubah di PR yang sama.
6. UI mengikuti di PR yang sama: `src/api/client.ts` (`FE-6`) membaca `error.code`, dan
   `src/app/**` yang memakai field lama diperbarui. Tidak ada PR yang mengubah kontrak tanpa
   mengubah pemakainya.
7. Urutan endpoint: `GET /api/upload` (paling sederhana) → `GET /api/dokumen` → `GET /api/penilaian`
   → `POST /api/penilaian` → `POST /api/upload*` → `POST /api/dokumen` → `POST /api/login`/`logout`
   → `/api/ask` → `/api/halaman/*`.
8. Pemeriksaan: `tests/contract/` ada di `.agents/protected-paths`, jadi kasusnya **diminta ke
   owner**; sementara itu `scripts/api-kontrak.sh` (baru, tidak terlindungi) memeriksa dengan `curl`
   bahwa setiap respons galat punya `code`/`message`/`requestId` dan tidak ada kunci ber-`_`.

## Kriteria penerimaan

- [ ] Per endpoint: transkrip `curl -i` untuk sukses dan minimal dua galat, memperlihatkan
      `X-Request-Id` dan `error.code` yang sama.
- [ ] `curl -s localhost:3200/api/upload | jq 'keys'` → `["data","nextCursor"]`.
- [ ] `scripts/api-kontrak.sh` lulus untuk daftar endpoint yang sudah dikonversi.
- [ ] `git grep -nE '"[a-z]+_[a-z_]+"\s*:' rust/crates/pemdi-contracts` kosong (kunci JSON bukan
      snake_case).
- [ ] Tidak ada pesan galat yang memuat SQL, teks upstream, path berkas, atau pesan pengecualian;
      journal `api` memuat penyebabnya di bawah `requestId` yang sama.
- [ ] UI yang membaca field lama sudah diperbarui di PR yang sama (`bun run typecheck` lulus).
- [ ] Baris backlog `PORT-48` Done; setiap perubahan bentuk dicatat di
      [differences.md](../../port/differences.md) sebagai perubahan setelah cutover.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Endpoint baru, perubahan aturan bisnis, penambahan kode error yang tidak dibutuhkan klien, dan
penggantian `tests/contract/` (milik owner). Klien API tunggal tetap `FE-6`; task ini hanya
menyesuaikan pembacaannya.
