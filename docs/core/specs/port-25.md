# `PORT-25` Adapter pengguna dan sesi

| | |
| --- | --- |
| Backlog | `PORT-25` di [BACKLOG.md](../BACKLOG.md) |
| Module | Port |
| Size | M (1–2 minggu) |
| Blocked by | tidak ada |
| Priority and status | Di [BACKLOG.md](../BACKLOG.md), satu-satunya tempat keduanya dicatat |

## Kenapa

Sesi menentukan siapa yang boleh melihat apa, dan formatnya harus tetap sama supaya cookie yang
sudah dipegang pengguna tidak terlempar saat cutover:

- `src/lib/auth.ts` (45 baris): cookie `pemdi_sesi` (`:7`) dan `pemdi_user` (`:9`), umur
  `7 * 24 * 60 * 60` detik (`:10`), nilai `${nama}|${exp}|${hmac("sesi:"+nama+":"+exp)}` (`:34-37`),
  HMAC-SHA256 hex huruf kecil (`:13-19`), perbandingan waktu-konstan dengan cek panjang lebih dulu
  (`:22-27`), sesi hanya hidup bila `PEMDI_SESSION_SECRET` ≥ 32 karakter (`:30-32`), dan
  `sesiUser` menolak `exp` yang lewat (`:40-45`).
- `src/lib/users.ts` (77 baris): `data/users.json`, kata sandi `scrypt` garam 16 byte, kunci 64 byte
  (`:11`, `:46-52`), nama sah `^[a-z0-9][a-z0-9._-]{2,31}$` (`:19-21`), cache berdasarkan `mtime`
  (`:23-33`), berkas ditulis `mode 0o600` (`:37`), umpan acak agar nama salah memakan waktu sama
  (`:43`), daftar diurutkan `localeCompare` (`:68`).
- `src/app/api/login/route.ts`: batas 5 percobaan per 15 menit per IP dan per nama (baris 6-31),
  `cf-connecting-ip` didahulukan (baris 34), 503 tanpa secret, 429 saat terkunci, 401 dengan satu
  pesan untuk nama maupun sandi salah, lalu dua cookie.
- `src/app/api/logout/route.ts`: `{ok:true}` dan kedua cookie dikosongkan (`maxAge: 0`).

## Yang didapat pengguna

Tidak ada yang berubah di layar. Pengguna yang sudah masuk tetap masuk setelah cutover, dan yang
belum masuk tetap melihat halaman login.

## Rancangan

- `rust/crates/pemdi-ports/src/users.rs`: `trait Users { fn nama_sah(&self, nama: &str) -> bool;
  async fn read_users(&self) -> Result<Vec<User>, PortError>; async fn cek_login(&self, nama: &str,
  sandi: &str) -> Result<Option<User>, PortError>; async fn set_user(...); async fn hapus_user(...) }`.
  `User { nama, nama_lengkap, salt, hash, dibuat }`.
- `pemdi-adapters/src/users.rs`: `data/users.json`, cache `(mtime, Vec<User>)`, tulis `.tmp` +
  `rename` dengan `OpenOptionsExt::mode(0o600)`.
  - **Dependensi baru: crate `scrypt` (dan `hmac` + `sha2` untuk sesi) — butuh persetujuan owner.**
    Parameter wajib sama dengan Node: N=16384, r=8, p=1, panjang kunci 64, garam 16 byte, hash hex.
    Bukti: fixture pasangan `(sandi, salt, hash)` yang dibuat oleh `scripts/oracle/run.ts` (modul
    `users`, sandi uji `"uji-contoh-123"`, **bukan** sandi produksi), harus lolos `cek_login` di
    Rust dan sebaliknya hash Rust harus lolos di TS.
  - `localeCompare` untuk urutan `set_user`: ukur pada nama nyata; bila berbeda dari urutan byte,
    catat di differences.md (tidak ada pengguna yang terpengaruh selain urutan berkas).
  - `timingSafeEqual` → `subtle`-style banding: panjang dulu, lalu XOR akumulatif; jangan memakai
    `==` pada `&[u8]`.
- `pemdi-api/src/auth.rs`: `buat_sesi(nama)`, `sesi_user(cookie)`, `auth_siap()`. Cookie ditulis
  sebagai `pemdi_sesi=<nilai>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` (+ `Secure` bila
  `x-forwarded-proto: https`), dan `pemdi_user=<nama lengkap>` tanpa `HttpOnly`.
- Batas percobaan login: `Mutex<HashMap<String, (u32, Instant)>>`, kunci `ip:<alamat>` dan
  `u:<nama>`, jendela 15 menit, batas 5, entri dihapus saat login berhasil dan saat jendela lewat.
- Cakupan: `PORT-40` memakai modul ini untuk `/api/login`, `/api/logout`, dan pemeriksaan `/api/*`.
  Halaman Next tetap dijaga `src/proxy.ts` sampai `FE-5`; itu bukan bagian task ini.

Daftar "what differs" yang berlaku, spesifik:
- **Tanggal:** `exp` adalah detik epoch sebagai string (`String(Math.floor(Date.now()/1000)+MAX_AGE)`),
  bukan ISO; `dibuat`/`diperbarui` ISO dengan milis.
- **Angka:** `Number(exp) < Date.now()/1000` → bandingkan `i64` detik, bukan f64.
- **Teks:** `.trim().toLowerCase()` pada nama (`login/route.ts:33`), dan `slice(0, 64)`.
- **Regex:** `nama_sah`.
- **`undefined`:** tidak ada.

## Kriteria penerimaan

- [ ] Fixture scrypt: hash Node diverifikasi Rust, hash Rust diverifikasi Node (satu berkas di
      `tests/rekaman/users/`, tanpa sandi nyata).
- [ ] Cookie yang dibuat untuk `(secret uji, nama, exp)` **sama byte** dengan keluaran oracle
      `auth`; cookie yang dibuat TS diterima `sesi_user` Rust dan sebaliknya.
- [ ] Test: cookie kedaluwarsa, tanda tangan salah, nama tidak ada di `users.json`, dan
      `PEMDI_SESSION_SECRET` < 32 karakter semuanya menghasilkan `None`.
- [ ] Test: `data/users.json` ditulis dengan mode `0600` dan urutan nama yang sama dengan TS.
- [ ] `nama_sah` diuji 20 kasus (2/3/32/33 karakter, huruf besar, spasi, `@`).
- [ ] Baris ledger `PORT-25` **parity green**; perbedaan di
      [differences.md](../../port/differences.md).
- [ ] `scripts/check.sh` PASS.

## Yang tidak dikerjakan

Route login/logout dan middleware (`PORT-40`), pengelolaan akun lewat CLI (`scripts/user.ts` tetap
TypeScript), dan OIDC/SSO (`SEC-2`).
