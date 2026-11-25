# `PORT-46` Kontainer `pemdi-api` berdampingan dan mode bayangan

| | |
| --- | --- |
| Backlog | `PORT-46` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | tidak ada di backlog; mulai setelah ada satu route yang parity green (`PORT-40`–`PORT-45`) |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Hari ini hanya ada satu kontainer: `app` di stack `pemdi-ai` (`docs/OPERATIONS.md:5-7`,
`deploy/stack.yml` bagian `app`), dengan port `3100:3100` dan volume `app_data` → `/app/data`.
Tidak ada `pemdi-api` di stack, tidak ada Dockerfile untuknya, dan tidak ada cara membandingkan
jawaban lama dan baru. [docs/port/README.md](../../port/README.md) §7 meminta keduanya berjalan
bersama, Next.js meneruskan route yang sudah diporting sambil mencatat selisih.

`deploy/stack.yml` **dihasilkan** `scripts/portainer-stack.py` (komentar `AGENTS.md`); menyunting
YAML langsung akan hilang pada rilis berikutnya.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Yang didapat adalah jaminan: sebelum satu pun route dipindahkan,
jawaban Rust dan TypeScript dibandingkan pada lalu lintas nyata selama tujuh hari.

## Rancangan

1. **Image.** `deploy/Dockerfile.api` (multi-stage, `cargo build --release -p pemdi-api`, image
   akhir `debian:bookworm-slim` + `ca-certificates` + `pdftotext` bila `PORT-24` sudah memakainya).
   `scripts/portainer.sh build <tag>` membangun dua image: `pemdi-ai/app:<tag>` dan
   `pemdi-ai/api:<tag>`.
2. **Layanan.** `scripts/portainer-stack.py` menambah `stack["services"]["api"]`:
   `image: pemdi-ai/api:<tag>`, `restart: unless-stopped`, env sama dengan `app` (kecuali
   `EPEMDI_TUNNEL_TOKEN`), `LAKEHOUSE_URL=http://lakehouse-api:8080`, `SUMBER_DIR=/app/sumber`,
   `PEMDI_API_READONLY=1`, volume `app_data:/app/data` (baca-tulis hanya setelah cutover tulis) dan
   `sumber:/app/sumber:ro`, **tanpa** `ports` (hanya dijangkau `app` di jaringan stack),
   `healthcheck: curl -fsS http://localhost:3200/api/health`.
3. **Penerusan.** `src/lib/porting.ts` (baru, bukan path terlindungi) membaca `PORTED_API` dari env:
   daftar `"<METHOD> <path-prefix>"`, mis. `GET /api/dokumen,POST /api/login`. `src/proxy.ts`
   menulis ulang permintaan yang cocok ke `PEMDI_API_URL` (`http://api:3200`), dan menambahkan
   header `x-pemdi-backend: rust` **hanya bila** `PEMDI_BACKEND_HEADER=1` (default mati, supaya
   bentuk respons tetap beku).
4. **Mode bayangan.** Untuk path yang **belum** ada di `PORTED_API`, `proxy.ts` tetap meneruskan ke
   route TS, lalu bila `SHADOW_API=1` memanggil Rust di latar (`event.waitUntil`) dengan permintaan
   yang sama, dan menulis satu baris JSONL ke `/app/data/shadow.log`:
   `{at, method, path, statusTs, statusRust, sama, beda: ["rows[0].nilai"]}`. Hanya metode baca
   (`GET`, dan `POST /api/ask` serta `POST /api/penilaian/ai`) yang dibayangi; `POST` yang menulis
   berkas **tidak** dibayangi.
   - Perbandingan: status harus sama; `content-type` harus sama; badan dibandingkan sebagai JSON
     setelah kunci diurutkan (urutan kunci bukan kontrak), angka dibandingkan sebagai nilai (D-2),
     `null` vs kunci hilang **dianggap beda** karena UI membedakannya.
   - `PEMDI_API_READONLY=1` membuat `pemdi-api` menolak setiap operasi tulis dengan `503`, sehingga
     dua proses tidak pernah menulis `data/*.json` bersamaan.
5. **Laporan.** `scripts/shadow-report.sh [hari]` membaca `shadow.log`, mencetak per path:
   jumlah permintaan, jumlah beda, dan 3 contoh beda. Reviewer memakai ini untuk keputusan `PORT-47`.
   Log diputar harian dan dipangkas pada 200 MB.

Daftar "what differs" yang berlaku: tidak ada logika baru; yang diuji adalah bentuk. `shadow.log`
tidak boleh memuat cookie atau badan permintaan; hanya path, status, dan daftar field yang berbeda.

## Kriteria penerimaan

- [ ] `scripts/portainer.sh build <tag>` menghasilkan dua image; `scripts/portainer.sh stack <tag>`
      memuat layanan `api` di `deploy/stack.yml` (dihasilkan, bukan disunting tangan).
- [ ] `docker ps` di host menampilkan `pemdi-ai-api-1` sehat; `curl` dari kontainer `app` ke
      `http://api:3200/api/health` → `{"status":"ok",…}`.
- [ ] `PORTED_API` kosong: semua `/api/*` tetap dilayani TS (tidak ada header backend), dan
      `shadow.log` bertambah untuk setiap GET.
- [ ] `PORTED_API="GET /api/dokumen"`: `curl -s -H 'x-pemdi-backend: 1' …/api/dokumen` menunjukkan
      `rust`; path lain tetap `ts` (header hanya bila `PEMDI_BACKEND_HEADER=1`).
- [ ] `scripts/shadow-report.sh 1` mencetak `0 selisih` untuk route yang sudah parity green, dan
      memuat contoh beda saat satu field sengaja diubah di Rust (uji negatif, dikembalikan).
- [ ] Rollback: hapus path dari `PORTED_API`, jalankan `scripts/portainer.sh stack <tag>` (image
      sama), lalu path itu dilayani TS lagi — transkrip di PR.
- [ ] `PEMDI_API_READONLY=1` menolak `POST /api/penilaian` dengan `503` (transkrip).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Cutover dan penghapusan kode TS (`PORT-47`), konvensi respons baru (`PORT-48`), dan healthcheck untuk
kontainer `app` (belum ada hari ini; bukan bagian porting).
