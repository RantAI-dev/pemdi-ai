/**
 * Bangun ulang src/data/prosn/sumber.json untuk dasbor "Dukungan PROSN".
 *
 * Sumber:
 *   - sumber/prosn/manifest.json + berkas PDF di sumber/prosn/ (unduhan resmi
 *     *.go.id: RKPD-P 2025, APBD 2025, APBD-P 2025, LAKIP, LKPD, Perbup, Kepbup)
 *   - data/dokumen.json (dokumen aplikasi yang dipakai sebagai bukti; berkas
 *     aslinya disalin ke sumber/dokumen/<id>.<jenis>)
 *   - sumber/bps/* (dua publikasi BPS untuk indikator outcome)
 *   - dua berita resmi *.go.id (Sekolah Rakyat dan capaian Kopdes/SPPG)
 *
 * Penilaian per indikator ada di src/data/prosn/penilaian.json (disusun tangan)
 * dan hanya divalidasi di sini: setiap bukti harus menunjuk sumber yang ada,
 * dan setiap nilai kriteria harus sama dengan nilai pada kerangka PROSN.
 *
 * Jalankan dari akar repo: bun run scripts/prosn-bangun.ts
 */
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SumberMakro } from "../src/lib/makro";
import { prosn } from "../src/data/kerangka/prosn";

type Manifest = {
  file: string;
  url?: string;
  judul: string;
  penerbit: string;
  tahun_terbit?: number | null;
  catatan?: string;
};

type Dok = { id: string; opd: string; nama: string; jenis: string; ukuran_kb: number; ai?: { judul?: string; tahun?: string } };

type Bukti = { sumber: string; halaman: number | null; lokasi: string; kutipan: string };
type Penilaian = {
  indikator: string;
  tahun: number;
  kriteria: "a" | "b" | "c" | "d" | null;
  nilai: number | null;
  alasan: string;
  bukti: Bukti[];
  penilai: "AI";
  terverifikasi: boolean;
};

const ROOT = process.cwd();
const DIR_PROS = path.join(ROOT, "sumber", "prosn");
const DIR_DATA = path.join(ROOT, "src", "data", "prosn");
const TAHUN = 2025;

const baca = async <T>(berkas: string): Promise<T> => JSON.parse(await readFile(berkas, "utf8")) as T;

async function ukuranKb(berkas: string): Promise<number | null> {
  try {
    return Math.round((await stat(berkas)).size / 1024);
  } catch {
    return null;
  }
}

/** Dokumen aplikasi yang dipakai sebagai bukti (id, tahun terbit, judul ringkas). */
const DOKUMEN: { id: string; tahunTerbit: number | null; jenis?: "rpjmd" }[] = [
  { id: "b268f44dbfce", tahunTerbit: 2025, jenis: "rpjmd" }, // Perda 8/2025 RPJMD 2025–2029
  { id: "adc1aae82988", tahunTerbit: 2026 }, // Laporan Kinerja TPID Semester I 2026
  { id: "7e10db379cac", tahunTerbit: 2026 }, // Laporan subkegiatan PBG MBR Semester 1 2026
  { id: "a42806b97d04", tahunTerbit: 2026 }, // Pengumuman PBG gratis bagi MBR
  { id: "47fe8c4cc73f", tahunTerbit: null }, // Tangkapan layar SIKS-NG
  { id: "03c7ea11d3d1", tahunTerbit: 2025 }, // Perbup 38/2025 standar pelayanan perizinan
  { id: "f14e7ccdd146", tahunTerbit: 2025 }, // SOP pemanfaatan ruang dan PBG
  { id: "37e1d1808340", tahunTerbit: null }, // Dokumentasi pengelolaan pengaduan DPMPTSP
  { id: "aa9a54303a12", tahunTerbit: null }, // Daftar aplikasi perizinan
  { id: "1a8ff52fe126", tahunTerbit: 2023 }, // Laporan inovasi daerah SIBERUGO
];

/** Publikasi BPS yang dipakai untuk indikator outcome. */
const BPS: { file: string; id: string; judul: string; tahunTerbit: number }[] = [
  {
    file: "bps-tubaba-dalam-angka-2026.pdf",
    id: "bps-tubaba-dalam-angka-2026",
    judul: "Kabupaten Tulang Bawang Barat Dalam Angka 2026",
    tahunTerbit: 2026,
  },
  {
    file: "bps-nasional-statistik-indonesia-2026.pdf",
    id: "bps-nasional-statistik-indonesia-2026",
    judul: "Statistik Indonesia 2026",
    tahunTerbit: 2026,
  },
];

/** Berita resmi pemerintah daerah (halaman HTML, bukan berkas). */
const BERITA: SumberMakro[] = [
  {
    id: "berita-dinsos-sekolah-rakyat-tubaba",
    judul: "Sekolah Rakyat Tubaba Siap Dibangun Akhir 2026, Dengan Kapasitas Mencapai 2.520 Siswa",
    penerbit: "Dinas Sosial Kabupaten Tulang Bawang Barat",
    tahunTerbit: 2026,
    jenis: "dokumen",
    href: "https://dinsos.tubaba.go.id/baca-berita?content=Sekolah-Rakyat-Tubaba-Siap-Dibangun-Akhir-2026,-Dengan-Kapasitas-Mencapai-2.520-Siswa_dUzXR",
    dokId: null,
    indikator: [],
    ukuranKb: null,
  },
  {
    id: "berita-tubaba-hut-17-kopdes-sppg",
    judul: "Rayakan HUT Ke-17, Bupati Tubaba Ajak Seluruh Elemen “Bertumbuh, Berdaya, Bersama”",
    penerbit: "Dinas Komunikasi dan Informatika Kabupaten Tulang Bawang Barat",
    tahunTerbit: 2026,
    jenis: "dokumen",
    href: "https://tubaba.go.id/baca-berita?content=Rayakan-HUT-Ke-17,-Bupati-Tubaba-Ajak-Seluruh-Elemen-%22Bertumbuh,-Berdaya,-Bersama%22_P5KPV",
    dokId: null,
    indikator: [],
    ukuranKb: null,
  },
];

// --- Sumber unduhan di sumber/prosn ---------------------------------------
const manifest = await baca<Manifest[]>(path.join(DIR_PROS, "manifest.json"));
const sumberProsn: SumberMakro[] = [];
for (const m of manifest) {
  const ukuran = await ukuranKb(path.join(DIR_PROS, m.file));
  if (ukuran == null) throw new Error(`Berkas ${m.file} tidak ada di sumber/prosn`);
  sumberProsn.push({
    id: m.file.replace(/\.pdf$/i, ""),
    judul: m.judul,
    penerbit: m.penerbit,
    tahunTerbit: m.tahun_terbit ?? null,
    jenis: "dokumen",
    href: `/api/sumber/prosn/${encodeURIComponent(m.file)}`,
    dokId: null,
    indikator: [],
    ukuranKb: ukuran,
  });
}

// --- Dokumen aplikasi -----------------------------------------------------
const dokumen = await baca<Dok[]>(path.join(ROOT, "data", "dokumen.json"));
const sumberDokumen: SumberMakro[] = [];
for (const d of DOKUMEN) {
  const dok = dokumen.find((x) => x.id === d.id);
  if (!dok) throw new Error(`Dokumen ${d.id} tidak ada di data/dokumen.json`);
  sumberDokumen.push({
    id: dok.id,
    judul: dok.ai?.judul?.trim() || dok.nama,
    penerbit: dok.opd,
    tahunTerbit: d.tahunTerbit,
    jenis: d.jenis ?? "dokumen",
    href: `/api/dokumen/${dok.id}/berkas`,
    dokId: dok.id,
    indikator: [],
    ukuranKb: dok.ukuran_kb ?? null,
  });
}

// --- BPS ------------------------------------------------------------------
const sumberBps: SumberMakro[] = await Promise.all(
  BPS.map(async (x) => ({
    id: x.id,
    judul: x.judul,
    penerbit: "Badan Pusat Statistik",
    tahunTerbit: x.tahunTerbit,
    jenis: "bps" as const,
    href: `/api/sumber/bps/${encodeURIComponent(x.file)}`,
    dokId: null,
    indikator: [],
    ukuranKb: await ukuranKb(path.join(ROOT, "sumber", "bps", x.file)),
  })),
);

const sumber: SumberMakro[] = [...sumberProsn, ...sumberDokumen, ...sumberBps, ...BERITA];
const peta = new Map(sumber.map((s) => [s.id, s]));

// --- Validasi penilaian ---------------------------------------------------
const penilaian = await baca<Penilaian[]>(path.join(DIR_DATA, "penilaian.json"));

/** Semua indikator kerangka, dengan id jalur dan nilai kriteria. */
const indikator = new Map<string, { bobot: number; kriteria: Map<string, number> }>();
for (const kel of prosn.anak) {
  for (const prog of kel.anak ?? []) {
    for (const ind of prog.anak ?? []) {
      const id = `${kel.id}/${prog.id}/${ind.id}`;
      const kriteria = new Map<string, number>();
      for (const k of ind.anak ?? []) {
        const kode = (k.id.replace("kriteria-", "") || "").trim();
        const nilai = Number(/Nilai:\s*([\d,]+)/.exec(k.penjelasan)?.[1].replace(",", ".") ?? NaN);
        kriteria.set(kode, nilai);
      }
      indikator.set(id, { bobot: Math.round((ind.bobot ?? 0) * 100 * 100) / 100, kriteria });
    }
  }
}

if (penilaian.length !== indikator.size) {
  throw new Error(`penilaian.json memuat ${penilaian.length} baris, kerangka punya ${indikator.size} indikator`);
}
const dilihat = new Set<string>();
for (const p of penilaian) {
  const ind = indikator.get(p.indikator);
  if (!ind) throw new Error(`Indikator ${p.indikator} tidak ada di kerangka PROSN`);
  if (dilihat.has(p.indikator)) throw new Error(`Indikator ${p.indikator} dinilai dua kali`);
  dilihat.add(p.indikator);
  if (p.tahun !== TAHUN) throw new Error(`Tahun penilaian ${p.indikator} bukan ${TAHUN}`);
  if (p.kriteria === null) {
    if (p.nilai !== null) throw new Error(`${p.indikator}: kriteria null tetapi nilai tidak null`);
    if (p.bukti.length === 0 && !p.alasan.toLowerCase().includes("belum")) {
      throw new Error(`${p.indikator}: tanpa bukti harus beralasan "belum"`);
    }
  } else {
    const nilai = ind.kriteria.get(p.kriteria);
    if (nilai == null) throw new Error(`${p.indikator}: kriteria ${p.kriteria} tidak ada di kerangka`);
    if (Math.abs(nilai - (p.nilai ?? NaN)) > 1e-9) {
      throw new Error(`${p.indikator}: nilai ${p.nilai} tidak sama dengan kerangka (${nilai})`);
    }
    if (p.bukti.length === 0) throw new Error(`${p.indikator}: kriteria ${p.kriteria} tanpa bukti`);
  }
  for (const b of p.bukti) {
    if (!peta.has(b.sumber)) throw new Error(`${p.indikator}: sumber ${b.sumber} tidak ada di daftar sumber`);
    if (b.sumber.startsWith("bps-") && b.halaman == null) {
      throw new Error(`${p.indikator}: bukti ${b.sumber} harus menyebut halaman`);
    }
  }
}

await writeFile(path.join(DIR_DATA, "sumber.json"), `${JSON.stringify(sumber, null, 2)}\n`);

const jumlah = (k: string) => penilaian.filter((x) => x.indikator.split("/")[0] === k).length;
console.log(`sumber: ${sumber.length} (${sumberProsn.length} prosn, ${sumberDokumen.length} dokumen aplikasi, ${sumberBps.length} BPS, ${BERITA.length} berita)`);
console.log(`penilaian: ${penilaian.length} indikator (${penilaian.filter((x) => x.kriteria === null).length} belum ada bukti)`);
console.log(
  ["a-penanggulangan-kemiskinan", "b-ketahanan-pangan", "c-kesehatan-untuk-semua", "d-perluasan-akses-pendidikan", "e-pertumbuhan-ekonomi"]
    .map((k) => `${k.split("-")[0].toUpperCase()}=${jumlah(k)}`)
    .join(", "),
);
