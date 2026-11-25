# `PORT-40` Route login, logout, dan pemeriksaan sesi

| | |
| --- | --- |
| Backlog | `PORT-40` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | S (hari) |
| Blocked by | `PORT-25` — adapter pengguna dan format cookie |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Tiga berkas menjaga pintu masuk, dan semuanya berisi perilaku yang terlihat pengguna:

- `src/app/api/login/route.ts` (47 baris): 503 bila `PEMDI_SESSION_SECRET` belum diatur; batas 5
  percobaan per 15 menit per IP (`cf-connecting-ip` didahulukan, lalu hop pertama
  `x-forwarded-for`, lalu `"lokal"`) dan per nama; 429 dengan pesan "Terlalu banyak percobaan…";
  401 dengan satu pesan untuk nama maupun sandi salah; sukses → `{ok:true, nama}` dan dua cookie.
  Opsi cookie: `sameSite: "lax"`, `secure` bila `x-forwarded-proto === "https"`, `maxAge` 604800,
  `path: "/"`, `httpOnly` untuk `pemdi_sesi`, tidak untuk `pemdi_user`.
- `src/app/api/logout/route.ts` (9 baris): `{ok:true}`, kedua cookie dikosongkan `maxAge: 0`.
- `src/proxy.ts` (28 baris): semua halaman dan `/api/*` butuh sesi; `/api/*` tanpa sesi → 401 JSON
  (`Sesi habis…` atau `Login belum diatur…`, `:17`); halaman → redirect `/login?ke=<path+query>`;
  sesi berhenti berlaku begitu akunnya dihapus (`readUsers()` dicocokkan setiap permintaan, `:14`).

Cookie yang sudah dipegang pengguna harus tetap diterima, karena cutover tidak boleh memaksa semua
orang login ulang di tengah hari.

## Yang didapat pengguna

Tidak ada yang berubah. Yang sudah masuk tetap masuk; yang salah sandi mendapat pesan yang sama;
yang mencoba enam kali tetap terkunci 15 menit.

## Rancangan

- `pemdi-api/src/routes/sesi.rs` mendaftarkan `POST /api/login` dan `POST /api/logout`
  (`routes::sesi::routes()`, ADR 0002), memakai `Users` (`PORT-25`) dan `auth.rs`.
- Middleware `pemdi-api/src/auth.rs::wajib_sesi`: berlaku untuk semua route kecuali
  `POST /api/login` dan `GET /api/health` (health hanya dijangkau di jaringan stack, dipakai
  healthcheck kontainer `PORT-46`). Halaman Next tetap dijaga `src/proxy.ts` sampai `FE-5`; itu
  bukan cakupan task ini dan tidak boleh diubah di sini.
- Bentuk respons dibekukan (ADR 0001): `{ok:true,nama}`, `{ok:true}`, dan galat `{error:"<pesan>"}`
  dengan status yang sama. Pesan yang disalin: "Login belum diatur di server
  (PEMDI_SESSION_SECRET).", "Terlalu banyak percobaan. Coba lagi dalam 15 menit.", "Nama pengguna
  atau kata sandi salah.", "Sesi habis. Silakan masuk lagi.", "Login belum diatur di server."
- Pembatas percobaan: `Mutex<HashMap<String,(u32,Instant)>>` di state, dua kunci (`ip:<alamat>`,
  `u:<nama>`), jendela 15 menit, batas 5; entri dihapus saat login berhasil; nama dinormalkan
  `trim().to_lowercase()` lalu dipotong 64 seperti `login/route.ts:33`.
- Logout mengosongkan cookie dengan atribut yang sama seperti TS (tanpa `httpOnly` untuk
  `pemdi_user`).
- Uji: tanpa jaringan, dengan `Users` palsu dan `PEMDI_SESSION_SECRET` tetap di config uji.

Daftar "what differs" yang berlaku, spesifik:
- **Tanggal:** `exp` detik epoch sebagai string; `Date.now()/1000` dibandingkan sebagai integer.
- **Teks:** `trim().toLowerCase()` dan `slice(0, 64)`; pesan galat harus sama huruf per huruf.
- **Angka:** `maxAge` 604800; tidak ada pembulatan.
- **`undefined`:** `body.nama`/`body.sandi` yang tidak ada menjadi `""` (`String(body.nama ?? "")`).
- Regex/tanggal ISO: tidak ada.

## Kriteria penerimaan

- [ ] Transkrip `curl -i -X POST localhost:3200/api/login -d '{"nama":"uji","sandi":"salah"}'` →
      `401` dan badan `{"error":"Nama pengguna atau kata sandi salah."}`.
- [ ] Transkrip sukses: `200`, `set-cookie` berisi `pemdi_sesi=…; HttpOnly; SameSite=Lax; Path=/;
      Max-Age=604800`, badan `{"ok":true,"nama":"uji"}`.
- [ ] Enam percobaan gagal berturut-turut → percobaan ke-6 `429`; setelah jendela lewat (uji dengan
      jam palsu) boleh lagi.
- [ ] `PEMDI_SESSION_SECRET` kosong/pendek → `503` dengan pesan TS.
- [ ] Tanpa cookie, `GET /api/dokumen` → `401 {"error":"Sesi habis. Silakan masuk lagi."}`; cookie
      milik akun yang dihapus juga `401`.
- [ ] Cookie buatan TS (fixture `PORT-25`) diterima; cookie buatan Rust diterima `sesiUser` TS.
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Halaman login dan redirect halaman (`src/proxy.ts` tetap; `FE-5`), OIDC/SSO (`SEC-2`), dan konvensi
galat baru (`PORT-48`).
