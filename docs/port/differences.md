# Perbedaan yang disengaja: TypeScript dan Rust

Semua yang dilakukan implementasi Rust secara berbeda dengan sengaja. Perilaku yang berbeda dan
tidak tercatat di sini adalah bug.

| # | Di mana | Perilaku lama | Perilaku baru | Alasan | Disetujui, tanggal |
|---|---|---|---|---|---|
| D-1 | Oracle dan test paritas | `JSON.stringify` mengubah `NaN`/`Infinity` menjadi `null` | Oracle mencetak angka tak hingga sebagai string `"NaN"`, `"Infinity"`, `"-Infinity"`, dan test paritas Rust melakukan hal yang sama | Agar perbedaan NaN/Infinity tetap terlihat, tidak hilang menjadi `null` | owner (lewat `DEC-1`), 2026-11-25 |
| D-2 | Test paritas | Angka JSON ditulis `1` | `serde_json` menulis `1.0`; angka dibandingkan sebagai nilai (`1 == 1.0`, `0 == -0`), dan `serde_json` memakai fitur `float_roundtrip` supaya pembacaan desimal tidak membulatkan digit terakhir | Tanpa `float_roundtrip`, 18 dari 452 kasus `makro-hitung` gagal padahal hasil hitungnya identik | owner (lewat `DEC-1`), 2026-11-25 |

## Bug lama yang ikut diporting

Diporting apa adanya supaya paritas tetap terjaga. Masing-masing diperbaiki setelah cutover.

| # | Di mana | Apa yang salah | Backlog |
|---|---|---|---|
| B-1 | `capaian` (makro-hitung) | Target negatif tidak ditolak; untuk indikator "turun" dengan target negatif hasilnya bisa ratusan persen. Belum ada indikator dengan target negatif, jadi belum muncul di dasbor | `PORT-50` |
