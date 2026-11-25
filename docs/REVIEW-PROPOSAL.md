# Review Proposal SKALA+ vs Aplikasi Pemdi-AI

**Dokumen yang direview:** *Proposal Berdikari 2026 SKALA+ PemdiAI Tulang Bawang
Barat* (78 halaman).
**Dibandingkan dengan:** repo `pemdi-ai` (working tree, 8 Nov 2026),
`https://pemdi.rantai.dev`, snapshot `data/dokumen.json` dan
`data/penilaian.json`, serta [`docs/ARSITEKTUR.md`](ARSITEKTUR.md).
**Tujuan review:** menyamakan klaim teknis proposal dengan aplikasi yang benar-benar
ada, dan dengan arsitektur yang disepakati.

---

## 1. Penilaian singkat

Proposal ini kuat di **masalah, baseline, dan bukti pemanfaatan**: angka 148
berkas, 138 terbaca, 44 OCR, 308 temuan, 341 angka, dan uji silang Makro 24/24
memang cocok dengan data di repo. Struktur SKALA+, indikator I1–I9, dan model
keberlanjutan juga jelas.

Masalahnya ada di **Lampiran A dan beberapa klaim di Bab I**: dokumen ini
mencampur tiga hal yang berbeda —

1. **kondisi yang benar-benar berjalan sekarang**,
2. **target yang akan dibangun dalam program**, dan
3. **aplikasi survei yang terpisah dari Pemdi-AI**.

Akibatnya muncul klaim yang tidak bisa dibuktikan dari aplikasi, misalnya
on-premise yang ditulis sebagai kondisi sekarang padahal masih target, lapisan
silver/gold, RBAC, dan domain `epemdi.ai.id`. Reviewer teknis akan menemukan
kontradiksi ini karena beberapa di antaranya bisa dicek langsung dari aplikasi.

Catatan penting: **on-premise bukan hal yang mustahil dan memang arah yang
benar**. Yang perlu dibetulkan adalah tense dan buktinya, bukan visinya.

**Kesimpulan:** jangan ubah visi programnya; perbaiki klaim teknisnya. Ada
**13 koreksi P0** yang harus masuk sebelum submit, **9 koreksi P1**, dan
beberapa penguatan P2.

---

## 2. P0 — harus diperbaiki sebelum submit

### P0-1. Domain `epemdi.ai.id` tidak aktif

| | |
| --- | --- |
| Lokasi | §1.3; keterangan Gambar A.1; Tabel A.1 |
| Klaim | "Akses melalui `epemdi.ai.id` lewat Cloudflare Tunnel" |
| Status | **Diperbaiki 11 Nov 2026:** `epemdi.ai.id` kini dilayani tunnel kedua ke aplikasi yang sama; `pemdi.rantai.dev` tetap aktif. Proposal boleh menyebut `epemdi.ai.id` sebagai alamat utama. |
| Fakta (saat review) | Saat review, `epemdi.ai.id` **tidak punya A record** dan tidak bisa dihubungi. Yang aktif adalah `https://pemdi.rantai.dev` (HTTP 200), dan `scripts/portainer.sh` memang membuat tunnel untuk `pemdi.rantai.dev`. |
| Perbaikan | Ganti ke domain yang aktif, atau tulis "rencana migrasi ke `epemdi.ai.id`" dan lampirkan bukti DNS/TLS. Jangan menyebut domain yang belum resolve sebagai akses saat ini. |

### P0-2. On-premise valid sebagai target — tetapi proposal membacanya sebagai kondisi sekarang

| | |
| --- | --- |
| Lokasi | §1.3; §5.1; Tabel A.1; Tabel A.3; Tabel A.6 |
| Klaim | "Aplikasi, lakehouse, dan model AI dijalankan pada dua server on-premise ... sehingga dokumen tidak dikirim ke layanan AI eksternal." |
| Fakta | Secara rancangan, on-prem **memang bisa dan memang arah program**; tidak ada yang salah dengan visinya. Yang belum sinkron: konfigurasi yang direview masih memakai `LLM_URL=https://opencode.ai/zen/go/v1` (dan `llm-proxy` = Caddy ke `opencode.ai`), sedangkan Tabel A.3 sendiri menulis model AI saat ini sebagai endpoint eksternal dan on-prem sebagai rancangan. Jadi on-prem adalah target, belum kondisi yang berjalan. |
| Perbaikan | Pertahankan visi on-prem, ubah tense-nya: "Pada program ini, model AI **akan dipindahkan** ke server on-premise ...". Tambahkan kriteria penerimaan: `LLM_URL` menunjuk model lokal, egress ke endpoint eksternal diblokir, benchmark kualitas vs model cloud, dan uji bahwa dokumen tidak keluar. Kalau kalimat tetap present tense, reviewer yang membuka stack akan melihat endpoint eksternal. |

### P0-3. Klaim lapisan silver/gold dan "standar BPS 996/2025" belum ada di aplikasi

| | |
| --- | --- |
| Lokasi | §1.1; keterangan Gambar A.1; Tabel A.1; Tabel A.2 |
| Klaim | "Data diolah di lakehouse berlapis bronze, silver (terstandar sesuai Keputusan Kepala BPS 996/2025), dan gold." |
| Fakta | `src/lib/sinkron.ts` menulis 12 tabel `pemdi_*` ke **bronze** (`icecat_api.bronze.<nama>`); tidak ada silver/gold, tidak ada dbt, dan tidak ada referensi BPS 996/2025 di kode. Dasbor menghitung agregasi di aplikasi dari bronze. |
| Perbaikan | Tulis apa adanya: "Bronze tersedia; silver dan gold masih dalam rancangan dan akan dibangun pada program ini." Hapus "BPS 996/2025" kecuali benar-benar diimplementasikan dan sitasinya bisa ditunjukkan. |

### P0-4. Klaim RBAC, audit, retensi, rate limit, dan akses berkas per pemilik tidak benar untuk Pemdi-AI

| | |
| --- | --- |
| Lokasi | Tabel 1.1; Tabel A.1; Tabel A.3; Tabel A.6 |
| Klaim | "Peran admin/penilai/operator OPD/pembaca, rate limit login, berkas hanya untuk pemilik atau admin, log audit, retensi." |
| Fakta | `src/lib/auth.ts` hanya memakai cookie HMAC; `src/lib/users.ts` memakai scrypt; **tidak ada field peran** dan tidak ada pengecekan peran. `data/users.json` berisi **2 akun** (`admin`, `tubaba`), bukan 36. Tidak ada rate limit, log audit, retensi, atau pemeriksaan pemilik berkas: `GET /api/dokumen/[id]/berkas` bisa diakses semua pengguna yang login. |
| Perbaikan | Pisahkan klaim aplikasi survei dan Pemdi-AI. Untuk Pemdi-AI tulis: "saat ini satu peran, 2 akun admin, belum ada audit/retensi/rate limit; RBAC dan audit menjadi target program." Atau implementasikan dulu sebelum menulis "sebagian". |

### P0-5. Stack Pemdi-AI dan aplikasi survei tercampur

| | |
| --- | --- |
| Lokasi | Tabel A.1 |
| Klaim | Baris "API aplikasi survei" memakai Hono/Node 22/bcrypt/rate limit/5 MB, lalu baris "Aplikasi Pemdi-AI" tidak menyebut stack-nya. Pembaca akan menyimpulkan Pemdi-AI memakai Hono. |
| Fakta | Pemdi-AI adalah **Next.js 16 (App Router), React 19, Tailwind CSS 4**; build/install memakai Bun, runtime **Node 22** di container; autentikasi scrypt + cookie HMAC; unggah maksimum **50 MB**; tidak ada Hono. Aplikasi survei (React/Vite/Hono/PostgreSQL) adalah aplikasi terpisah dan tidak ada di repo ini. |
| Perbaikan | Tambahkan dua baris yang tegas: "Aplikasi survei OPD — React 19/Vite/Hono/PostgreSQL" dan "Aplikasi Pemdi-AI — Next.js 16/Node 22 (build Bun), 50 MB, registry JSON + lakehouse". Jangan memakai properti aplikasi survei untuk menilai keamanan Pemdi-AI. |

### P0-6. "Teks per halaman" dan "penautan hingga halaman" masih target, bukan kondisi saat ini

| | |
| --- | --- |
| Lokasi | Tabel A.1 (Pemrosesan dokumen); Tabel A.2 (Dokumen dan teks); Tabel A.6 (Penautan bukti) |
| Klaim | "Lapisan teks PDF/DOCX/PPTX, teks per halaman"; "penautan hingga halaman, tabel, sel". |
| Fakta | `Dok` di `src/lib/store.ts` tidak punya field halaman. Teks disimpan per dokumen di `data/teks/{id}.txt`. Temuan menyimpan `kutipan`, `nama_file`, dan `opd` — **tanpa halaman**. `src/lib/proses.ts` memotong teks ke **14.000 karakter**; `scripts/ocr.py` hanya membaca **6 halaman pertama** pada 110 DPI. Panel Makro/SPM memang punya halaman karena sumbernya sudah berhalaman, tetapi temuan OPD belum. |
| Perbaikan | Tulis: "Saat ini teks per dokumen; kutipan + nama berkas + OPD. Penautan halaman/tabel/sel adalah deliverable program." Tambahkan juga batas 14.000 karakter/6 halaman di bagian keterbatasan. |

### P0-7. Rumus nilai aspek di Lampiran A salah

| | |
| --- | --- |
| Lokasi | Tabel A.2, poin 2 |
| Klaim | "Nilai aspek = rata-rata nilai efektif indikator dalam aspek." |
| Fakta | `src/data/pemdi.ts` memakai **rata-rata terbobot**: `Σ(bobot_indikator × nilai) ÷ bobot_aspek`. Dengan data saat ini, rumus rata-rata sederhana menghasilkan indeks **1,52**, bukan **1,54**; rumus terbobot menghasilkan **1,537 → 1,54**. |
| Perbaikan | Ganti dengan rumus terbobot dan beri contoh: aspek 3 = (0,05×2,80 + 0,03×1,00 + 0,03×1,30 + 0,04×1,00) ÷ 0,15 = 1,66. Ini penting karena menyangkut angka utama proposal. |

### P0-8. Klaim "Dukungan ProSN versi awal sudah dipakai" bertentangan dengan kondisi aplikasi

| | |
| --- | --- |
| Lokasi | §1.1; §1.4; §5.1 |
| Klaim | "Pemantauan ... Dukungan ProSN versi awal", "modul ProSN dibangun ulang". |
| Fakta | `src/lib/fitur.ts` menetapkan `TAMPIL_PROSN = false`; menu dan halaman ProSN **disembunyikan** karena skornya masih menunggu review. Jadi modulnya ada di kode, tetapi tidak ditampilkan/dipakai sebagai panel aktif. |
| Perbaikan | Tulis: "Modul ProSN sudah ada di kode tetapi disembunyikan dari navigasi karena skornya belum direviu; program ini akan menampilkan dan membangun ulang panelnya." Jangan menyebut sebagai pemanfaatan aktif. |

### P0-9. "36 OPD dengan 36 akun" adalah aplikasi survei, bukan Pemdi-AI

| | |
| --- | --- |
| Lokasi | §1.4; Gambar A.4; Tabel A.1 |
| Klaim | "36 OPD memakai 36 akun (29 diverifikasi, 5 terkirim, 2 draf)." |
| Fakta | `data/users.json` Pemdi-AI berisi **2 akun**. Angka 36 OPD/36 akun berasal dari aplikasi survei; registry dokumen Pemdi-AI berisi 32 nama OPD. |
| Perbaikan | Sebutkan aplikasinya: "36 akun pada aplikasi survei OPD; Pemdi-AI saat ini 2 akun admin." Jika produksi memang punya 36 akun, lampirkan bukti dan jelaskan mekanismenya. |

### P0-10. "Dua server on-premise (utama + cadangan)" adalah target yang masuk akal, tetapi belum terbukti sebagai kondisi saat ini

| | |
| --- | --- |
| Lokasi | §1.3; §5.1; Tabel A.3 |
| Klaim | "Dijalankan pada dua server on-premise (utama dan cadangan)". |
| Fakta | Rencana dua server (utama + cadangan) memang layak dan didukung anggaran Tahap 3 (server, NAS, UPS Rp71.895.000). Yang belum terbukti: README menyebut **satu stack Portainer** di `192.168.18.148`; tidak ada bukti server kedua, heartbeat, atau failover saat ini. |
| Perbaikan | Tulis timeline-nya: "Produksi saat ini satu host; server utama + cadangan diadakan dan diuji failover pada Tahap 3." Jika server kedua sudah ada, lampirkan bukti (hostname, health check, uji failover). |

### P0-11. "19 nilai AI + 1 manual" tidak cocok dengan data saat ini

| | |
| --- | --- |
| Lokasi | §1.4; Gambar A.9; Tabel A.6 |
| Klaim | "19 nilai estimasi AI dan 1 manual (Indikator 1)." |
| Fakta | `data/penilaian.json` saat ini berisi **20 nilai AI, 0 manual**; Indikator 1 = 1,20 dengan penilai AI. Screenshot/klaim tampaknya dari snapshot 4 November 2026. |
| Perbaikan | Perbarui menjadi 20 AI/0 manual, atau pulihkan nilai manual Indikator 1 lalu ambil ulang screenshot. Cantumkan tanggal snapshot di keterangan gambar. |

### P0-12. Klaim PII dan "dokumen tidak diproses" belum didukung kode

| | |
| --- | --- |
| Lokasi | §4; Tabel A.3; Tabel A.6 |
| Klaim | "Dokumen berisi data pribadi tidak diproses kecuali disepakati, dan data disimpan agregat." |
| Fakta | `src/lib/intake.ts` tidak melakukan deteksi/redaksi PII. Teks dokumen dikirim apa adanya ke LLM eksternal (lihat P0-2). Tidak ada filter NIK/nama/alamat. |
| Perbaikan | Tambahkan kolom "kondisi saat ini": "belum ada redaksi PII; pemrosesan dibatasi pada dokumen yang disetujui." Jadikan redaksi PII + model lokal sebagai target yang diuji, bukan klaim yang sudah berlaku. |

### P0-13. "Laporan ... diunduh ke Excel dan PDF" perlu diperjelas

| | |
| --- | --- |
| Lokasi | §1.1; Tabel A.6 |
| Klaim | "Report ... dapat diunduh ke Excel dan PDF." |
| Fakta | Tab Laporan Makro/SPM menyediakan **unduh Excel** dan **Cetak/PDF melalui print browser** (tata letak A4). Tidak ada generator PDF/DOCX di server. |
| Perbaikan | Tulis "Excel dan cetak/PDF melalui browser"; ekspor DOCX/PDF server-side adalah target Generate Engine. |

---

## 3. P1 — perlu diperbaiki agar konsisten

| # | Lokasi | Masalah | Perbaikan |
| --- | --- | --- | --- |
| P1-1 | Tabel A.1; A.3; A.6 | OCR disebut "AI lokal" tanpa batas. | Sebut RapidOCR on-prem, halaman 1–6, 110 DPI, sinkron; target OCR layout-aware per halaman. |
| P1-2 | Tabel A.1; A.3; A.6 | "Antrean per dokumen" terdengar persisten. | Sebut antrean in-memory, paralel 3, hilang saat restart; antrean persisten = target. |
| P1-3 | Tabel A.1; A.3 | 5 MB vs 50 MB. | Pisahkan: aplikasi survei 5 MB; Pemdi-AI 50 MB. |
| P1-4 | Tabel A.2 | "Indeks berlabel Estimasi AI" tidak ada di UI saat ini. | UI memakai pil "sementara · 19/20" saat belum lengkap; setelah 20/20, indeks final. Sesuaikan. |
| P1-5 | §1.1; A.1 | "Report" disebut sebagai produk ketiga. | Sebut sebagai **tab Laporan** di dalam dasbor; "AI Data Ask" = **AI Tubaba**. |
| P1-6 | Gambar A.1 | Diagram mencampur kondisi sekarang dan target. | Beri legenda garis penuh = sekarang, putus-putus = target; tandai silver/gold, RAG, dan server kedua sebagai target. |
| P1-7 | §1.6; A.6 | "OCR dengan AI lokal" vs arsitektur yang menyarankan Mistral OCR. | Karena arahnya on-prem, jadikan RapidOCR/PaddleOCR default; Mistral OCR hanya opsional untuk dokumen non-sensitif dengan DPA. |
| P1-8 | Tabel A.3 | "Berkas survei disimpan di PostgreSQL" tidak mencakup berkas Pemdi-AI. | Tambah baris: "Berkas Pemdi-AI di `data/files` (volume), maks 50 MB; object storage = target." |
| P1-9 | §1.3; §5.1; A.3 | "Dua server" dan "on-prem" bercampur dengan anggaran pengadaan Tahap 3. | Tulis timeline: kondisi sekarang (host existing) → pengadaan Tahap 3 → uji failover. |

---

## 4. P2 — penguatan agar visi dan arsitektur sama

1. **Tambahkan rujukan arsitektur.** Satu paragraf di Lampiran A yang menunjuk
   `docs/ARSITEKTUR.md` dan memakai kosakata yang sama: Intake & OCR → Rantai
   Lakehouse → Lapisan AI → Dasbor.
2. **Jelaskan tiga pekerjaan AI** (ekstraksi dokumen, penilaian indikator,
   NL2SQL) dan tekankan **indeks dihitung kode, bukan LLM**. Ini pembeda yang
   kuat dan sudah benar di aplikasi.
3. **Tambahkan guardrail NL2SQL** di Tabel A.3/A.6: read-only, tool allowlist
   (`run_sql`, `list_datasets`, `describe_dataset`, `lakehouse_overview`),
   maksimum 8 putaran, 2.000 baris, timeout 120 detik, SQL selalu ditampilkan.
4. **Tambahkan RAG dokumen sebagai target**: pertanyaan naratif ("apa isi SOP
   X?") tidak dijawab SQL; perlu chunk + sitasi halaman.
5. **Tambahkan evaluasi**: golden set dokumen/pertanyaan, akurasi ekstraksi,
   execution accuracy NL2SQL, dan gate regresi di CI.
6. **Tambahkan versi model/prompt** di bukti: `model`, `prompt_version`,
   `temperature`, token, latency. Tanpa ini, hasil tidak bisa direproduksi.
7. **Tambahkan threat model**: prompt injection dari dokumen, SQL injection,
   PII, akses lintas OPD, dan retensi. Ini memperkuat, bukan memperlemah.
8. **Selaraskan model replikasi**: proposal memakai satu deployment on-prem per
   pemda, bukan SaaS multi-tenant. Ganti "multi-tenant" di dokumen arsitektur
   menjadi "multi-instance/tenant-aware" agar tidak bertentangan.
9. **Tambahkan "out of scope"**: SIPD/e-SAKIP API, crawling, SDI, dan
   multi-tenant SaaS belum termasuk program. Ini mencegah ekspektasi berlebih.
10. **Lampirkan benchmark model lokal** untuk membuktikan on-premise layak di
    Ryzen AI 9 HX 370/32 GB: model dan kuantisasi, RAM terpakai, token/detik,
    kualitas ekstraksi vs model cloud, dan rencana fallback. Ini yang
    membedakan "bisa di-deploy" dari "sudah terbukti cukup akurat".

---

## 5. Teks pengganti yang disarankan

### §1.1 — paragraf pertama

> Pemdi-AI membaca dokumen laporan OPD (PDF, Word, PPTX, foto, dan Excel),
> mengekstrak temuan dan angka beserta rujukan dokumennya, lalu memetakannya ke
> indikator. Data dokumen disimpan di lakehouse pada lapisan **bronze** (mentah).
> Lapisan **silver** (normalisasi dan penyeragaman) dan **gold** (mart dasbor)
> sudah dirancang dan akan dilengkapi pada program ini; saat ini agregasi dasbor
> dihitung aplikasi dari tabel bronze. Rancangan arsitektur juga menerima data
> SDI dan data publik, tetapi program ini hanya memakai dokumen laporan OPD
> (Lampiran A).

### §1.3 — infrastruktur dan AI

> Produksi saat ini berjalan sebagai stack Portainer di satu server Diskominfo
> dan diakses melalui `https://epemdi.ai.id` (cermin: `https://pemdi.rantai.dev`) lewat Cloudflare Tunnel. Model
> bahasa pada versi yang diuji memakai endpoint OpenAI-compatible; program ini
> akan memindahkan inferensi ke model lokal di server GPU/NPU yang diadakan pada
> Tahap 3, lalu menonaktifkan endpoint eksternal. Sampai migrasi selesai,
> dokumen yang mengandung data pribadi tidak diproses. Dua unit server (utama
> dan cadangan) adalah target program, bukan kondisi saat ini.

### Tabel 1.1 — baris "Hak akses, log, retensi"

> **Saat ini:** Pemdi-AI memakai satu peran dan 2 akun admin; belum ada log
> audit, retensi, atau rate limit. Aplikasi survei memiliki peran admin/pengguna
> dan rate limit sendiri.
> **Pekerjaan program:** RBAC admin/penilai/operator/pembaca, pembatasan per
> OPD, log audit, retensi, dan uji keamanan independen.

### Tabel A.2 — dokumen dan teks

> **Dokumen dan teks:** berkas, format, OPD pemilik, jenis (klasifikasi AI),
> status baca (lapisan teks/OCR/tak terbaca), dan teks per dokumen. Penautan
> halaman/tabel/sel dan penyimpanan teks per halaman adalah deliverable program.

### Tabel A.2 — rumus

> Nilai aspek = Σ(bobot indikator × nilai efektif indikator) ÷ bobot aspek.
> Indeks Pemdi = Σ(bobot aspek × nilai aspek).
> Contoh aspek 3: (0,05×2,80 + 0,03×1,00 + 0,03×1,30 + 0,04×1,00) ÷ 0,15 = 1,66.

### Tabel A.3 — keamanan (kondisi saat ini)

> **Akses:** satu peran, 2 akun admin; belum ada pembatasan per OPD.
> **Audit/retensi:** belum ada.
> **Penyimpanan:** berkas Pemdi-AI di volume `data/files` (maks. 50 MB);
> aplikasi survei menyimpan berkas di PostgreSQL (maks. 5 MB).
> **PII:** belum ada redaksi otomatis; pemrosesan dibatasi pada dokumen yang
> disetujui.
> **Model AI:** endpoint OpenAI-compatible eksternal pada versi uji; model lokal
> menjadi target Tahap 3.

---

## 6. Checklist konsistensi angka dan istilah

| Item | Nilai yang benar | Catatan |
| --- | --- | --- |
| Berkas diunggah | 148 | `data/dokumen.json` |
| Terbaca | 138 (94 teks, 44 OCR) | 10 tidak terbaca |
| Temuan | 308 dari 113 dokumen | bukan 138 dokumen |
| Angka/metrik | 341 | |
| Indeks | 1,537 → tampil 1,54; predikat **Cukup** | bukan Kurang |
| Penilaian | 20 AI, 0 manual (snapshot 8 Nov) | proposal menulis 19+1 |
| Kebutuhan data | 68 butir; 19 terpenuhi, 8 sebagian, 41 belum | 49 belum/sebagian |
| Sebaran predikat | 13 Kurang, 6 Cukup, 1 Baik | |
| Domain | `epemdi.ai.id` + `pemdi.rantai.dev` | dua tunnel, aplikasi sama |
| Unggah Pemdi-AI | 50 MB | 5 MB = aplikasi survei |
| OCR | 6 halaman, 110 DPI, RapidOCR | bukan seluruh dokumen |
| Potong teks LLM | 14.000 karakter | belum per halaman |
| Antrean | in-memory, paralel 3 | hilang saat restart |

---

## 7. Mana yang cukup diubah teks, mana yang harus kode

**Cukup ubah teks (cepat):**
P0-1 domain, P0-3 silver/gold, P0-5 stack, P0-8 ProSN, P0-9 akun, P0-10 dua
server, P0-11 19/1, P0-13 PDF, P1-1–P1-9.

**Butuh perubahan kode/konfigurasi sebelum klaim dipertahankan:**
P0-2 pindah ke model lokal + blokir egress, P0-4 RBAC/audit/retensi, P0-6
halaman, P0-12 redaksi PII.

**Butuh keputusan arsitektur:**
1. **Model dan OCR on-prem** — arah on-prem sudah jelas; yang diputuskan adalah
   model lokal (ukuran/kuantisasi), OCR lokal (PaddleOCR/RapidOCR), dan benchmark
   kelayakan di HX 370/32 GB. Mistral OCR hanya untuk profil cloud/non-sensitif.
2. **Silver/Gold** — implementasikan atau turunkan klaim.
3. **Replikasi** — satu deployment per pemda (sesuai proposal) atau SaaS
   multi-tenant (sesuai sebagian dokumen arsitektur). Pilih satu.

---

## 8. Urutan perbaikan yang disarankan

1. **Hari 1:** betulkan domain, rumus indeks, angka 19/1, ProSN, stack, dan
   pemisahan aplikasi survei/Pemdi-AI.
2. **Hari 2:** tulis ulang §1.1, §1.3, Tabel 1.1, Tabel A.1–A.3, dan keterangan
   Gambar A.1/A.9.
3. **Hari 3:** finalkan pilihan model lokal + OCR on-prem, jalankan benchmark,
   lalu sesuaikan `docs/ARSITEKTUR.md` dan proposal agar satu suara.
4. **Sebelum submit:** ambil ulang screenshot (20 AI/0 manual, domain aktif,
   ProSN tersembunyi), tambahkan commit hash/repo, dan minta tim ops
   mengonfirmasi jumlah server/akun produksi.

---

*Review ini memeriksa klaim yang bisa diverifikasi dari repo, data snapshot, dan
situs live. Klaim yang hanya ada di aplikasi survei atau di luar repo ditandai
"perlu bukti terpisah", bukan dianggap salah.*
