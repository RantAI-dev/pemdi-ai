/**
 * Data layer untuk dasbor "Kinerja Makro": enam indikator makro Pemda,
 * nilainya, dan sumbernya. Berkas nilai/sumber dihasilkan oleh
 * scripts/makro-bangun.ts dari sumber/bps/* dan src/data/makro/rpjmd.json.
 *
 * Modul ini khusus server (membaca JSON dari disk), tanpa React.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

export type SlugMakro = "pertumbuhan_ekonomi" | "tpt" | "kemiskinan" | "ipm" | "gini" | "pdrb_per_kapita";

export type IndikatorMakro = {
  slug: SlugMakro;
  nama: string;
  namaLppd: string;
  satuan: string;
  polaritas: "naik" | "turun";
  jalur: string;
  komponen: { kode: string; nama: string; satuan: string }[];
};

export type SumberMakro = {
  id: string;
  judul: string;
  penerbit: string;
  tahunTerbit: number | null;
  jenis: "bps" | "rpjmd" | "dokumen";
  href: string;
  dokId: string | null;
  indikator: SlugMakro[];
  ukuranKb: number | null;
};

export type NilaiMakro = {
  indikator: SlugMakro;
  komponen: string | null;
  wilayah: "tubaba" | "lampung" | "nasional";
  tahun: number;
  jenis: "realisasi" | "target";
  nilai: number;
  satuan: string;
  sumber: string;
  halaman: number | null;
  lokasi: string;
  kutipan: string;
  catatan: string | null;
  terverifikasi: boolean;
};

export type DataMakro = {
  tahunUtama: number;
  indikator: IndikatorMakro[];
  nilai: NilaiMakro[];
  sumber: SumberMakro[];
};

/** Metadata tetap keenam indikator; jalur mengikuti src/data/kerangka/makro.ts. */
const INDIKATOR: IndikatorMakro[] = [
  {
    slug: "pertumbuhan_ekonomi",
    nama: "Pertumbuhan Ekonomi",
    namaLppd: "Laju Pertumbuhan Ekonomi",
    satuan: "%",
    polaritas: "naik",
    jalur: "/dashboard-pemdi/makro/pertumbuhan-ekonomi",
    komponen: [],
  },
  {
    slug: "tpt",
    nama: "Tingkat Pengangguran Terbuka (TPT)",
    namaLppd: "Laju Penurunan Angka Pengangguran",
    satuan: "%",
    polaritas: "turun",
    jalur: "/dashboard-pemdi/makro/tingkat-pengangguran-terbuka",
    komponen: [],
  },
  {
    slug: "kemiskinan",
    nama: "Angka Kemiskinan",
    namaLppd: "Laju Penurunan Angka Kemiskinan",
    satuan: "%",
    polaritas: "turun",
    jalur: "/dashboard-pemdi/makro/angka-kemiskinan",
    komponen: [
      { kode: "jumlah_penduduk_miskin", nama: "Jumlah Penduduk Miskin", satuan: "ribu jiwa" },
      { kode: "garis_kemiskinan", nama: "Garis Kemiskinan", satuan: "rupiah/kapita/bulan" },
    ],
  },
  {
    slug: "ipm",
    nama: "Indeks Pembangunan Manusia (IPM)",
    namaLppd: "Laju Pertumbuhan Indeks Pembangunan Manusia (IPM)",
    satuan: "indeks",
    polaritas: "naik",
    jalur: "/dashboard-pemdi/makro/indeks-pembangunan-manusia",
    komponen: [
      { kode: "uhh", nama: "Usia Harapan Hidup (UHH)", satuan: "tahun" },
      { kode: "hls", nama: "Harapan Lama Sekolah (HLS)", satuan: "tahun" },
      { kode: "rls", nama: "Rata-Rata Lama Sekolah (RLS)", satuan: "tahun" },
      { kode: "pengeluaran", nama: "Pengeluaran per Kapita Disesuaikan", satuan: "juta rupiah/kapita/tahun" },
    ],
  },
  {
    slug: "gini",
    nama: "Gini Ratio / Indeks Ketimpangan",
    namaLppd: "Penurunan Tingkat Ketimpangan Pendapatan",
    satuan: "indeks",
    polaritas: "turun",
    jalur: "/dashboard-pemdi/makro/gini-ratio",
    komponen: [],
  },
  {
    slug: "pdrb_per_kapita",
    nama: "PDRB per Kapita (ADHB)",
    namaLppd: "Laju Pertumbuhan Pendapatan per Kapita",
    satuan: "rupiah",
    polaritas: "naik",
    jalur: "/dashboard-pemdi/makro/pendapatan-per-kapita",
    komponen: [{ kode: "adhk", nama: "PDRB per Kapita ADHK 2010", satuan: "ribu rupiah" }],
  },
];

const DIR = path.join(process.cwd(), "src", "data", "makro");
let cache: DataMakro | null = null;

export async function muatMakro(): Promise<DataMakro> {
  if (cache) return cache;
  const [nilai, sumber] = await Promise.all([
    readFile(path.join(DIR, "nilai.json"), "utf8").then((t) => JSON.parse(t) as NilaiMakro[]),
    readFile(path.join(DIR, "sumber.json"), "utf8").then((t) => JSON.parse(t) as SumberMakro[]),
  ]);
  cache = { tahunUtama: 2025, indikator: INDIKATOR, nilai, sumber };
  return cache;
}

/** Tautan sumber + jangkar halaman untuk PDF; berkas non-PDF dikembalikan apa adanya. */
export function hrefHalaman(s: SumberMakro, halaman: number | null): string {
  const pdf = s.jenis === "rpjmd" || /\.pdf($|[?#])/i.test(s.href);
  if (halaman == null || !pdf) return s.href;
  return `${s.href.split("#")[0]}#page=${halaman}`;
}
