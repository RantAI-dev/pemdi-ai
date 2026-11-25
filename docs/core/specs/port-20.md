# `PORT-20` Adapter lakehouse

| | |
| --- | --- |
| Backlog | `PORT-20` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | `PORT-3` — adapter dibuktikan dengan rekaman permintaan/respons |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

`src/lib/lakehouse.ts` (225 baris) adalah satu-satunya jalan ke RantAI Lakehouse, dan hampir semua
halaman bergantung padanya. Perilaku yang harus ikut pindah, dengan bukti:

- Konfigurasi: `BASE` dari `LAKEHOUSE_URL` dengan `/` di ujung dibuang (`:11`), `QUERY_DB` dari
  `LAKEHOUSE_QUERY_DB` default `icecat_api` (`:14`), kredensial `LAKEHOUSE_EMAIL`/`_PASSWORD`
  (`:38-39`), tenant `x-tenant` hanya bila `LAKEHOUSE_TENANT_ID` ada (`:89`).
- Sesi: disimpan 12 jam (`:35`), login sekali untuk permintaan bersamaan lewat `signingIn`
  (`:65-71`), cookie diambil dari `Set-Cookie` yang diawali `lh_session=` (`:56-60`), dan pada 401
  sesi dibuang lalu permintaan diulang **sekali** (`:96-99`).
- Nama tabel: `tableRef` hanya menerima `^[a-z][a-z0-9_]*$` dan membungkusnya menjadi
  `` `${QUERY_DB}.\`bronze.${table}\`` `` (`:17-20`).
- SQL: `query` → `POST /api/query/run` (`:125-127`); `tryQuery` menelan galat menjadi `[]` (`:130`).
- Unggahan: `listUploads`, `getUpload`, `deleteUpload` (204 → `undefined`, `:106`), `createUpload`
  multipart, `previewUpload` dengan `?sheet=`, `ingestUpload`, dan `loadTable` yang memantau tiap
  3 detik sampai 300 detik (`:199-211`).
- Copilot: `POST /api/ai/chat` dengan `tools` tetap `run_sql`, `list_datasets`,
  `describe_dataset`, `lakehouse_overview` (`:220`).

Semua teks galat saat ini tampil ke pengguna lewat `src/lib/api.ts:5-9`
(`{"error": "<pesan>"}`), jadi pesannya juga harus sama sampai `PORT-48`.

## Yang didapat pengguna

Tidak ada yang berubah di layar. Semua kueri, unggahan, dan jawaban AI Tubaba memakai lakehouse yang
sama, dengan sesi, ulang-coba 401, dan rantai galat yang sama.

## Rancangan

- `rust/crates/pemdi-ports/src/lakehouse.rs`: perluas trait `Lakehouse` (sekarang hanya `ping`).
  Semua metode mengembalikan `Result<_, PortError>` dan memakai tipe kabel dari `pemdi-contracts`:
  `ping`, `query(sql)`, `list_uploads`, `get_upload(id)`, `delete_upload(id)`,
  `create_upload(nama, bytes, mime)`, `preview_upload(id, sheet)`,
  `ingest_upload(id, opsi)`, `chat(messages, context)`, `chat_stream(...) -> impl Stream`.
  `load_table` **tidak** di trait: ia alur (unggah → preview → ingest → pantau) dan pindah ke
  `pemdi-app`, memakai primitif di atas.
- `PortError` (`rust/crates/pemdi-ports/src/lib.rs`) ditambah `Status(u16)` dan `NoSession`; **tidak**
  membawa teks upstream (teks masuk log di `pemdi-api`, di bawah `requestId`).
- `rust/crates/pemdi-adapters/src/lakehouse.rs`: klien HTTP. **Dependensi baru: `reqwest`
  (`json`, `cookies`, `multipart`, `stream`, `rustls-tls`) — butuh persetujuan owner.** Tanpa
  persetujuan, task berhenti.
  - Cookie jar di memori proses, bukan per permintaan; satu `tokio::sync::Mutex` untuk sesi +
    `OnceCell` untuk login tunggal.
  - `cache-control: no-store` disalin; `reqwest` tidak menambahkan header yang tidak diminta.
  - `x-tenant` hanya saat env diisi; `Authorization` tidak pernah dikirim.
- `pemdi-api/src/config.rs` (satu-satunya tempat env dibaca, ADR 0002): `LakehouseConfig` dari
  `LAKEHOUSE_URL`, `LAKEHOUSE_EMAIL`, `LAKEHOUSE_PASSWORD`, `LAKEHOUSE_TENANT_ID`,
  `LAKEHOUSE_QUERY_DB`.
- Rute (`PORT-41`–`PORT-44`) menyusun kalimat galat yang sama dari `PortError`, mis.
  `Lakehouse tidak dapat dihubungi di <base>.` (503), `Login ke lakehouse gagal (<status>).`,
  `Lakehouse tidak mengembalikan sesi.` (502). Kalimat ini milik lapisan route, bukan adapter.
- Oracle: rekaman `tests/rekaman/lakehouse/*.json` (`PORT-3`), minimal 12 berkas, diputar ulang
  dengan server axum lokal. Yang dibandingkan: hasil, lalu permintaan yang dikirim (method, path,
  header non-rahasia, badan JSON).
- Daftar "what differs" yang berlaku, spesifik:
  - **Cookie:** hanya pasangan `lh_session=<nilai>` yang dipakai; atribut `Path`/`HttpOnly` tidak.
  - **FormData:** `createUpload` mengirim `filename` dan `content-type` per bagian; `reqwest`
    multipart harus menulis nama yang sama, termasuk karakter non-ASCII.
  - **Panjang teks:** `errorOf` memotong badan non-JSON pada 300 satuan UTF-16 (`:81`); Rust
    memotong 300 `char` dan selisih non-BMP dicatat bila muncul.
  - **Angka JSON:** `QueryResult.rows` adalah JSON bebas; simpan sebagai `serde_json::Value`, jangan
    diubah menjadi f64 (D-2).
  - **`undefined`:** `deleteUpload` 204 → tidak ada badan; `Option<()>`.
  - Tidak ada tanggal atau regex baru.

## Kriteria penerimaan

- [ ] `cargo test -p pemdi-adapters --test rekaman_lakehouse` lulus offline (≥ 12 berkas).
- [ ] Test khusus: 401 → login ulang → permintaan kedua berhasil; dua permintaan bersamaan hanya
      memicu satu login (hitung permintaan `/api/auth/login` di rekaman = 1).
- [ ] Test khusus: `tableRef("Pemdi")` dan `tableRef("a-b")` ditolak tanpa memanggil jaringan.
- [ ] Transkrip di PR: `curl -s localhost:3200/api/health` → `{"status":"ok","version":"…"}` terhadap
      lakehouse sungguhan, sesudah `scripts/portainer.sh token`.
- [ ] Tidak ada `reqwest` yang menghubungi host selain `LAKEHOUSE_URL` di test (server rekaman
      mencatat Host).
- [ ] Baris ledger `PORT-20` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

`load_table` sebagai alur (`PORT-35`), pemakaian di route (`PORT-41`–`PORT-44`), dan penanganan
konvensi galat baru (`PORT-48`). Menyembunyikan detail upstream dari pesan pengguna **bukan**
bagian task ini, karena bentuk respons dibekukan (ADR 0001).
