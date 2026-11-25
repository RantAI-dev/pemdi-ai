# Pemdi-AI

Dasbor Pemerintah Digital (Pemdi) untuk kabupaten/kota, di atas RantAI
Lakehouse. POC ini memakai data Kabupaten Tulang Bawang Barat (`TBB/`) dan
mengacu pada Permen PANRB 8/2026 tentang Evaluasi Kinerja Pemerintah Digital.

Alurnya: **dokumen apa pun → AI → data Pemdi → dasbor**.

Arsitektur teknis lengkap (intake → OCR → lakehouse → AI → dasbor) ada di
[`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md).

- **Dokumen.** PDF, Word, PowerPoint dan foto dibaca teksnya (OCR untuk hasil
  pindai), lalu AI mengekstrak temuan per indikator, angka yang dilaporkan,
  dan kebutuhan data yang dipenuhi. CSV/Excel/Parquet dimuat sebagai tabel.
- **Dasbor.** Indeks Pemdi (7 aspek, 20 indikator) dari estimasi AI atas
  temuan itu, kesiapan OPD, data dan aplikasi.
- **Kebutuhan data.** Dokumen/data yang harus ada per indikator, mana yang
  belum ada, dan OPD mana yang belum menyerahkan.
- **AI Tubaba.** Kopilot NL2SQL lakehouse; SQL selalu ditampilkan.

## Menjalankan

Prasyarat: Docker, Bun, `uv` (untuk OCR), `pdftotext`/`pdftoppm` (poppler-utils), `unzip`, dan repo
RantAI-Lakehouse di `~/rantai/RantAI-Lakehouse` (atau atur `LAKEHOUSE_DIR`).

```bash
bun install
cp infra/lakehouse.env.example infra/lakehouse.env   # isi AUTH_BOOTSTRAP_PASSWORD dan LLM_KEY
scripts/lakehouse.sh up          # build + start lakehouse (pertama kali: belasan menit)
scripts/lakehouse.sh init        # sekali: buat registry ClickHouse
bun run lakehouse:bootstrap      # akun admin, tenant, tulis .env.local
bun run seed                     # TBB/ -> registri dokumen (dengan OCR, ~15 menit) + tabel lakehouse
bun run build && scripts/restart-app.sh   # http://localhost:3100
# lalu di halaman Dokumen: "Proses dengan AI" (perlu LLM_KEY)
```

Lakehouse dijalankan sebagai proyek compose terpisah (`pemdi-lakehouse`) dari
`docker-compose.yml` milik repo lakehouse; repo itu tidak diubah. Dagster ada
di port 3001, API lakehouse di 8080.

Mengganti `LLM_KEY`: ubah di `infra/lakehouse.env`, jalankan
`scripts/lakehouse.sh up` dan `bun run lakehouse:bootstrap`, lalu mulai ulang
aplikasi.

## Produksi (Portainer)

`epemdi.ai.id` dan `pemdi.rantai.dev` berjalan sebagai satu stack Portainer
`pemdi-ai` di `192.168.18.148` (lakehouse, aplikasi di port 3100, dan dua
Cloudflare Tunnel ke aplikasi yang sama). Tunnel `pemdi.rantai.dev` memakai
volume `pemdi-ai_cloudflared`; tunnel `epemdi.ai.id` ada di akun Cloudflare
lain, dikelola dari dasbor (public hostname → `http://app:3100`), dan token-nya
diisi lewat `EPEMDI_TUNNEL_TOKEN` di `.env.local`.
Tidak ada build di mesin pengembang: image aplikasi dibangun di host tujuan.
Butuh `PORTAINER_KEY` di `.env`.

```bash
TAG=$(date +%Y%m%d%H%M)
scripts/portainer.sh build $TAG   # bangun image aplikasi di host Portainer
scripts/portainer.sh stack $TAG   # perbarui stack ke image itu
```

`scripts/portainer.sh volumes` menyalin volume lakehouse lokal, `data/` dan
konfigurasi tunnel ke host dan **menimpa** isi volume di sana; hanya untuk
pindahan awal. Image lakehouse dikirim apa adanya (`docker save`), jadi
lakehouse tidak ikut dibangun ulang. `deploy/stack.yml` berisi rahasia dan
tidak masuk git.

## Susunan

| Path | Isi |
| --- | --- |
| `src/data/pemdi.ts` | Aspek, indikator, bobot, predikat, rumus indeks (Permen) dan pemetaan kode survei ke indikator |
| `src/data/permen-kriteria.json` | Deskripsi dan kriteria tiap tingkat, diekstrak `scripts/extract-permen.py` |
| `src/lib/lakehouse.ts` | Klien API lakehouse (login, SQL, unggah, kopilot) |
| `src/lib/tables.ts` | Daftar tabel Pemdi-AI dan arti kolomnya; juga konteks skema untuk AI |
| `src/data/kebutuhan.ts` | Katalog kebutuhan data per indikator (tafsir Pemdi-AI atas kriteria Permen) |
| `src/lib/intake.ts`, `scripts/ocr.py` | Ekstraksi teks berkas, OCR, pembuatan CSV |
| `src/lib/store.ts` | Registri dokumen (`data/dokumen.json`) |
| `src/lib/proses.ts`, `estimasi.ts` | Langkah AI: dokumen -> temuan/angka; temuan -> nilai indikator |
| `src/lib/kebutuhan.ts` | Status tiap kebutuhan data |
| `src/lib/sinkron.ts` | Salin hasil pipeline ke tabel lakehouse |
| `scripts/seed.ts` | `TBB/` menjadi tabel lakehouse |
| `design-system/tokens` | Token tema RantAI Lakehouse (disalin dari repo lakehouse, AGPL-3.0) |

## Tabel di lakehouse

Semua tabel adalah tabel mentah (Bronze) dan dibaca sebagai
``icecat_api.`bronze.<nama>` ``. Setiap kolom bertipe teks.

`pemdi_indikator`, `pemdi_kriteria`, `pemdi_penilaian`, `pemdi_opd`,
`pemdi_survei`, `pemdi_dokumen`, `pemdi_temuan`, `pemdi_metrik`,
`pemdi_kebutuhan`, `pemdi_aplikasi`, `pemdi_data_statistik`,
`tbb_dalam_angka`. Arti kolom ada di `src/lib/tables.ts`.

Nama, e-mail dan nomor telepon responden survei tidak dimuat.

## Yang perlu diketahui

- **Nilai indikator bukan hasil evaluasi resmi.** Data TBB berisi jawaban
  survei kebutuhan dan dokumen pendukung, bukan nilai tingkat kematangan.
  Nilai diisi di halaman Penilaian Indikator, manual atau dari usulan AI.
  Indeks baru dihitung setelah 20 indikator terisi.
- **Pemetaan pertanyaan survei ke indikator adalah tafsir Pemdi-AI**
  (`KODE_INDIKATOR` di `src/data/pemdi.ts`), bukan ketentuan Permen.
- **OCR** membaca 6 halaman pertama berkas pindaian dan sering menghilangkan
  spasi antarkata; AI masih bisa membacanya, pencocokan kata kunci kurang andal.
- **Tanpa LLM**, status kebutuhan data ditebak dari kode survei dan kata kunci
  pada nama/judul berkas ("terdeteksi"); itu bukan pembacaan isi.
- **Hasil pipeline disimpan lokal** (`data/dokumen.json`, `data/penilaian.json`)
  dan disalin ke lakehouse; halaman Dokumen, Kebutuhan Data dan Indeks membaca
  salinan lokal itu, bukan lakehouse.
- **Nilai disimpan di `data/penilaian.json`** lalu disalin ke tabel
  `pemdi_penilaian`. Lakehouse menolak muatan tanpa baris, jadi bila semua
  nilai dihapus, tabel itu tetap berisi salinan terakhir.
- **Tabel mentah tidak dapat dihapus lewat API lakehouse.**
- **Dalam Angka** hanya edisi 2024 yang dimuat; berkas 2022 dan 2023 adalah
  hasil OCR dengan angka yang rusak.
- **Tenant.** Unggahan memakai tenant bawaan lakehouse `meridian-labs`
  (`LAKEHOUSE_TENANT_SLUG`), karena tenant baru mendapat warehouse sendiri
  yang tidak terbaca lewat database kueri bawaan.
- **Login.** Akun ada di `data/users.json` (`bun run user ...`; di produksi
  jalankan di kontainer app). Aplikasi memakai satu akun lakehouse di sisi server.
