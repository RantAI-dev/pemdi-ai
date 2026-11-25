# `PORT-21` Adapter LLM

| | |
| --- | --- |
| Backlog | `PORT-21` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | `PORT-3` — adapter dibuktikan dengan rekaman permintaan/respons |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/llm.ts` (71 baris) melayani tiga pemakai: intake dokumen (`src/lib/proses.ts:71`), estimasi
nilai (`src/lib/estimasi.ts:71`), narasi makro (`src/app/api/makro/narasi/route.ts:50`), dan saran
pertanyaan (`src/app/api/ask/saran/route.ts:10`). Perilaku yang menentukan hasil:

- `llmConfigured` (`:6-8`): perlu `LLM_URL`, `LLM_MODEL`, dan `LLM_KEY` sekaligus.
- `complete` (`:12-45`): `POST <LLM_URL>/chat/completions`, `authorization: Bearer $LLM_KEY`,
  `temperature: 0.1`, `max_tokens` dari pemanggil, batas waktu **240 detik** (`:32`).
- Header sesi: `x-opencode-session: $LLM_SESSION` dan `user-agent: pemdi-ai/1.0` **hanya** bila
  `LLM_SESSION` diisi (`:21`). Tanpa itu OpenCode Go menolak `MissingSessionID` (insiden di
  [OPERATIONS.md](../../OPERATIONS.md)).
- Jawaban: `base_resp.status_code` → galat (`:39`); isi dipotong pada `<think>…</think>`
  (`:42`); `finish_reason === "length"` → galat "terpotong" (`:43`).
- `parse` (`:47-60`): ambil objek pertama `/\{[\s\S]*\}/`, lalu bila `JSON.parse` gagal, buang koma
  sebelum `}`/`]` dan ganti `\r\n\t` menjadi spasi, coba sekali lagi.
- `llmJson` (`:63-70`): ulangi sekali dengan `max_tokens * 2`, kecuali galat 4xx atau "menolak".

Model bisa mengembalikan JSON yang tidak sah; tiga jalur pemulihan itu adalah bagian dari perilaku,
bukan detail.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Dokumen tetap terbaca, estimasi tetap muncul, dan narasi makro
tetap ditulis, termasuk saat model menjawab dengan `<think>` atau koma berlebih.

## Rancangan

- `rust/crates/pemdi-ports/src/llm.rs`: `trait Llm { fn configured(&self) -> bool;
  async fn complete(&self, system: &str, user: &str, max_tokens: u32) -> Result<String, PortError>; }`.
  Trait **tidak** memakai `serde`/`DeserializeOwned`, karena `pemdi-ports` hanya boleh bergantung
  pada domain (ADR 0002) dan tidak punya serde.
- `pemdi-app/src/llm_json.rs`: `llm_json<T: DeserializeOwned>(llm, system, user, max_tokens)` —
  memanggil `complete`, menjalankan `parse` gaya TS, dan mengulang dengan `max_tokens * 2` bila
  galatnya bukan `PortError::Status(400..=499)` atau `PortError::Rejected`. Di sinilah aturan
  "coba sekali lagi" hidup, sehingga dapat diuji dengan LLM palsu.
- `pemdi-adapters/src/llm.rs`: klien HTTP. Memakai `reqwest` yang sama dengan `PORT-20` (satu
  persetujuan owner); bila `PORT-20` belum mendarat, tambahkan `reqwest` di task ini.
  `LLM_URL` dirapikan (`replace(/\/$/, "")`), `LLM_KEY` hanya di header, tidak pernah dicatat.
- `pemdi-api/src/config.rs`: `LlmConfig` dari `LLM_URL`, `LLM_MODEL`, `LLM_KEY`, `LLM_SESSION`.
- Oracle: rekaman `tests/rekaman/llm/*.json` (`PORT-3`), minimal 8 berkas, termasuk: jawaban
  normal, `<think>`, `finish_reason: "length"`, `base_resp.status_code`, koma di ujung, tanpa
  objek JSON, 429 lalu sukses dengan `max_tokens` dua kali, dan 401 tanpa ulang.
  Agar `parse` dapat diuji tanpa jaringan, ekspor fungsi itu dari `src/lib/llm.ts` sebagai
  `parseJsonDariLlm` **tanpa mengubah perilaku**, lalu daftarkan di `scripts/oracle/modules.ts`
  (`llm-parse`); perubahan nama itu dicatat di PR.
- Yang dibandingkan test: (a) nilai balik, (b) badan permintaan per field (`model`,
  `temperature`, `max_tokens`, `messages`), (c) header yang terlihat (`x-opencode-session` ada/
  tidak ada).
- Daftar "what differs" yang berlaku, spesifik:
  - **Regex:** `/<think>[\s\S]*?(<\/think>|$)/g` → `regex` (dependensi baru; bila `PORT-12` sudah
    menambahkannya, pakai yang sama). `\s` di JS dan Rust sama untuk ASCII; `$` sama-sama ujung
    teks.
  - **Angka JSON:** `JSON.parse("1e999")` menghasilkan `Infinity`; `serde_json` menolak. Kasus ini
    dicatat di differences.md bila rekaman membuktikannya; bukan perilaku yang diinginkan, tetapi
    tidak boleh diam-diam berubah.
  - **Panjang teks:** `res.text().slice(0, 200)` (`:37`) memotong 200 satuan UTF-16.
  - **`undefined`:** `ChatAnswer.note` tidak ada saat kosong; tidak berlaku di modul ini karena
    hasilnya `String`.
  - **Timeout:** 240 detik; `reqwest` timeout diatur sama, dan `PortError::Timeout` memetakan 504 di
    lapisan route.

## Kriteria penerimaan

- [ ] `cargo test -p pemdi-adapters --test rekaman_llm` lulus offline (≥ 8 berkas).
- [ ] Test `llm_json`: galat 429 → dua panggilan, `max_tokens` kedua = 2×; galat 400 → satu
      panggilan.
- [ ] Test `parseJsonDariLlm` lewat oracle: ≥ 60 kasus (koma, baris baru dalam string, teks
      pembuka/penutup, tanpa objek, objek bersarang).
- [ ] Test header: `LLM_SESSION` kosong → tidak ada `x-opencode-session` dan tidak ada `user-agent`;
      terisi → keduanya ada.
- [ ] Baris ledger `PORT-21` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Prompt dan pembersihan keluaran model (`PORT-34`, `PORT-35`), pemilihan endpoint produksi (`DEC-3`,
`SEC-1`), dan penggantian `llm-proxy` di stack.
