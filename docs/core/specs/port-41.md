# `PORT-41` Route `/api/ask` (NDJSON, ping 15 detik)

| | |
| --- | --- |
| Backlog | `PORT-41` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `PORT-30` — konteks skema tabel |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/app/api/ask/route.ts` (119 baris) adalah AI Tubaba. Setiap bagiannya punya alasan:

- Batas 12 pesan terakhir dan pesan terakhir harus `user` (`:53-56`); selain itu `400
  {"error":"Pertanyaan kosong."}`.
- `TOOLS` empat alat baca (`:9`), konteks dari `schemaContext(await userTables())` (`:60`).
- Kopilot menjawab NDJSON; route meneruskan `status`/`tool`/`delta` dan menutup dengan satu `done`
  atau satu `error` (`:89-101`). Galat upstream diteruskan dengan status upstream dan pesan
  gabungan `error`+`detail`+`hint` (`:63-66`).
- `hasil` (`:28-41`) memilih `run_sql` terakhir yang "bisa digambar", jika tidak ada yang terakhir;
  `bisaDigambar` (`:16-21`) = 2–40 baris, ≥ 2 kolom, dan ada satu kolom yang **semua** barisnya
  angka menurut `angka` (`:13`).
- Ping `{type:"ping"}` setiap **15 detik** (`:76`). Ini bukan hiasan: Cloudflare memutus respons
  yang diam 100 detik ([OPERATIONS.md](../../OPERATIONS.md)), dan model bisa berpikir lebih lama.
- `maxDuration = 300` (`:7`), `content-type: application/x-ndjson`, `cache-control: no-cache`
  (`:115`).
- Jawaban kosong setelah ada tool tapi tanpa delta → satu baris `error` dengan pesan khusus
  (`:98`).

## Yang didapat pengguna

Tidak ada yang berubah. Pertanyaan tetap dijawab bertahap, grafik tetap muncul untuk hasil 2–40
baris, dan jawaban panjang tidak terputus di 100 detik.

## Rancangan

- `pemdi-api/src/routes/ask.rs` + `pemdi-app/src/ask.rs`:
  - `pilih_hasil(trace) -> Hasil` murni, diuji oracle.
  - `siapkan(messages) -> Result<Vec<ChatMessage>, ApiError>`: saring isi kosong, ambil 12 terakhir,
    wajib diakhiri `user`.
  - Streaming: `axum::body::Body::from_stream` dari `Lakehouse::chat_stream`, digabung dengan
    `tokio::time::interval(Duration::from_secs(15))` (stream `select`), dihentikan saat klien
    memutus (drop stream → `reader.cancel()` seperti `:111-113`).
- Kontrak `pemdi-contracts/src/ask.rs`: `Pertanyaan`, `BarisNdjson` (enum bertag `type`:
  `status`, `tool`, `delta`, `done`, `error`, `ping`), `Hasil` dengan `sql: Option<String>`,
  `columns: Vec<String>`, `rows: Vec<Value>`, `queries: u32`.
- Urutan kunci JSON: `{"type","answer","sql","columns","rows","queries"}` seperti literal TS
  (`:33-40`); `serde` menulis sesuai urutan field struct.
- Ping tetap 15 detik dan tidak boleh dihapus atau diperpanjang tanpa keputusan owner (Cloudflare).
- Oracle: modul `ask` dengan `bisaDigambar` dan `hasil` (argumen JSON `toolTrace`). Generator:
  baris 1/2/40/41, satu kolom, kolom campuran angka dan teks, kolom kosong, `"1"`, `" 1 "`,
  `"1e3"`, `""`, `null`, `true`, `false` (JS `Number(true) = 1`, dan `angka(true)` = true), `NaN`
  sebagai string, beberapa `run_sql` (yang bisa digambar di tengah vs terakhir), dan trace tanpa
  `run_sql`.
- Daftar "what differs" yang berlaku, spesifik:
  - **Angka:** `angka` memakai `Number(v)`; `Number("")` = 0 tetapi `""` dikecualikan lebih dulu;
    `Number(null)` = 0 tetapi `null` dikecualikan. Tabel kebenaran di atas harus sama di Rust.
  - **Urutan kunci:** kunci objek `done` harus sama urutannya (UI lama mem-parse JSON, jadi urutan
    tidak wajib, tetapi test membandingkan byte untuk berjaga).
  - **`undefined`:** `body.answer ?? ""`; `data?.columns ?? …` menjadi `Option`.
  - **Panjang teks:** tidak ada pemotongan pesan; badan permintaan ke kopilot sama byte.
  - **JSON bebas:** `rows` tetap `serde_json::Value` (D-2), jangan diubah ke f64.
  - **Waktu:** hanya interval ping; tidak ada tanggal di badan.

## Kriteria penerimaan

- [ ] `tests/parity/ask.cases` ≥ 150 kasus lulus (pemilihan hasil + `bisaDigambar`).
- [ ] Transkrip: `curl -N -X POST localhost:3200/api/ask -H 'content-type: application/json'
      -d '{"messages":[{"role":"user","content":"berapa jumlah aplikasi"}]}'` menampilkan baris
      `status`/`tool`/`delta` dan berakhir satu `done`; header `content-type:
      application/x-ndjson`.
- [ ] Uji ping: dengan rekaman kopilot yang diam 40 detik (server fixture), transkrip memuat
      minimal dua baris `{"type":"ping"}` dan jaraknya ≈15 detik.
- [ ] `{}` atau pesan terakhir `assistant` → `400 {"error":"Pertanyaan kosong."}`.
- [ ] Upstream 500 → status 500 dan `error` gabungan `error`+`detail`+`hint`; model menjawab kosong
      → satu baris `error` dengan pesan TS.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

`/api/ask/saran` (tetap TypeScript sampai `PORT-45`/`FE-5`), pemilihan kueri grafik yang lebih pintar
(`AI-1`, `AI-2`), dan perubahan UI Tanya.
