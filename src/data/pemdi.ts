/**
 * The structure of the Indeks Pemdi, from Lampiran Permen PANRB 8/2026
 * (Tabel 1, Tabel 4 and the index formulas of Bab II.B). The criteria text
 * of each maturity level lives in permen-kriteria.json, extracted from the
 * regulation by scripts/extract-permen.py.
 */
import kriteria from "./permen-kriteria.json";

export type Aspek = { no: number; nama: string; bobot: number };
export type Indikator = { no: number; aspek: number; nama: string; bobot: number };

export const ASPEK: Aspek[] = [
  { no: 1, nama: "Tata Kelola dan Manajemen", bobot: 0.1 },
  { no: 2, nama: "Penyelenggara", bobot: 0.1 },
  { no: 3, nama: "Data", bobot: 0.15 },
  { no: 4, nama: "Keamanan Pemdi", bobot: 0.15 },
  { no: 5, nama: "Teknologi Pemdi", bobot: 0.1 },
  { no: 6, nama: "Keterpaduan Layanan Digital Pemerintah", bobot: 0.15 },
  { no: 7, nama: "Kepuasan Pengguna Layanan Digital Pemerintah", bobot: 0.25 },
];

export const INDIKATOR: Indikator[] = [
  { no: 1, aspek: 1, bobot: 0.05, nama: "Tingkat Kematangan Tata Kelola Pemdi" },
  { no: 2, aspek: 1, bobot: 0.05, nama: "Tingkat Kematangan Manajemen Layanan Digital Pemerintah" },
  { no: 3, aspek: 2, bobot: 0.05, nama: "Tingkat Kematangan Sumber Daya Manusia Pemdi" },
  { no: 4, aspek: 2, bobot: 0.05, nama: "Tingkat Kematangan Kolaborasi Pemdi" },
  { no: 5, aspek: 3, bobot: 0.05, nama: "Tingkat Kematangan Tata Kelola Data" },
  { no: 6, aspek: 3, bobot: 0.03, nama: "Tingkat Kematangan Penyelenggaraan Informasi Geospasial" },
  { no: 7, aspek: 3, bobot: 0.03, nama: "Tingkat Kematangan Pembangunan Statistik" },
  { no: 8, aspek: 3, bobot: 0.04, nama: "Tingkat Kematangan Pelindungan Data Pribadi" },
  { no: 9, aspek: 4, bobot: 0.04, nama: "Tingkat Kematangan Pelaksanaan Audit Keamanan Pemdi dan Teknologi Pemdi" },
  { no: 10, aspek: 4, bobot: 0.04, nama: "Tingkat Kematangan Keamanan Pemdi" },
  { no: 11, aspek: 4, bobot: 0.03, nama: "Tingkat Kematangan Penerapan Kriptografi untuk Keamanan Data" },
  { no: 12, aspek: 4, bobot: 0.04, nama: "Tingkat Kematangan Kapabilitas Penanganan Insiden Siber" },
  { no: 13, aspek: 5, bobot: 0.05, nama: "Tingkat Kematangan Aplikasi Pemdi" },
  { no: 14, aspek: 5, bobot: 0.05, nama: "Tingkat Kematangan Infrastruktur Pemdi" },
  { no: 15, aspek: 6, bobot: 0.04, nama: "Keterpaduan Proses Bisnis Pemdi Lintas Unit dan Instansi" },
  { no: 16, aspek: 6, bobot: 0.04, nama: "Integrasi Aplikasi" },
  { no: 17, aspek: 6, bobot: 0.04, nama: "Portal Layanan Digital Pemerintah" },
  { no: 18, aspek: 6, bobot: 0.03, nama: "Interoperabilitas Data" },
  { no: 19, aspek: 7, bobot: 0.1, nama: "Fasilitas Dukungan Pengguna Layanan Digital Pemerintah" },
  { no: 20, aspek: 7, bobot: 0.15, nama: "Tingkat Pengelolaan Kepuasan Pengguna Layanan Digital Pemerintah" },
];

export type Predikat = { level: number; nama: string; label: string; min: number; max: number };

/** Tabel 4. A value on a boundary takes the higher predicate. */
export const PREDIKAT: Predikat[] = [
  { level: 1, nama: "Kurang", label: "Merintis / Initiate", min: 1, max: 1.5 },
  { level: 2, nama: "Cukup", label: "Membangun / Emerging", min: 1.5, max: 2.5 },
  { level: 3, nama: "Baik", label: "Berkembang / Developing", min: 2.5, max: 3.5 },
  { level: 4, nama: "Sangat Baik", label: "Melembaga / Embedded", min: 3.5, max: 4 },
  { level: 5, nama: "Memuaskan", label: "Unggul / Leading", min: 4, max: 5 },
];

export function predikat(nilai: number): Predikat {
  return [...PREDIKAT].reverse().find((p) => nilai >= p.min) ?? PREDIKAT[0];
}

export type KriteriaIndikator = {
  no: number;
  judul: string;
  deskripsi: string;
  tingkat: { level: number; kriteria: string }[];
};

export const KRITERIA = kriteria as KriteriaIndikator[];

export type Nilai = { indikator: number; nilai: number };

/**
 * Indeks aspek = sum(bobot indikator x nilai) / bobot aspek, and Indeks
 * Pemdi = sum(bobot aspek x indeks aspek). An aspect is only scored when
 * every one of its indicators has a value, and the index only when every
 * aspect is: a partial sum would read as a low score, not a missing one.
 *
 * `sementara` is the re-weighted average over only the indicators scored so
 * far, shown while scoring is incomplete; it equals `indeks` once complete.
 */
export function hitungIndeks(nilai: Nilai[]) {
  const byNo = new Map(nilai.map((n) => [n.indikator, n.nilai]));
  const aspek = ASPEK.map((a) => {
    const ind = INDIKATOR.filter((i) => i.aspek === a.no);
    const terisi = ind.filter((i) => byNo.has(i.no));
    const lengkap = terisi.length === ind.length;
    const indeks = lengkap ? ind.reduce((s, i) => s + i.bobot * byNo.get(i.no)!, 0) / a.bobot : null;
    const bobotTerisi = terisi.reduce((s, i) => s + i.bobot, 0);
    const sementara =
      terisi.length === 0
        ? null
        : terisi.reduce((s, i) => s + i.bobot * byNo.get(i.no)!, 0) / bobotTerisi;
    return { ...a, indeks, sementara, terisi: terisi.length, jumlah: ind.length };
  });
  const lengkap = aspek.every((a) => a.indeks != null);
  const indeks = lengkap ? aspek.reduce((s, a) => s + a.bobot * a.indeks!, 0) : null;
  const berSkor = aspek.filter((a) => a.sementara != null);
  const bobotSkor = berSkor.reduce((s, a) => s + a.bobot, 0);
  const sementara =
    berSkor.length === 0
      ? null
      : berSkor.reduce((s, a) => s + a.bobot * a.sementara!, 0) / bobotSkor;
  return { aspek, indeks, sementara, terisi: byNo.size, jumlah: INDIKATOR.length };
}

/**
 * Which indicators a survey question gives evidence for. This mapping is
 * Pemdi-AI's own reading of the question bank against the indicator
 * descriptions; the regulation does not define it.
 */
const KODE_INDIKATOR: [RegExp, number[]][] = [
  [/^t1_3$/, [18]],
  [/^t1_/, [17]],
  [/^t2_/, [15]],
  [/^t3_2$/, [17]],
  [/^t3_/, [16]],
  [/^t4_1$/, [19]],
  [/^t4_4$/, [19, 20]],
  [/^t4_/, [20]],
  [/^(kes|dik|eko)_1_/, [18, 5]],
  [/^(kes|dik|eko)_2_/, [17]],
  [/^ling_1_/, [16]],
  [/^ling_2_/, [6]],
  [/^pub_1_/, [16]],
  [/^pub_2_/, [15]],
  [/^pub_3_/, [16]],
  [/^pub_4_/, [17, 20]],
  [/^d1_/, [14]],
  [/^d2_/, [13]],
  [/^d3_2$/, [8]],
  [/^d3_3$/, [9, 12]],
  [/^d3_4$/, [12, 8]],
  [/^d3_/, [12, 10]],
  [/^d4_1$/, [18]],
  [/^d4_4$/, [5, 6, 7]],
  [/^d4_/, [5]],
  [/^b1_/, [1]],
  [/^b2_/, [1]],
  [/^b3_/, [5, 7]],
  [/^k1_/, [3]],
  [/^k2_/, [2]],
  [/^k3_1$/, [8]],
  [/^k3_/, [10]],
  [/^k4_/, [2]],
  [/^o1_/, [15]],
  [/^o2_2$/, [19]],
  [/^o2_4$/, [2, 19]],
  [/^o2_/, [2]],
  [/^o3_/, [4]],
];

export function indikatorUntukKode(kode: string): number[] {
  return KODE_INDIKATOR.find(([re]) => re.test(kode))?.[1] ?? [];
}
