# `PORT-34` Use case estimasi nilai (penilaian AI)

| | |
| --- | --- |
| Backlog | `PORT-34` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `PORT-21` (adapter LLM) dan `PORT-31` (kebutuhan/bukti) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/estimasi.ts` (119 baris) menyusun prompt penilaian, memanggil LLM, dan menyimpan usulan.
Yang menentukan hasil:

- `SYSTEM` (`:14-26`): teks panjang dengan aturan rentang nilai per tingkat dan bentuk JSON wajib.
  Prompt adalah kontrak dengan model: mengubah satu kata mengubah usulan nilai.
- `bukti` (`:31-62`): susunan blok "Status dokumen kunci", "Temuan", "Angka", "Jawaban survei",
  dengan batas 40 jawaban (`:39`), 60 temuan (`:51`), 40 metrik (`:55`), potongan 140/600 karakter
  (`:59`), dan aturan `jawaban.length > 15`, bukan `[File]`.
- Tanpa temuan dan tanpa jawaban → `null` (`:41`), dan pemanggil memakai nilai 1,00 dengan teks
  `TANPA_BUKTI` (`:89-90`, `:107`).
- `estimasiIndikator` (`:64-84`): `Math.min(5, Math.max(1, Math.round(Number(r.nilai) * 100) / 100))`
  — dua operasi berbeda (clamp lalu bulat 2 desimal), `Number.isNaN` setelahnya, `penjelasan`
  dipotong 3.000, `kekurangan` maksimal 8.
- `perbaruiEstimasi` (`:97-119`): lewati penilaian `Manual` (`:103`), penjaga `berjalan` (`:86`,
  `:98-99`), satu indikator gagal tidak menghentikan sisanya (`:112-114`).

## Yang didapat pengguna

Tidak ada yang berubah di layar. Usulan nilai AI di halaman Penilaian tetap muncul dengan angka,
penjelasan, dan daftar kekurangan yang sama, dan nilai manual tidak pernah ditimpa.

## Rancangan

- `pemdi-app/src/estimasi.rs`:
  - `pub fn prompt_bukti(...) -> Option<PromptBukti>` — murni; mengembalikan teks yang **sama byte**
    dengan TS, plus hitungan `temuan`, `jawaban`, `kebutuhanBelum`.
  - `pub async fn estimasi_indikator(&Llm, &R, &KB, no) -> Result<Option<Estimasi>, PortError>`.
  - `pub async fn perbarui_estimasi(...)`, dengan penjaga `tokio::sync::Mutex<bool>` di state
    `pemdi-api`.
- Kontrak `pemdi-contracts/src/estimasi.rs`: `Estimasi { nilai, penjelasan, kekurangan, dasar }`.
- Pembulatan: helper `js_round` (`(x + 0.5).floor()`), lalu clamp 1..5. Urutannya penting: TS
  membulatkan dulu, lalu `Math.min`/`Math.max`; angka 5,004 → 5,00; 0,996 → 1,00.
- Oracle: modul `estimasi` dengan `promptBukti` dan `normalisasiNilai` (murni). Generator: fixture
  `Dok`/kebutuhan/jawaban yang membuat setiap bagian prompt muncul, batas 40/60/40, potongan
  140/600, jawaban `"[File] …"` dan panjang 15/16, serta nilai `0.994`, `1.005`, `5.004`, `NaN`,
  `"3,5"`, `null`.
- Pemanggilan LLM diuji dengan `Llm` palsu yang mengembalikan rekaman (`PORT-3`); parameter
  `max_tokens = 6000` (`:74`) sama.
- Daftar "what differs" yang berlaku, spesifik:
  - **Pembulatan:** `Math.round` vs `round` (di atas).
  - **Angka:** `Number("3,5")` → `NaN` di JS (koma bukan desimal) → galat "tidak dapat dibaca";
    `serde_json` akan menolak sebelum itu; samakan pesan galat di lapisan route.
  - **Panjang teks:** semua `slice` dihitung UTF-16 di JS.
  - **`undefined` vs `null`:** `kekurangan` kosong → `[]`, bukan `null`; `Est` tidak punya field
    opsional.
  - **Urutan:** temuan/metrik mengikuti urutan dokumen; jangan diurutkan ulang.
  - Regex: tidak ada di modul ini (JSON dari model sudah diurai di `PORT-21`).

## Kriteria penerimaan

- [ ] `tests/parity/estimasi.cases` ≥ 100 kasus lulus, termasuk 20 kasus yang membandingkan prompt
      **utuh** (bukan hanya potongan).
- [ ] Prompt untuk indikator 1 dan 20 dengan fixture "lengkap" sama byte dengan oracle (disimpan
      sebagai dua kasus besar).
- [ ] `normalisasiNilai`: 0,994 → 0,99; 1,005 → 1 (representasi biner, sama dengan JS); 5,004 → 5;
      `NaN` → galat; `null` → galat.
- [ ] Test `perbaruiEstimasi`: penilaian `Manual` dilewati; indikator tanpa bukti mendapat 1,00 +
      `TANPA_BUKTI`; dua pemanggilan bersamaan hanya satu yang berjalan.
- [ ] Rekaman LLM: `max_tokens` 6000, `temperature` 0,1, `model` dari env.
- [ ] Baris ledger `PORT-34` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Route `/api/penilaian/ai` (`PORT-43`), penulisan ke registry (`PORT-22` memanggil `save_penilaian`),
sinkronisasi ke lakehouse (`PORT-35`), dan perubahan prompt (kualitas penilaian adalah `AI-*`).
