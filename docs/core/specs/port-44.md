# `PORT-44` Route narasi makro dan berkas sumber

| | |
| --- | --- |
| Backlog | `PORT-44` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | `PORT-23` — berkas sumber dan data Makro |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Dua route melayani halaman Makro, dan keduanya gampang terlewat karena kecil:

- `src/app/api/makro/narasi/route.ts` (52 baris): `POST {indikator, tahun}` → cari indikator
  (`400 "Indikator tidak dikenal."`), `tahun = Number(tahun) || data.tahunUtama`, susun `masukan` 12
  field dengan `fmtNilai`/`fmtLaju`/`fmtPersen`/`labelSumber` dari `src/lib/makro-tampil.ts`,
  panggil `llmJson` dengan `max_tokens` 3.000, `400/502/503` sesuai galat, dan kembalikan
  `{narasi}` yang di-`trim`.
- `src/app/api/sumber/[...berkas]/route.ts` (72 baris): hanya bentuk
  `/api/sumber/<kumpulan>/<nama>` (`:50-53`); kumpulan harus `^[a-z0-9][a-z0-9-]*$` dan punya
  `manifest.json` (cache 60 detik, `:27-52`); nama tidak boleh `.`/`..`/mengandung `/`, `\`, `\0`
  (`:59-61`); berkas harus tercantum di manifest (`:64-71`); manifest tidak terbaca → `503 "Daftar
  sumber belum tersedia."`; selain itu `404 "Berkas tidak ditemukan."`; penyajian lewat
  `sajikanBerkas` (Range).

**Temuan yang harus diputuskan, bukan dipilih diam-diam:** `src/lib/makro-tampil.ts` (205 baris)
adalah berkas `*-tampil.ts`, dan `docs/port/README.md` §3 menyatakan berkas `*-tampil.ts` **tetap di
TypeScript** karena milik UI. Tetapi route narasi memakainya di server. Spec ini memilih menyalin
lima helper ke `pemdi-domain/src/format_narasi.rs` dan mengujinya terhadap fungsi TS lewat oracle;
berkas TS tidak disentuh, dan duplikasinya hilang saat `FE-5` memindahkan halaman ke API. Bila owner
lebih suka narasi tetap di TypeScript setelah cutover, itu perubahan lingkup `PORT-44` dan dicatat
sebagai DEVIATION di PR.

## Yang didapat pengguna

Tidak ada yang berubah. Tombol "Buat narasi" di halaman Makro menghasilkan paragraf dengan angka dan
sitasi yang sama, dan penampil PDF sumber tetap memuat halaman yang ditautkan.

## Rancangan

- `pemdi-domain/src/format_narasi.rs`: `dec(n, d)` (pemisah ribuan `id-ID`, koma desimal),
  `bagian_nilai`, `fmt_nilai`, `fmt_laju`, `fmt_persen`, `label_sumber`, `ringkas`. Ini fungsi murni
  dengan oracle `makro-tampil` di `scripts/oracle/modules.ts` (semua diekspor dari TS, jadi bisa
  dipanggil langsung).
  - `toLocaleString("id-ID")` memakai ICU; Rust perlu implementasi sendiri: pemisah ribuan `.`,
    desimal `,`, pembulatan setengah ke atas seperti ICU (bukan `js_round` untuk nilai negatif —
    uji `-0,5`). Kasus uji diturunkan dari oracle; bila ada selisih, differences.md.
- `pemdi-app/src/narasi.rs`: `masukan_narasi(data, indikator, tahun) -> Value` — urutan 12 kunci
  sama dengan TS (`daerah`, `indikator`, `satuan`, `arah`, `tahun_laporan`, `realisasi`,
  `realisasi_tahun_sebelumnya`, `laju_kinerja`, `target_rpjmd`, `capaian`, `kategori`,
  `provinsi_lampung`, `nasional`); `serde_json::to_string_pretty` untuk `JSON.stringify(masukan,
  null, 1)` dengan indentasi **satu spasi**.
- `pemdi-api/src/routes/makro.rs`: prompt LLM disalin byte demi byte dari TS (`:37-43`), termasuk
  `max_tokens: 3000`; `narasi` kosong → `502 "LLM tidak mengembalikan narasi."`.
- `pemdi-api/src/routes/sumber.rs`: aturan whitelist dan pesan dari daftar di atas, memakai
  `Sumber::kumpulan_sah`/`manifest` (`PORT-23`).
- Oracle: `makro-tampil` (murni, ≥ 300 kasus: satuan `%`, `indeks` dengan gini, `rupiah`,
  `ribu rupiah`, `juta rupiah/kapita/tahun`, `rupiah/kapita/bulan`, `ribu jiwa`, `tahun`, default;
  nilai `null` dan `NaN` → "–"), dan `narasi-masukan` (masukan JSON utuh sebagai satu kasus besar
  untuk 6 indikator × 3 tahun).
- Daftar "what differs" yang berlaku, spesifik:
  - **Pembulatan/desimal:** `toLocaleString` vs implementasi; `Math.round` di
    `rupiah/kapita/bulan`.
  - **Angka JSON:** `null` untuk nilai kosong; `NaN` → "–" sebelum serialisasi.
  - **Panjang teks:** `narasi.trim()`, tanpa potong.
  - **Regex:** `/rentang\s+([\d.,]+\s*[–-]\s*[\d.,]+)/` dan `/\.pdf($|[?#])/i` (di `makro-tampil`
    dan `makro.ts`).
  - **Urutan kunci** `masukan` (di atas).
  - Tanggal: tidak ada.

## Kriteria penerimaan

- [ ] `tests/parity/makro-tampil.cases` ≥ 300 kasus lulus; `fmtNilai(55.87, "rupiah")` = `"Rp 55,87
      jt"` sama dengan TS.
- [ ] `masukan` untuk enam indikator sama byte dengan `JSON.stringify(masukan, null, 1)` TS.
- [ ] `POST /api/makro/narasi` dengan indikator asing → `400 "Indikator tidak dikenal."`; LLM
      mengembalikan `{}` → `502`; tanpa `LLM_KEY` → `503`.
- [ ] Transkrip `GET /api/sumber/spm/<berkas>` → `200` + `Content-Type: application/pdf`; folder
      `dokumen` (tanpa manifest) → `404`; `GET /api/sumber/spm/..%2Fx` → `404`; berkas yang tidak
      ada di manifest → `404`.
- [ ] Transkrip `Range` → `206` dengan `Content-Range` yang sama seperti route TS.
- [ ] Baris ledger `PORT-44` **parity green**; perbedaan dan duplikasi helper dicatat di
      [differences.md](../../port/differences.md) dan badan PR.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Halaman Makro dan tampilannya (`PORT-45`, `FE-5`), membangun ulang `sumber/*/manifest.json`
(`scripts/portainer.sh sumber`), dan pemilihan penyedia LLM (`DEC-3`).
