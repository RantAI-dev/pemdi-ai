/**
 * Bangun ulang src/data/makro/{nilai,sumber}.json.
 *
 * Sumber angka:
 *   - sumber/bps/manifest.json + sumber/bps/nilai.json (angka BPS apa adanya)
 *   - src/data/makro/rpjmd.json (ekstraksi tangan dari Perda RPJMD 2025–2029)
 *   - data/dokumen.json (metadata dokumen aplikasi yang relevan)
 *
 * Jalankan dari akar repo: bun run scripts/makro-bangun.ts
 */
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NilaiMakro, SlugMakro, SumberMakro } from "../src/lib/makro";

type Wilayah = NilaiMakro["wilayah"];
type Jenis = NilaiMakro["jenis"];

type Manifest = {
  file: string;
  judul: string;
  penerbit: string;
  tahun_terbit?: number | null;
  indikator?: SlugMakro[];
};

type BpsNilai = {
  indikator: SlugMakro;
  komponen: string | null;
  wilayah: Wilayah;
  tahun: number;
  nilai: number;
  satuan: string;
  file: string;
  lokasi: string;
  kutipan: string;
  catatan?: string;
};

type Rpjmd = {
  sumber: {
    id: string;
    judul: string;
    penerbit: string;
    tahunTerbit: number | null;
    dokId: string;
    ukuranKb: number | null;
  };
  nilai: Omit<NilaiMakro, "sumber" | "terverifikasi">[];
};

type Dok = { id: string; opd: string; nama: string; jenis: string; ukuran_kb: number };

const ROOT = process.cwd();
const DIR_BPS = path.join(ROOT, "sumber", "bps");
const DIR_MAKRO = path.join(ROOT, "src", "data", "makro");
const SEMUA: SlugMakro[] = ["pertumbuhan_ekonomi", "tpt", "kemiskinan", "ipm", "gini", "pdrb_per_kapita"];
const TANPA_GINI = SEMUA.filter((x) => x !== "gini");

const URUT: Record<SlugMakro, number> = {
  pertumbuhan_ekonomi: 1,
  tpt: 2,
  kemiskinan: 3,
  ipm: 4,
  gini: 5,
  pdrb_per_kapita: 6,
};
const URUT_WILAYAH: Record<Wilayah, number> = { tubaba: 1, lampung: 2, nasional: 3 };
const URUT_JENIS: Record<Jenis, number> = { realisasi: 1, target: 2 };

const baca = async <T>(berkas: string): Promise<T> => JSON.parse(await readFile(berkas, "utf8")) as T;

async function ukuranKb(berkas: string): Promise<number | null> {
  try {
    return Math.round((await stat(berkas)).size / 1024);
  } catch {
    return null;
  }
}

/** Ambil nomor halaman PDF dari lokasi BPS; utamakan "PDF hlm. N". */
function halamanDariLokasi(lokasi: string): number | null {
  const pdf = /PDF\s+hlm\.\s*(\d+)/i.exec(lokasi);
  if (pdf) return Number(pdf[1]);
  const cetak = /hlm\.\s*(\d+)/i.exec(lokasi);
  return cetak ? Number(cetak[1]) : null;
}

function rapikan(teks: string): string {
  return teks.replace(/\s+/g, " ").trim();
}

const manifest = await baca<Manifest[]>(path.join(DIR_BPS, "manifest.json"));
const nilaiBps = await baca<BpsNilai[]>(path.join(DIR_BPS, "nilai.json"));
const rpjmd = await baca<Rpjmd>(path.join(DIR_MAKRO, "rpjmd.json"));
const dokumen = await baca<Dok[]>(path.join(ROOT, "data", "dokumen.json"));

// --- Sumber BPS ---------------------------------------------------------- //
const sumberBps: SumberMakro[] = await Promise.all(
  manifest.map(async (m) => ({
    id: m.file.replace(/\.pdf$/i, ""),
    judul: m.judul,
    penerbit: m.penerbit,
    tahunTerbit: m.tahun_terbit ?? null,
    jenis: "bps" as const,
    href: `/api/sumber/bps/${encodeURIComponent(m.file)}`,
    dokId: null,
    indikator: m.indikator ?? [],
    ukuranKb: await ukuranKb(path.join(DIR_BPS, m.file)),
  })),
);

// --- Sumber RPJMD -------------------------------------------------------- //
const sumberRpjmd: SumberMakro = {
  id: rpjmd.sumber.id,
  judul: rpjmd.sumber.judul,
  penerbit: rpjmd.sumber.penerbit,
  tahunTerbit: rpjmd.sumber.tahunTerbit,
  jenis: "rpjmd",
  href: `/api/dokumen/${rpjmd.sumber.dokId}/berkas`,
  dokId: rpjmd.sumber.dokId,
  indikator: SEMUA,
  ukuranKb: rpjmd.sumber.ukuranKb,
};

// --- Sumber dokumen aplikasi lain --------------------------------------- //
type Tambahan = { id: string; tahunTerbit: number | null; indikator: SlugMakro[] };
const TAMBAHAN: Tambahan[] = [
  { id: "a210a82e0fe7", tahunTerbit: 2025, indikator: SEMUA }, // RPJPD 2025–2045
  { id: "0d8194ee8ee9", tahunTerbit: 2024, indikator: TANPA_GINI }, // TBB Dalam Angka 2024
  { id: "2c43fa2aa3ee", tahunTerbit: 2023, indikator: TANPA_GINI }, // TBB Dalam Angka 2023
  { id: "523fd0fd2a02", tahunTerbit: 2022, indikator: TANPA_GINI }, // TBB Dalam Angka 2022
  { id: "8db52c98b82f", tahunTerbit: null, indikator: SEMUA }, // template MAKRO & IKK
];

const sumberDokumen: SumberMakro[] = [];
for (const t of TAMBAHAN) {
  const d = dokumen.find((x) => x.id === t.id);
  if (!d) continue;
  sumberDokumen.push({
    id: d.id,
    judul: d.nama,
    penerbit: d.opd,
    tahunTerbit: t.tahunTerbit,
    jenis: "dokumen",
    href: `/api/dokumen/${d.id}/berkas`,
    dokId: d.id,
    indikator: t.indikator,
    ukuranKb: d.ukuran_kb ?? null,
  });
}

// --- Nilai BPS ----------------------------------------------------------- //
// ADHB adalah angka utama PDRB per kapita; ADHK disimpan sebagai komponen.
const nilaiDariBps: NilaiMakro[] = nilaiBps.map((x) => ({
  indikator: x.indikator,
  komponen: x.indikator === "pdrb_per_kapita" && x.komponen === "adhb" ? null : x.komponen,
  wilayah: x.wilayah,
  tahun: x.tahun,
  jenis: "realisasi",
  nilai: x.nilai,
  satuan: x.satuan,
  sumber: x.file.replace(/\.pdf$/i, ""),
  halaman: halamanDariLokasi(x.lokasi),
  lokasi: x.lokasi,
  kutipan: rapikan(x.kutipan),
  catatan: x.catatan?.trim() ? rapikan(x.catatan) : null,
  terverifikasi: false,
}));

// --- Nilai RPJMD --------------------------------------------------------- //
const nilaiDariRpjmd: NilaiMakro[] = rpjmd.nilai.map((x) => ({
  ...x,
  lokasi: rapikan(x.lokasi),
  kutipan: rapikan(x.kutipan),
  catatan: x.catatan ? rapikan(x.catatan) : null,
  sumber: rpjmd.sumber.id,
  terverifikasi: false,
}));

const nilai = [...nilaiDariBps, ...nilaiDariRpjmd].sort(
  (a, b) =>
    URUT[a.indikator] - URUT[b.indikator] ||
    (a.komponen ?? "").localeCompare(b.komponen ?? "") ||
    URUT_WILAYAH[a.wilayah] - URUT_WILAYAH[b.wilayah] ||
    a.tahun - b.tahun ||
    URUT_JENIS[a.jenis] - URUT_JENIS[b.jenis],
);

const sumber = [...sumberBps, sumberRpjmd, ...sumberDokumen];

await writeFile(path.join(DIR_MAKRO, "nilai.json"), `${JSON.stringify(nilai, null, 2)}\n`);
await writeFile(path.join(DIR_MAKRO, "sumber.json"), `${JSON.stringify(sumber, null, 2)}\n`);

const per = (k: string) => nilai.filter((x) => x.indikator === k).length;
console.log(`nilai: ${nilai.length} (${SEMUA.map((k) => `${k}=${per(k)}`).join(", ")})`);
console.log(`sumber: ${sumber.length} (${sumber.filter((s) => s.jenis === "bps").length} BPS, 1 RPJMD, ${sumberDokumen.length} dokumen)`);
