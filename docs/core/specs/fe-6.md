# `FE-6` Satu klien API dan tipe kontrak tulisan tangan

| | |
| --- | --- |
| Backlog | `FE-6` di [BACKLOG.md](../BACKLOG.md) |
| Module | Frontend |
| Size | M |
| Blocked by | tidak ada. `FE-5a`–`FE-5j` dan `FE-13` menunggu PR ini |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Ada empat cara memanggil API, tidak satu pun membaca badan galat yang benar.
`src/app/dokumen/dokumen.tsx:31` dan `src/app/penilaian/penilaian.tsx:22` punya `api<T>()` yang membaca
`json.error` sebagai string; `src/app/login/page.tsx:18` dan `src/app/tanya/tanya.tsx:391` memanggil
`fetch` langsung; `src/app/tanya/tanya.tsx:359` membaca NDJSON sendiri; dan
`src/components/makro-halaman.tsx:220` membaca `{narasi?, error?}`.

Bentuk galat yang dibaca UI adalah `{ error: "teks" }`, bukan `{error:{code,message,requestId}}`
(`docs/conventions.md`), dan `src/lib/api.ts:5` mengirim `e.message` apa adanya untuk 500. ADR 0003
menetapkan `src/contracts/` sebagai sumber tipe; `PORT-4` membangkitkannya dari Rust.

## Yang didapat pengguna

Tidak ada yang berubah di layar, kecuali kegagalan kini datang dengan kode (`FE-13`).

## Rancangan

### `src/api/client.ts`

Satu-satunya berkas di UI yang memanggil `fetch` (aturan 6 `FE-4a`).

```ts
export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  requestId: string;
  legacyMessage?: string; // teks mentah route lama; tidak ditampilkan untuk status ≥ 500
}
export function apiGet<T>(path: string, init?: RequestInit): Promise<T>;
export function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T>;
export function apiStream<T>(path: string, body: unknown, onEvent: (e: StreamEvent<T>) => void, signal?: AbortSignal): Promise<void>;
```

Aturannya:
- Kirim `X-Request-Id: crypto.randomUUID()`; baca `X-Request-Id` dari respons, fallback ke nilai yang
  dikirim. `fetchImpl` bisa disuntik lewat opsi supaya test tidak menambal `globalThis`; sukses:
  204 → `undefined as T`, selain itu `res.json()`.
- Gagal: uraikan `{error:{code,message,requestId}}`. Bila badan berisi `{error:"…"}` (bentuk lama
  yang dibekukan sampai cutover), `code` dipilih menurut status: 400–499 `invalid_request`, 502
  `upstream_failed`, 503 `unavailable`, 504 `timeout`, selain itu `internal`. Teks lamanya masuk
  `legacyMessage`; `message` memakai teks registry untuk status ≥ 500; badan kosong atau bukan JSON
  diperlakukan sama, dan `e.message` tidak pernah disebut.
- `apiStream`: kirim `accept: application/x-ndjson`, baca `res.body.getReader()`, potong per `\n`,
  `JSON.parse` per baris, panggil `onEvent`; baris kosong dan baris terakhir tanpa `\n` tetap
  diproses selama JSON-nya utuh. Stream yang tertutup sebelum satu pun `done`/`error` ditolak dengan
  `ApiError` `upstream_failed`; event `error` menjadi `ApiError` dengan `code`-nya.

### `src/contracts/`

Tulisan tangan, satu berkas per kelompok endpoint, isinya dari audit §3; setiap berkas berkomentar
`Sementara sampai PORT-4 membangkitkan berkas ini dari rust/crates/pemdi-contracts.`

| Berkas | Isi |
| --- | --- |
| `api-error.ts` | `ErrorBody`, `ErrorCode` (13 kode baris `.agents/error-codes.tsv`), `StreamEvent` dasar |
| `dokumen.ts` | `Dokumen`, `Antrean`, `Estimasi`, `PermintaanProses` |
| `penilaian.ts` | `Nilai`, `Bukti`, `Kebutuhan`, `UsulanAi`, `Sync` |
| `tanya.ts` | `Row`, `ChatMessage`, `ToolTrace`, `EventTanya` (`ping`, `status`, `tool`, `delta`, `done`, `error`) |
| `unggah.ts`, `masuk.ts`, `narasi.ts` | `Upload`/`Preview`/`Ingest`, `PermintaanMasuk`/`Sesi`, `PermintaanNarasi`/`Narasi` |

Larangan (aturan 4 `FE-4a`): `src/contracts/**` tidak mengimpor `@/features`, `@/app`,
`@/components`. Nama field mengikuti respons hari ini — `/api/penilaian` memakai `snake_case` —
karena route lama dibekukan.

### Pemanggil dipindahkan

Ganti tujuh `fetch` di `src/app/**` dan `src/components/**` dengan `apiGet`/`apiPost`/`apiStream`
tanpa mengubah perilaku yang terlihat:

- `tanya.tsx`: pembaca NDJSON menjadi `apiStream` + `switch (e.type)`; `ping` diabaikan, dan "Kopilot
  berhenti sebelum menjawab." tetap ada sebagai `upstream_failed` dari klien.
- `makro-halaman.tsx`: `{narasi?, error?}` menjadi `Narasi` + `ApiError`; `shell.tsx`: logout boleh
  gagal tanpa pesan, tangkap `ApiError`, tetap alihkan ke `/login`.
- Setelah itu `FETCH_SEMENTARA` di `scripts/check-boundaries.ts` menjadi `[]` lalu dihapus.

### Test

`src/api/client.test.ts` (di samping kode, `bun test`):

| # | Kasus | Harapan |
| --- | --- | --- |
| 1 | 200 `{"a":1}` | `apiGet` mengembalikan `{a:1}`; `X-Request-Id` dikirim |
| 2 | 400 `{error:{code:"invalid_request",message:"…",requestId:"r1"}}` | `code`, `requestId`, `status` benar |
| 3 | 500 tanpa badan | `code === "internal"`; `message` tanpa teks exception |
| 4 | NDJSON `{"type":"delta",…}\n{"type":"done","ans` lalu tutup | `delta` diterima; ditolak `upstream_failed` |
| 5 | 400 `{error:"Pesan lama"}` | `code === "invalid_request"`, `legacyMessage === "Pesan lama"` |
| 6 | Stream dengan baris rusak di tengah | `ApiError` `upstream_failed`, bukan `SyntaxError` bocor |

Kasus 4 dan 6 memakai `ReadableStream` dari byte yang dipotong di tengah ("NDJSON terpotong").

## Kriteria penerimaan

- [ ] `bun test src/api/client.test.ts` lulus seluruh kasus di tabel.
- [ ] `bun run typecheck` lulus; `src/contracts/*.ts` ada dan tidak mengimpor `features`, `app`, atau
      `components`.
- [ ] `git grep -n '\bfetch(' -- 'src/app' 'src/features' 'src/components'` → 0 baris;
      `bun run boundaries` → `boundaries: ok` dengan `FETCH_SEMENTARA` dihapus.
- [ ] `grep -rn 'json.error\|\.error ??' src/app src/components` tidak lagi memakai `error` sebagai string.
- [ ] Tangkapan layar sebelum/sesudah `/tanya` (satu pertanyaan, grafik + tabel), `/dokumen`,
      `/penilaian`, `/login` dari `bun run dev` atau `epemdi.ai.id` (bukan `next build`), plus
      transkrip satu respons 400 dan satu 500 route lama yang memperlihatkan `ApiError.code`.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

- `code` → teks Indonesia di satu tempat: `FE-13`.
- Membangkitkan tipe dari Rust dan memeriksanya di gate: `PORT-4`, menunggu `DEC-2`; jangan menambah
  dependensi pembangkit. Bentuk respons `/api/*` dibekukan sampai `PORT-48`; `fail()` di
  `src/lib/api.ts:5` tetap dipakai route lama sampai `PORT-47`.
