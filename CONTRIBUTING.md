# Cara mengerjakan task

Untuk pelaksana (orang atau agent). Rencana, spec, dan scaffold disiapkan planner; kamu
mengambil satu task, mengerjakannya, dan membuka satu PR. Aturan lengkap ada di
[`AGENTS.md`](AGENTS.md); bagian ini urutannya saja.

## Sekali di awal

```bash
git clone https://github.com/RantAI-dev/pemdi-ai && cd pemdi-ai
scripts/setup-worktree.sh        # dependensi + hook git
scripts/check.sh                 # harus berakhir "check: PASS"
```

Baca, berurutan: [`docs/core/PRODUCT.md`](docs/core/PRODUCT.md),
[`docs/core/ROADMAP.md`](docs/core/ROADMAP.md), [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).
Untuk task porting, juga [`docs/port/README.md`](docs/port/README.md) dan contoh `PORT-1`.

## Satu task

1. **Pilih.** Ambil task berikutnya di [ROADMAP](docs/core/ROADMAP.md) yang statusnya **Todo** dan
   tidak punya "Blocked by" yang masih terbuka: `scripts/backlog.sh get <ID>`.
2. **Baca spec-nya** di `docs/core/specs/<id>.md` (huruf kecil, mis. `port-11.md`). Task porting
   juga punya baris di [`docs/port/ledger.md`](docs/port/ledger.md); isi
   [`docs/port/port-brief.md`](docs/port/port-brief.md) untuk dirimu sendiri atau untuk agent.
   Tidak ada spec? Kerjakan dari teks baris backlog, dan tulis spec singkat di PR yang sama.
3. **Branch:** `<type>/<id>-<ringkas>`, mis. `feat/port-11-indeks-pemdi`, `fix/fe-2-a11y`.
4. **Tandai mulai** (opsional, bila orang lain perlu tahu): PR kecil yang hanya mengubah status
   baris itu menjadi **In Progress**.
5. **Kerjakan** hanya path yang disebut spec. Hal lain yang kamu temukan → catat di PR, jangan
   diperbaiki sekalian.
6. **Bukti** sesuai jenis perubahan: logika → test yang gagal sebelum dan lulus sesudah; porting →
   test paritas + kasus yang belum dilihat; tampilan → tangkapan layar sebelum/sesudah.
7. **`scripts/check.sh`** setelah edit terakhir, sampai `check: PASS`. Jangan melemahkan gate:
   tidak menghapus test, tidak menaikkan ratchet, tidak menyunting path di
   `.agents/protected-paths`.
8. **PR** dengan subjek `type(scope): ringkasan`. Di PR yang sama, ubah baris task di
   `docs/core/BACKLOG.md` (status **Done** untuk Task, **In Acceptance** untuk Feature) dan,
   untuk porting, baris ledger-nya. Isi badan PR dengan format handoff di bawah.

```text
STATUS: done | partial | blocked
CHECK: scripts/check.sh -> pass (salin baris terakhirnya)
FILES: path yang diubah
DEVIATIONS: perbedaan perilaku yang disengaja (juga di docs/port/differences.md), atau "none"
NOT VERIFIED: yang tidak kamu jalankan, atau "none"
NOTES FOR REVIEWER: bug lama yang ikut diporting, risiko, atau "none"
```

## Kapan berhenti dan bertanya

- Spec dan kode tidak cocok: jangan pilih sendiri. Tulis di PR (DEVIATIONS) atau tanya owner.
- Task butuh keputusan `DEC-*` yang masih Open.
- Test atau file terlindungi tampak salah: laporkan, jangan diubah.
- Butuh dependensi baru (crate atau paket npm): minta persetujuan owner di PR.
