# `PORT-3` Oracle rekaman untuk modul ber-I/O

| | |
| --- | --- |
| Backlog | `PORT-3` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Oracle hari ini hanya bisa menjalankan fungsi murni: `scripts/oracle/modules.ts:6` mengimpor
`capaian, kategori, laju, lajuBaik` dari `src/lib/makro-hitung`, dan `run.ts` memanggil
`MODULES[modul][fn](args)`. Tidak ada cara merekam modul yang memanggil jaringan, padahal enam
baris ledger §2 adalah adapter yang isinya justru I/O.

Modul itu juga memegang rahasia dan data pribadi:

- `src/lib/lakehouse.ts:38-41` membaca `LAKEHOUSE_EMAIL` / `LAKEHOUSE_PASSWORD`; sesi datang sebagai
  cookie `lh_session=…` dari `Set-Cookie` (`:56-59`).
- `src/lib/lakehouse.ts:89` menambahkan `x-tenant` dari `LAKEHOUSE_TENANT_ID`.
- `src/lib/llm.ts:19-21` mengirim `Bearer $LLM_KEY` dan `x-opencode-session: $LLM_SESSION`.
- `src/lib/store.ts:54` membaca `data/dokumen.json` yang memuat nama berkas dan ringkasan dokumen
  OPD.

Belum ada satu pun berkas rekaman: `ls tests/` hanya berisi `parity/`.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Adapter Rust nanti dibuktikan sama dengan klien TypeScript tanpa
menyentuh lakehouse atau LLM produksi, dan tanpa satu pun kredensial masuk repo.

## Rancangan

### Format berkas

`tests/rekaman/<modul>/<nama>.json`, satu berkas satu perilaku:

```json
{ "nama": "query-ok", "sumber": "lokal 2026-11-25", "masuk": { "fn": "query", "args": ["SELECT 1"] },
  "upstream": [ { "method": "POST", "path": "/api/query/run",
    "requestHeaders": { "content-type": "application/json", "cookie": "<dihilangkan>" },
    "requestBody": "{\"sql\":\"SELECT 1\"}", "status": 200, "responseHeaders": { "content-type": "application/json" },
    "responseBody": "{\"columns\":[\"1\"],\"rows\":[{\"1\":1}],\"rowCount\":1,\"truncated\":false}" } ],
  "keluar": { "columns": ["1"], "rows": [{ "1": 1 }], "rowCount": 1, "truncated": false } }
```

### Perekam

`scripts/oracle/rekam.ts <modul> <nama> [--replay <berkas>] [--out <berkas>]`:

- Memasang pembungkus `globalThis.fetch` yang mencatat setiap permintaan/respons, lalu memanggil
  fungsi lama dari `scripts/oracle/modules-io.ts` (daftar baru, sejajar `modules.ts`; dipisah supaya
  `modules.ts` tetap murni dan tidak mengimpor `node:fs`). `--replay` menjawab dari berkas rekaman
  alih-alih jaringan, sehingga rekaman dapat diulang offline.
- Redaksi, dijalankan saat menulis dan diperiksa saat membaca: header `cookie`, `authorization`,
  `x-opencode-session`, `x-tenant` diganti `"<dihilangkan>"`; nilai variabel lingkungan rahasia
  (`LAKEHOUSE_PASSWORD`, `LLM_KEY`, `LLM_SESSION`, `PEMDI_SESSION_SECRET`) dan pola `lh_session=…`,
  `eyJ…` (JWT) diganti `<dihilangkan>`; `responseBody` > 64 KiB dipotong dengan penanda
  `"dipotong": true`. Skrip **menolak menulis** bila salah satu nilai rahasia muncul verbatim di
  keluarannya.
- Berkas fixture dokumen memakai berkas sintetis di `tests/fixtures/` (bukan `data/dokumen.json`
  produksi), berisi teks karangan tanpa nama orang.

### Sisi Rust

Test di `rust/crates/pemdi-adapters/tests/rekaman_<modul>.rs`:

- Menyalakan server axum lokal (`axum` sudah ada di `rust/Cargo.toml:20`; tambahkan sebagai
  `dev-dependencies`) yang menjawab `upstream` berurutan; adapter dijalankan dengan base URL
  `http://127.0.0.1:<port>`, jadi tidak ada koneksi keluar.
- Membandingkan: (a) hasil adapter dengan `keluar`; (b) permintaan yang diterima dengan `upstream`
  pada `method`, `path`, header non-rahasia, dan badan JSON per field. `keluar` berupa galat ditulis
  `{ "galat": { "jenis": "...", "status": 503 } }`, bukan teks pesan.

### Kasus wajib

Minimal 12 berkas untuk `lakehouse`: 200 JSON, 204 kosong (`src/lib/lakehouse.ts:106`), 401 lalu 200
(retry `:96-99`), 500 `{error,detail,hint}` (`:73-83`), 500 teks non-JSON dipotong 300 karakter,
koneksi gagal → 503, `Set-Cookie` ganda, `POST /api/uploads` multipart, `GET /api/uploads/:id`,
`preview` dengan `?sheet=`, `ingest`, `chat` 200.

Minimal 8 berkas untuk `llm`: jawaban normal, `<think>…</think>` dibuang (`src/lib/llm.ts:42`),
`finish_reason: "length"` (`:43`), `base_resp.status_code` (`:39`), JSON dengan koma di ujung
(`:55`), JSON tanpa objek (`:49`), 429 dengan retry `max_tokens * 2` (`:63-70`), 401 tanpa retry.

### Daftar "what differs" yang berlaku

Pembulatan: tidak ada di adapter; angka diteruskan apa adanya. Urutan: `Object.entries` pada respons
lakehouse harus dipertahankan (JSON `Map` vs struct). `undefined`/`null`: `?:` di `ChatAnswer.note`
hilang dari JSON, jadi `Option` + `skip_serializing_if`. Panjang teks: `text.slice(0, 300)` di
`:81` memotong satuan UTF-16, sedangkan `chars()` memotong karakter; dipakai `chars()` dan
perbedaannya dicatat bila ada karakter non-BMP. Tanggal: tidak ada. Angka JSON: aturan D-2.

## Kriteria penerimaan

- [ ] `bun scripts/oracle/rekam.ts lakehouse query-ok --replay …` menulis berkas dengan bentuk di
      atas dan `keluar` sama dengan `bun scripts/oracle/run.ts lakehouse` untuk masukan yang sama.
- [ ] `grep -riE 'bearer |eyJ|password|oc_sk_' tests/rekaman` hanya menemukan `<dihilangkan>`.
- [ ] `cargo test -p pemdi-adapters --test rekaman_lakehouse` dan `… rekaman_llm` lulus tanpa
      jaringan: jalankan dengan `PEMDI_TEST_OFFLINE=1` (test gagal bila ada `reqwest` keluar).
- [ ] Dua belas + delapan berkas kasus ada; hitungan dicetak test.
- [ ] `docs/port/README.md` §2 menyebut `scripts/oracle/rekam.ts` dan format ini.
- [ ] `scripts/check.sh` PASS (bagian `rust`).

## Yang tidak dikerjakan

Klien HTTP adapter itu sendiri (`reqwest`, `PORT-20`/`PORT-21`), dan rekaman untuk OCR (`PORT-24`,
menunggu `DEC-5`). Berkas rekaman tidak dijadikan bagian gate di luar `cargo test`.
