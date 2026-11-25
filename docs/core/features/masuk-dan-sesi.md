# Masuk dan sesi

Halaman masuk (`/login`) dan penjagaan sesi untuk seluruh halaman dan API.

| | |
| --- | --- |
| Modul | Keamanan |
| Backlog | `FT-12` di [BACKLOG.md](../BACKLOG.md) |
| Jenis | Feature |
| Spec | Tidak ada spec; halaman ini yang menjadi acuan |
| Status | In Acceptance |
| Prioritas | P1 |
| Pemilik | Pemilik modul. Tidak dinamai di repo. |
| Penerima | Yang menjalankan checklist. Bukan pembuat fitur. Tidak dinamai di repo. |
| Rencana | Tidak ada |
| Mulai | Belum diverifikasi |
| Terkirim | Belum diverifikasi |
| Bukti | Berjalan di `epemdi.ai.id`; belum ada catatan PR |

## Masalah

Dasbor memuat data evaluasi dan dokumen OPD yang tidak boleh terbuka untuk umum. Aplikasi perlu
gerbang masuk yang sederhana, tanpa pendaftaran mandiri, dan yang langsung menutup akses ketika
akun dicabut.

## Yang bisa dilakukan pengguna

1. Masuk dengan nama pengguna dan kata sandi.
2. Melihat pesan galat yang sama untuk nama pengguna salah dan kata sandi salah.
3. Kembali ke halaman yang dituju setelah masuk (`?ke=`), bila tautannya masih di situs ini.
4. Melihat namanya di kepala halaman setelah masuk.
5. Keluar dari menu, lalu diarahkan ke halaman masuk.
6. Tetap masuk selama 7 hari pada browser yang sama.

## Tidak termasuk

- Pendaftaran sendiri, undangan lewat surel, atau lupa kata sandi.
- SSO, MFA, atau login dengan akun pemerintah.
- Peran dan pembatasan per OPD. Semua pengguna yang masuk punya akses yang sama.
- Log audit masuk/keluar.
- Manajemen akun dari layar. Akun dikelola lewat `scripts/user.ts` (operator).

## Bertanya ke AI Tubaba

Tidak relevan. AI Tubaba berada di balik gerbang yang sama dan tidak dapat dipakai tanpa sesi.

## Kode dan data

| Hal | Di mana |
| --- | --- |
| Halaman | `src/app/login/page.tsx` |
| API | `src/app/api/login/route.ts`, `src/app/api/logout/route.ts` |
| Sesi | `src/lib/auth.ts` (cookie `pemdi_sesi` dan `pemdi_user`) |
| Akun | `src/lib/users.ts` (`data/users.json`, scrypt) |
| Penjaga rute | `src/proxy.ts` |
| Alat akun | `scripts/user.ts` (`list`, `add`, `passwd`, `remove`) |

## Keputusan

| # | Keputusan | Default | Disetujui |
| --- | --- | --- | --- |
| 1 | Satu peran untuk semua akun; belum ada pemisahan admin, penilai, OPD, dan pembaca. | Satu peran | Berlaku (tertulis di kode) |
| 2 | Tanpa pendaftaran. Akun dibuat operator lewat `scripts/user.ts`. | Tanpa sign-up | Berlaku (tertulis di kode) |
| 3 | Sesi adalah cookie HMAC berisi nama dan waktu kedaluwarsa; tidak ada sesi di server. | Cookie stateless | Berlaku (tertulis di kode) |
| 4 | Sesi berumur 7 hari dan tidak diperpanjang otomatis. | 7 hari | Berlaku (tertulis di kode) |
| 5 | Lima percobaan gagal dalam 15 menit mengunci alamat IP dan nama pengguna itu. | 5 percobaan / 15 menit | Berlaku (tertulis di kode) |
| 6 | Nama pengguna dan kata sandi salah memakai satu pesan yang sama. | Satu pesan | Berlaku (tertulis di kode) |
| 7 | Sesi berhenti berlaku begitu akunnya dihapus, tanpa menunggu kedaluwarsa. | Periksa akun tiap permintaan | Berlaku (tertulis di kode) |
| 8 | Tanpa `PEMDI_SESSION_SECRET` minimal 32 karakter, tidak ada yang bisa masuk. | Gagal tertutup | Berlaku (tertulis di kode) |

## Batasan yang disampaikan ke pengguna

- Satu peran: siapa pun yang masuk dapat membuka semua halaman, semua nilai, dan berkas dokumen
  mana pun.
- Belum ada SSO, MFA, atau pemulihan kata sandi mandiri.
- Belum ada log audit masuk, unggah, nilai, atau unduh.
- Kunci percobaan login disimpan di memori proses; kunci hilang saat aplikasi dimulai ulang dan
  tidak berlaku lintas replika.
- Cookie sesi tidak dapat dicabut dari jauh sebelum kedaluwarsa, kecuali akunnya dihapus.
- Nama di kepala halaman berasal dari cookie yang dapat dibaca halaman; itu hanya tampilan, bukan
  dasar akses.

## Checklist penerimaan

| ID | Lakukan | Harapkan | Hasil |
| --- | --- | --- | --- |
| `FT-12-AC1` | Masuk dengan kata sandi benar dari tautan halaman dalam | Halaman yang dituju terbuka, bukan selalu Beranda | Belum dijalankan |
| `FT-12-AC2` | Masuk dengan kata sandi salah, lalu dengan nama pengguna yang tidak ada | Keduanya menampilkan pesan yang sama; tidak ada petunjuk akun mana yang ada | Belum dijalankan |
| `FT-12-AC3` | Ulangi kata sandi salah lima kali | Percobaan keenam ditolak dengan pesan tunggu 15 menit | Belum dijalankan |
| `FT-12-AC4` | Buka `/dokumen` dan satu API tanpa sesi di jendela privat | Halaman dialihkan ke `/login`; API menjawab 401, bukan data | Belum dijalankan |
| `FT-12-AC5` | Ubah cookie `pemdi_sesi` di browser, lalu muat ulang | Sesi ditolak dan pengguna diminta masuk lagi | Belum dijalankan |
| `FT-12-AC6` | Hapus akun yang sedang dipakai lewat `scripts/user.ts`, lalu muat ulang (operator) | Permintaan berikutnya ditolak; pengguna diarahkan ke `/login` | Belum dijalankan |
| `FT-12-AC7` | Tekan Keluar, lalu buka `/dokumen` di tab baru | Kembali ke `/login`; tab baru juga meminta masuk, bukan menampilkan data | Belum dijalankan |
| `FT-12-AC8` | Kosongkan `PEMDI_SESSION_SECRET` di lingkungan uji (operator) | Halaman masuk menjawab bahwa login belum diatur di server; tidak ada yang bisa masuk | Belum dijalankan |

**Penerima** (bukan Pemilik): __________ **Tanggal:** ______ **Build:** ______

Pengecualian, masing-masing dengan pemilik dan tanggal:

## Setelah penerimaan

- [ ] `PRODUCT.md` bagian 2 dan 3 diperbarui
- [ ] Baris `FT-<n>` di `BACKLOG.md` menjadi **Released**, dengan PR-nya; tindak lanjut dicatat
- [ ] Tanggal Terkirim di `BACKLOG.md` diisi
- [ ] Hasil checklist di halaman ini diisi, dan bukti build disimpan
