# Dokumen inti produk

Pandangan owner produk atas Pemdi-AI. Sengaja dibuat kecil supaya selalu mutakhir.

| Berkas | Isinya | Kapan disentuh |
| --- | --- | --- |
| [PRODUCT.md](PRODUCT.md) | Satu dokumen produk: apa ini, untuk siapa, apa yang sudah ada, apa yang kurang, apa yang menghalangi produksi, apa berikutnya | Saat fitur diterima; sebelum rilis |
| [BACKLOG.md](BACKLOG.md) | Daftar induk pekerjaan (ID, jenis, item, modul, prioritas, status, PR). Satu-satunya papan; tidak ada salinan Lark | Setiap merge |
| [features/](features/) | Satu halaman per fitur: apa yang bisa dilakukan pengguna, keputusan, batasan, checklist penerimaan | Saat fitur mulai dan selesai dibangun |
| [specs/](specs/) | Satu spec per item backlog yang butuh rancangan: alasan, yang didapat pengguna, kriteria penerimaan, yang tidak dikerjakan | Saat item ditambahkan atau targetnya berubah |
| [ROADMAP.md](ROADMAP.md) | Urutan pelaksanaan: milestone M0–M4 dan jalur frontend, dengan dependensinya | Saat urutan atau milestone berubah |
| [HANDOFF.md](HANDOFF.md) | Keadaan sekarang untuk planner atau reviewer yang mengambil alih | Saat peran planner berpindah |

Dokumen engineering ada satu tingkat di atas: [`../ARSITEKTUR.md`](../ARSITEKTUR.md),
[`../DEVELOPMENT.md`](../DEVELOPMENT.md), [`../OPERATIONS.md`](../OPERATIONS.md),
[`../CONFIGURATION.md`](../CONFIGURATION.md), [`../adr/`](../adr/), dan rencana porting di
[`../port/`](../port/).

## Cara sebuah fitur berjalan

1. Masuk `BACKLOG.md` dengan Kind **Feature**, Module, Priority, dan Status **Planned**.
2. Dapat halaman di `features/` (salin `_TEMPLATE.md`). Agent boleh membuat draf; owner menjawab
   keputusan di halaman itu.
3. Agent merencanakan, membangun, mereview, dan me-merge (`AGENTS.md`). Saat merge statusnya menjadi
   **In Acceptance**, dengan PR dicatat.
4. Owner menjalankan checklist penerimaan di halaman fitur, di `epemdi.ai.id`.
5. `PRODUCT.md` dan `BACKLOG.md` diperbarui menjadi **Released**.

Merge bukan berarti diterima. Fitur dianggap selesai di langkah 4.

## Membaca backlog

Agent membaca satu baris dari `main`, tidak pernah seluruh berkas:

```bash
scripts/backlog.sh get PORT-11     # satu baris
scripts/backlog.sh ready 10        # 10 item Todo
```
