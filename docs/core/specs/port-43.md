# `PORT-43` Route penilaian

| | |
| --- | --- |
| Backlog | `PORT-43` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | `PORT-34` — estimasi nilai |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Dua route ini menulis nilai resmi indikator, dan bentuk responsnya berbeda menurut ada tidaknya
parameter `i`:

- `src/app/api/penilaian/route.ts` (45 baris):
  - `GET ?i=<no>`: bila `no` bukan 1–20, kembalikan **tanpa** `bukti`/`kebutuhan`:
    `{penilaian, sync, llm}` (`:10-12`). Bila valid: `{penilaian, bukti, buktiError, kebutuhan, sync,
    llm}` — `buktiError` berisi pesan galat sebagai string (`""` saat sukses, `:15-21`), dan
    `kebutuhan` membuang field `kata` (`:24`).
  - `POST`: `indikator_no` harus integer 1–20 (`400 "Indikator tidak valid."`), `nilai` dibulatkan
    `Math.round(x*100)/100` dan harus 1–5 (`400 "Nilai harus antara 1,00 dan 5,00."`), `penjelasan`
    dipotong 4.000, `penilai` hanya `"AI"` atau `"Manual"` (`:29-42`), lalu
    `{penilaian, sync}`.
- `src/app/api/penilaian/ai/route.ts` (21 baris): `{indikator_no}` → `estimasiIndikator`; tanpa bukti
  → `422` dengan pesan "Belum ada temuan dokumen atau jawaban survei…"; `LlmError` → `503` dengan
  pesannya.

`422` dipakai hari ini padahal `docs/conventions.md` melarangnya. Selama respons dibekukan, `422`
tetap; penggantiannya di `PORT-48`.

## Yang didapat pengguna

Tidak ada yang berubah. Halaman Penilaian menampilkan usulan AI, bukti, kebutuhan yang belum
terpenuhi, dan status sinkronisasi yang sama; nilai yang diketik manual disimpan dengan pembulatan
yang sama.

## Rancangan

- `pemdi-api/src/routes/penilaian.rs` mendaftarkan `GET/POST /api/penilaian` dan
  `POST /api/penilaian/ai`.
- `pemdi-contracts/src/penilaian.rs`: dua tipe respons berbeda — `PenilaianRingkas { penilaian, sync,
  llm }` dan `PenilaianIndikator { penilaian, bukti, bukti_error, kebutuhan, sync, llm }` dengan
  `#[serde(rename_all = "camelCase")]` sehingga `bukti_error` menjadi `buktiError`.
- `kebutuhan` memakai tipe tanpa `kata` (`PORT-31`); pembuangan dilakukan saat menyusun kontrak,
  bukan dengan `serde(skip)` pada tipe domain.
- Pembulatan POST: `js_round(nilai * 100.0) / 100.0`, lalu cek rentang; urutan sama dengan TS.
- `sync` berasal dari `status_sinkron()` (`PORT-35`), `llm` dari `Llm::configured()`.
- Oracle: modul `penilaian` dengan `normalisasiNilai` (pembulatan + validasi) dan
  `potongPenjelasan`; generator: 0,994/1/1,005/4,999/5/5,001/`null`/`"3"`/`NaN`, dan `buktiError`
  saat `Lakehouse` gagal.
- Daftar "what differs" yang berlaku, spesifik:
  - **Pembulatan:** `Math.round` (helper `js_round`); 1,005 → 1,00 seperti JS.
  - **Batas nilai:** `1 <= nilai <= 5` setelah pembulatan, bukan sebelum.
  - **`null` vs `undefined`:** `nilai: null` menghapus nilai; `nilai` yang tidak dikirim juga
    `null` (`b.nilai == null`).
  - **Panjang teks:** `penjelasan.slice(0, 4000)` satuan UTF-16.
  - **Status:** `422` dipertahankan; dicatat di PR sebagai utang `PORT-48`.
  - Regex/tanggal: tidak ada (waktu `diperbarui` dari `PORT-22`).

## Kriteria penerimaan

- [ ] `GET /api/penilaian` (tanpa `i`) → `{penilaian, sync, llm}`; tiga kunci, tidak lebih.
- [ ] `GET /api/penilaian?i=3` → enam kunci; `kebutuhan[].kata` tidak ada; `buktiError: ""` saat
      lakehouse sehat.
- [ ] `GET /api/penilaian?i=21` dan `?i=abc` → bentuk ringkas (bukan `400`), sama dengan TS.
- [ ] `POST` nilai `4,567` → tersimpan `4,57`; `0,99` dan `5,01` → `400`; `i=0` → `400 "Indikator
      tidak valid."`.
- [ ] `POST /api/penilaian/ai` tanpa bukti → `422` dengan pesan TS; `LLM_KEY` kosong → `503`.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Menyimpan ke registry (`PORT-22`), estimasi (`PORT-34`), sinkronisasi (`PORT-35`), penggantian
`422` (`PORT-48`), dan UI Penilaian (`FE-5`).
