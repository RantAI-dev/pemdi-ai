# Operasi

## Di mana jalannya

- Satu stack Portainer `pemdi-ai` (stack 27, endpoint 3) di host `192.168.18.148`: aplikasi
  Next.js (`app`, port 3100), RantAI Lakehouse (API, ClickHouse, Postgres, Lakekeeper, OpenFGA,
  Dagster, RustFS, oidc-mock), `llm-proxy` (caddy), dan dua konektor Cloudflare Tunnel.
- Domain: `epemdi.ai.id` (tunnel `tunnel-epemdi`, dikelola dari dasbor Cloudflare akun pemilik
  domain, public hostname → `http://app:3100`) dan `pemdi.rantai.dev` (tunnel `tunnel`,
  konfigurasi di volume `pemdi-ai_cloudflared`).
- Jangan menyentuh stack lain di host yang sama.

## Rilis

```bash
T=$(date -u +%Y%m%d%H%M)
scripts/portainer.sh build $T     # image dibangun DI HOST, bukan di mesin pengembang
scripts/portainer.sh stack $T     # bangkitkan deploy/stack.yml dan perbarui stack
```

`deploy/stack.yml` dibangkitkan oleh `scripts/portainer-stack.py` dari `.env.local` dan
`infra/lakehouse.env`. Ubah sumbernya, jangan YAML-nya.

Berkas sumber (PDF Makro, SPM, dokumen): `scripts/portainer.sh sumber` mengunggah ke volume
`pemdi-ai_sumber` (melewati `SUMBER_LEWATI`, default `prosn`).

**Peringatan:** `scripts/portainer.sh volumes` dan fungsi `upload_volume` **menimpa** volume
tujuan. Jangan pernah diarahkan ke `pemdi-ai_app_data` (registry dokumen dan penilaian produksi).

## Pemeliharaan berkala

| Kapan | Apa | Perintah |
| --- | --- | --- |
| Tiap ≤ 21 hari (berikutnya sebelum **2026-12-13**) | Perbarui token JWT lakehouse; tanpa ini kueri ke `icecat_api.*` gagal "Authentication failed" | `scripts/portainer.sh token`, lalu tunggu ClickHouse sehat (1–2 menit) |

Item `OPS-1` di backlog untuk mengotomatiskannya.

## Insiden yang sudah pernah terjadi

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| AI Tubaba: "datanya tidak terbaca … Authentication failed" | Token oidc-mock kedaluwarsa (30 hari) | `scripts/portainer.sh token` |
| Jawaban AI terputus sekitar 100 detik | Cloudflare memutus respons yang diam 100 detik | `/api/ask` mengirim ping tiap 15 detik; jangan dihapus |
| LLM menolak: `MissingSessionID` | OpenCode Go butuh header sesi | `LLM_SESSION` di app; `llm-proxy` untuk lakehouse |
| 429 dari LLM | Beberapa pertanyaan dikirim bersamaan | Kirim satu per satu; batas penyedia |
| `epemdi.ai.id` tidak resolve | Public hostname belum diisi di tunnel | Isi public hostname di dasbor Cloudflare akun pemilik domain |

## Cadangan

Belum otomatis (`OPS-2`). Yang perlu dicadangkan: Postgres (identitas dan governance), ClickHouse
(Bronze), RustFS (objek dan Iceberg), volume `pemdi-ai_app_data`.
