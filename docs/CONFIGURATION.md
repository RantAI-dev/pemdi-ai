# Konfigurasi

Semua konfigurasi lewat variabel lingkungan. Nilai rahasia hanya ada di berkas mode 600 yang tidak
masuk git: `.env`, `.env.local`, `infra/lakehouse.env`, dan `deploy/stack.yml` (dibangkitkan).
Jangan pernah mencetak nilainya di log, chat, atau PR.

## Aplikasi Next.js (`.env.local`)

| Variabel | Untuk apa | Dibaca di |
| --- | --- | --- |
| `LAKEHOUSE_URL` | Alamat RantAI Lakehouse API | `src/lib/lakehouse.ts` |
| `LAKEHOUSE_EMAIL`, `LAKEHOUSE_PASSWORD` | Akun layanan untuk sesi lakehouse | `src/lib/lakehouse.ts` |
| `LAKEHOUSE_TENANT_ID`, `LAKEHOUSE_TENANT_SLUG` | Tenant (Tubaba) | `src/lib/lakehouse.ts` |
| `LAKEHOUSE_QUERY_DB` | Database kueri (`icecat_api`) | `src/lib/lakehouse.ts`, `tables.ts` |
| `LLM_URL`, `LLM_MODEL`, `LLM_KEY` | Endpoint LLM OpenAI-compatible untuk ekstraksi, penilaian, narasi | `src/lib/llm.ts` |
| `LLM_SESSION` | Header `x-opencode-session` (wajib untuk OpenCode Go) | `src/lib/llm.ts` |
| `PEMDI_SESSION_SECRET` | Kunci tanda tangan cookie `pemdi_sesi` | `src/lib/auth.ts` |
| `SUMBER_DIR` | Folder berkas sumber (volume `pemdi-ai_sumber`, `/app/sumber`) | `src/lib/berkas.ts` |
| `EPEMDI_TUNNEL_TOKEN` | Token tunnel Cloudflare untuk `epemdi.ai.id`; hanya dibaca `scripts/portainer-stack.py` | stack |

## Deploy (`.env`)

| Variabel | Untuk apa |
| --- | --- |
| `PORTAINER_KEY` | Kunci API Portainer untuk `scripts/portainer.sh` |
| `PORTAINER_URL`, `PORTAINER_ENDPOINT` | Opsional; default host `192.168.18.148:9443`, endpoint 3 |
| `SUMBER_LEWATI` | Folder `sumber/` yang tidak diunggah (default `prosn`) |

## Lakehouse (`infra/lakehouse.env`)

Diteruskan ke compose RantAI Lakehouse oleh `scripts/portainer-stack.py`. Untuk copilot NL2SQL,
`LLM_URL` di sini menunjuk ke `http://llm-proxy:8080/zen/go/v1` (caddy yang menambahkan header
sesi OpenCode). Repo lakehouse sendiri tidak diubah.

## Service Rust (`pemdi-api`)

| Variabel | Default | Untuk apa |
| --- | --- | --- |
| `PEMDI_API_ADDR` | `0.0.0.0:3200` | Alamat dengar |
| `LAKEHOUSE_URL` | — | Sama dengan aplikasi; kosong berarti `/api/health` melapor `degraded` |
| `RUST_LOG` | — | Filter log (`tracing-subscriber`), mis. `info` |

Hanya `rust/crates/pemdi-api/src/config.rs` yang membaca variabel lingkungan. Variabel baru
ditambahkan di sana, di tabel ini, dan di `.env.example` (nama saja).
