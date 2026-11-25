# Roadmap pelaksanaan

Urutan kerja untuk pelaksana. Planner (owner + agent) menyusun rencana, spec, dan scaffold;
**pelaksana mengambil task dari sini, satu task satu PR**. Status selalu dibaca dari
[BACKLOG.md](BACKLOG.md); dokumen ini hanya urutan dan alasannya.

Dua jalur berjalan paralel: **Port** (backend ke Rust) dan **Frontend** (UI mengikuti guidelines).
Jalur Operasi punya satu item yang tidak boleh terlewat: `OPS-1` sebelum 2026-12-13.

```mermaid
flowchart LR
    subgraph M0["M0 · Fondasi (selesai)"]
        P0[PORT-0 scaffold] --> P1[PORT-1 makro-hitung<br/>contoh paritas]
    end
    subgraph M1["M1 · Alat & domain murni"]
        P2[PORT-2 unseen.sh]
        T1[TEST-1 test karakterisasi TS]
        P11[PORT-11 indeks Pemdi] --> P12[PORT-12 kebutuhan] --> P13[PORT-13 kerangka]
        P14[PORT-14 spm-hitung]
        P15[PORT-15 prosn-hitung]
        P10[PORT-10 seri/terkini]
    end
    subgraph M2["M2 · Kontrak & adapter"]
        D2{{DEC-2}} --> P4[PORT-4 tipe TS dari Rust]
        P3[PORT-3 oracle rekaman] --> P20[PORT-20 lakehouse] & P21[PORT-21 LLM]
        P22[PORT-22 registry]
        P23[PORT-23 berkas sumber]
        P25[PORT-25 pengguna/sesi]
        D5{{DEC-5}} --> P24[PORT-24 intake/OCR]
    end
    subgraph M3["M3 · Use case & route"]
        P30[PORT-30..35 use case] --> P40[PORT-40..45 route]
    end
    subgraph M4["M4 · Berdampingan & cutover"]
        P46[PORT-46 shadow] --> P47[PORT-47 cutover] --> P48[PORT-48 konvensi API]
    end
    subgraph FE["Frontend (paralel)"]
        F1[FE-1 pecah dasbor] --> F4[FE-4 struktur fitur + boundaries]
        F4 --> F2[FE-2 a11y] & F7[FE-7 format] 
        F7 --> F8[FE-8 status] & F9[FE-9 primitif]
        F6[FE-6 klien API<br/>kontrak tulisan tangan] --> F5[FE-5 halaman via API] & F13[FE-13 error UI]
        P4 -.ganti tipe.-> F6
    end
    M0 --> M1 --> M2 --> M3 --> M4
    P40 --> F5
```

## M0 · Fondasi — selesai

Gate, ratchet, CI, dokumen produk, scaffold Rust tujuh crate, dan **`PORT-1` sebagai contoh
lengkap** alur porting: oracle → case file → port → test paritas. Pelaksana sebaiknya membaca
contoh itu dulu: `scripts/oracle/modules.ts`, `scripts/oracle/cases.ts`,
`tests/parity/makro-hitung.cases`, `rust/crates/pemdi-domain/src/makro.rs`,
`rust/crates/pemdi-domain/tests/parity_makro.rs`.

## M1 · Alat dan domain murni

Mulai di sini. Tidak butuh lakehouse, LLM, atau keputusan owner.

| Urutan | Task | Kenapa urutan ini |
| --- | --- | --- |
| 1 | `PORT-2` | Reviewer butuh kasus yang belum dilihat sebelum menerima port berikutnya |
| 2 | `TEST-1` | Menjaga UI lama tetap benar selama porting |
| 3 | `PORT-11` | Daun terpenting: angka Indeks Pemdi; `PORT-12`, `PORT-13`, dan use case dasbor bergantung padanya |
| 4 | `PORT-12` → `PORT-13` | Mengikuti dependensi |
| 5 | `PORT-14`, `PORT-15`, `PORT-10` | Bebas urutan; `PORT-10` butuh tipe `NilaiMakro` di contracts |

Selesai bila semua baris ledger §1 berstatus "parity green".

## M2 · Kontrak dan adapter

`PORT-4` menunggu `DEC-2`; `PORT-24` menunggu `DEC-5`. Adapter lain bisa jalan setelah `PORT-3`
(oracle berupa rekaman permintaan/respons). Selesai bila ledger §2 "parity green" dan `pemdi-api`
`/api/health` melapor `ok` terhadap lakehouse sungguhan.

## M3 · Use case dan route

Ledger §3 lalu §4, mengikuti "Blocked by" di backlog. Setiap route baru mengembalikan bentuk
respons **yang sama persis** dengan route TS lama (respons dibekukan, ADR 0001).

## M4 · Berdampingan dan cutover

`PORT-46`: kontainer `pemdi-api` di stack, Next.js meneruskan route yang sudah diporting dan
mencatat selisih. `PORT-47`: cutover per kelompok route setelah 7 hari tanpa selisih, lalu kode TS
dihapus di minggu yang sama. `PORT-48`: konvensi API RantAI.

## Frontend (paralel sejak M1)

Tidak bergantung pada Rust, bisa mulai sekarang, berurutan: `FE-1` → `FE-4` (a: boundaries di
gate, b: dua fitur pertama, c: sisanya) → `FE-2`, `FE-7` → `FE-8`, `FE-9`. `FE-3` setelah
`TEST-1`. `FE-6` (klien API dengan tipe kontrak tulisan tangan) juga bisa mulai sekarang;
`PORT-4` nanti mengganti tipenya dengan hasil generate. `FE-5` berjalan per halaman, mengikuti
route Rust yang sudah cutover. `FE-10`–`FE-12` sesudahnya. Data dan alasan tiap slice:
[`../port/frontend-audit.md`](../port/frontend-audit.md) §7.

## Yang menunggu owner

`DEC-2` (pembangkit tipe), `DEC-3` (LLM produksi), `DEC-4` (alat build data), `DEC-5` (OCR),
`DEC-6` (PROSN), `DEC-7` (dependensi crate untuk adapter: `reqwest`, `regex`, `scrypt`, dan lainnya;
menahan sebagian besar M2). Pelaksana tidak memutuskan ini; bila task tertahan, tulis di PR dan lanjut ke
task lain.
