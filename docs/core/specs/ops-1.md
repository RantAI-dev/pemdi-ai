# `OPS-1` Pembaruan token lakehouse otomatis

| | |
| --- | --- |
| Backlog | `OPS-1` di [BACKLOG.md](../BACKLOG.md) |
| Module | Operasi |
| Size | S (hari) |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Token JWT `oidc-mock` dibuat sekali per principal dan tidak pernah diperbarui. Masa berlakunya 30
hari, lalu kueri ke `icecat_api.*` gagal `Authentication failed`. Insiden 2026-11-12 dan baris
"AI Tubaba: datanya tidak terbaca … Authentication failed" di [OPERATIONS.md](../../OPERATIONS.md)
adalah gejala yang sama. Token yang berjalan sekarang habis sekitar **2026-12-13**.

Perbaikannya sudah ada dan manual: `scripts/portainer.sh token` (`scripts/portainer.sh:115-134`).
Skrip itu memindahkan `/tokens/*.jwt` ke `/tokens/lama-<waktu>`, me-restart `pemdi-ai-oidc-mock-1`,
menunggu minimal 9 berkas `.jwt` baru, lalu me-restart `lakekeeper`, `clickhouse`, `lakehouse-api`,
`dagster-code-location`, `dagster-daemon`, dan `dagster-webserver`. Baris terakhirnya mencetak
`token baru berlaku sampai <tanggal>`. Tidak ada penjadwal: `grep -rn token scripts/` hanya
menemukan kasus manual itu.

Preseden penjadwalan di mesin yang sama sudah ada: `scripts/jaga-lakehouse.sh` dijalankan timer
systemd `pemdi-lakehouse-jaga` (komentar baris 2 skrip itu). Pola yang sama dipakai di sini.

## Yang didapat pengguna

AI Tubaba dan semua halaman yang membaca lakehouse berhenti mati setiap 30 hari. Tidak ada lagi
insiden "Authentication failed" yang menunggu seseorang ingat tanggalnya.

## Rancangan

Tiga berkas baru, semuanya di repo ini; `~/rantai/RantAI-Lakehouse` tidak disentuh karena
pembaruan berjalan lewat Docker API Portainer, bukan lewat kode lakehouse.

1. `scripts/token-jaga.sh` — pembungkus `scripts/portainer.sh token`:
   - `flock` pada `/tmp/pemdi-token.lock`, supaya dua jalan tidak bertumpuk.
   - Baca `data/token-berlaku.tsv` (kolom: `waktu_utc`, `berlaku_sampai`, `hasil`). Jalankan
     pembaruan hanya bila baris terakhir lebih tua dari **18 hari**; jadi siklus nyata ≤ 21 hari
     walau satu jadwal terlewat. `--now` memaksa jalan.
   - Tangkap baris `token baru berlaku sampai …`, tulis ke TSV, dan cetak satu baris
     `token-jaga: diperbarui, berlaku sampai <tanggal>` atau
     `token-jaga: GAGAL, <kode keluar>`.
   - Keluar bukan nol saat gagal, agar `systemctl --user status` dan jurnal menandainya.
2. `deploy/systemd/pemdi-token.service` dan `pemdi-token.timer`:
   `OnCalendar=*-*-* 03:17` (harian, karena skrip sendiri yang menghitung 18 hari),
   `Persistent=true`, `WorkingDirectory=<repo>`, `ExecStart=<repo>/scripts/token-jaga.sh`.
   Dipasang dengan `systemctl --user enable --now pemdi-token.timer` di mesin yang memegang `.env`
   berisi `PORTAINER_KEY` — mesin yang sama dengan `scripts/deploy.sh`, bukan host Portainer.
3. `docs/OPERATIONS.md`: baris "Pemeliharaan berkala" berubah dari perintah manual menjadi
   "otomatis, `pemdi-token.timer`; periksa `data/token-berlaku.tsv`", dan tanggal "berikutnya
   sebelum …" diperbarui setiap kali job berhasil. Baris insiden tetap, ditambah rujukan ke timer.

Tidak ada dependensi baru: `flock`, `date`, `systemctl` sudah ada di mesin. Rahasia tidak pernah
ditulis: skrip hanya mencetak tanggal dan kode keluar, tidak isi token.

Kalau mesin pemegang `.env` tidak boleh memasang timer user, alternatifnya cron pengguna
(`crontab -e`: `17 3 * * * <repo>/scripts/token-jaga.sh`) dengan skrip yang sama. Jangan pakai
GitHub Actions: itu berarti menaruh `PORTAINER_KEY` sebagai secret CI, keputusan owner.

## Kriteria penerimaan

- [ ] `scripts/token-jaga.sh --now` mencetak `token-jaga: diperbarui, berlaku sampai <tanggal>` dan
      menambah satu baris di `data/token-berlaku.tsv`; jalankan dua kali, yang kedua mencetak
      `dilewati: <n> hari` tanpa me-restart kontainer.
- [ ] Jalan kedua dalam 18 hari yang sama tidak me-restart apa pun (cek `docker ps` waktu start
      kontainer `pemdi-ai-clickhouse-1` tidak berubah).
- [ ] `systemctl --user list-timers pemdi-token.timer` menampilkan jadwal berikutnya dalam 24 jam,
      dan `systemctl --user start pemdi-token.service` berakhir `status=0/SUCCESS`.
- [ ] Kueri lewat aplikasi setelah pembaruan menjawab, bukan "Authentication failed": buka
      `https://epemdi.ai.id/tanya`, tanya "berapa jumlah aplikasi", jawaban memuat tabel.
- [ ] `docs/OPERATIONS.md` menyebut timer dan tanggal habis yang baru.
- [ ] `scripts/check.sh` PASS (perubahan skrip + docs; bagian `py` dan `repo` ikut jalan).

## Yang tidak dikerjakan

Rotasi kunci penanda tangan `oidc-mock` (butuh perubahan di repo lakehouse, di luar izin repo ini)
dan penggantian `oidc-mock` dengan IdP sungguhan (`SEC-2`). Backup tetap `OPS-2`.
