# <Nama fitur>

Satu halaman per fitur. Agent membangun dari halaman ini; owner menerimanya dengan halaman ini.
Salin berkas ini menjadi `<slug>.md`. Tulis hanya yang bisa diamati pengguna. Cara membangunnya
ada di [`docs/ARSITEKTUR.md`](../../ARSITEKTUR.md) dan rencana porting di [`docs/port/`](../../port/).

| | |
| --- | --- |
| Modul | Salah satu: Indeks Pemdi, Kinerja Daerah, Dokumen & Bukti, AI Tubaba, Platform, Data, Keamanan, Operasi |
| Backlog | `FT-<n>` di [BACKLOG.md](../BACKLOG.md) |
| Jenis | Feature |
| Spec | `docs/core/specs/<id>.md`, atau "tidak ada spec; halaman ini yang menjadi acuan" |
| Status | Idea / Planned / Building / In Acceptance / Released / Killed |
| Prioritas | P0 / P1 / P2 / P3 |
| Pemilik | Pemilik modul. Tidak dinamai di repo. |
| Penerima | Yang menjalankan checklist. Bukan pembuat fitur. Tidak dinamai di repo. |
| Rencana | `docs/superpowers/plans/<tanggal>-<slug>.md`, atau "tidak ada" |
| Mulai | Tanggal rencana; juga di BACKLOG |
| Terkirim | Tanggal merge PR yang mengirimkannya; juga di BACKLOG |
| Bukti | PR, dan tautan build yang diterima atau hasil checklist-nya |

Status dan prioritas dicatat resmi hanya di [BACKLOG.md](../BACKLOG.md). Baris di atas adalah
salinan untuk pembaca halaman ini.

## Masalah

Apa yang salah hari ini, dua atau tiga kalimat, dengan buktinya.

## Yang bisa dilakukan pengguna

Pernyataan pendek yang bisa diperiksa, satu per baris.

1. ...
2. ...

## Tidak termasuk

Apa yang sengaja tidak dikerjakan.

## Bertanya ke AI Tubaba

Bisa atau tidak, dan bila bisa, apa yang ditanyakan pengguna.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/<rute>/page.tsx` |
| Tampilan | `src/components/<berkas>.tsx` |
| Logika | `src/lib/<berkas>.ts` |
| Data | tabel lakehouse `pemdi_*`, atau berkas di `src/data/` |

## Keputusan

Hal yang harus dipilih owner. Sampai disahkan, yang dipakai adalah Default. Setiap angka
*(usulan)* di spec dicatat di sini.

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |

"Disetujui" berisi tanggal owner menyetujui, atau "Berlaku (tertulis di kode)" bila keputusan
sudah dijalankan tetapi belum disahkan.

## Batasan yang disampaikan ke pengguna

Pernyataan jelas tentang apa yang tidak dilakukan fitur ini.

## Checklist penerimaan

Satu baris per pemeriksaan. ID tetap seumur fitur (`FT-<n>-AC<n>`), supaya bisa dilacak.
Dijalankan di deployment nyata, `epemdi.ai.id`. **Hasil** hanya **Lulus**, **Gagal**, atau
**Belum dijalankan** (dengan alasannya). Langkah yang tidak dilakukan bukan Lulus. Langkah yang
butuh terminal ditandai (operator).

Selalu ada: jalur normal, kegagalan yang terlihat, pengguna tanpa izin, fitur dimatikan, dan nilai
tak diketahui yang ditampilkan jujur.

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-<n>-AC1` | ... | ... | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan bersama baris backlog
