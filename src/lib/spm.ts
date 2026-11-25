/**
 * Data layer untuk dasbor "Capaian SPM" (Standar Pelayanan Minimal,
 * Permendagri 59/2021): daftar jenis layanan yang menjadi kewenangan
 * kabupaten/kota, nilai capaiannya, dan sumbernya.
 *
 * Berkas nilai/sumber dihasilkan oleh scripts/spm-bangun.ts dari
 * src/data/spm/ekstraksi.json (ekstraksi tangan) dan sumber/spm/*.
 * Bentuk sumber sengaja memakai SumberMakro yang sama dengan dasbor makro.
 *
 * Modul ini khusus server (membaca JSON dari disk), tanpa React.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SumberMakro } from "@/lib/makro";
import { spm as kerangkaSpm } from "@/data/kerangka/spm";

export type SumberSpm = SumberMakro;

export type LayananSpm = {
  /** Simpul daun di src/data/kerangka/spm.ts. */
  id: string;
  /** Simpul bidang (1-6). */
  bidang: string;
  bidangNama: string;
  /** Kode bidang menurut Permendagri 59/2021 ("1".."6"). */
  kode: string | null;
  judul: string;
  kewenangan: "kabupaten" | "provinsi";
  /** Jalur halaman kerangka: /dashboard-pemdi/spm/<bidang>/<cabang>/<layanan>. */
  jalur: string;
  opd: string[];
};

export type NilaiSpm = {
  /** null = nilai tingkat bidang atau kabupaten. */
  layanan: string | null;
  bidang: string | null;
  tahun: number;
  jenis: "sasaran" | "terlayani" | "capaian" | "indeks";
  nilai: number;
  satuan: string;
  wilayah: "tubaba" | "lampung";
  sumber: string;
  halaman: number | null;
  lokasi: string;
  kutipan: string;
  catatan: string | null;
  terverifikasi: boolean;
};

export type DataSpm = {
  tahunUtama: number;
  layanan: LayananSpm[];
  nilai: NilaiSpm[];
  sumber: SumberSpm[];
};

/**
 * Susun daftar layanan dari kerangka SPM, supaya id, judul, dan jalur selalu
 * sama dengan pohon yang ditampilkan. Cabang "provinsi" tetap didaftarkan
 * (kewenangan "provinsi") sebagai referensi; data Tubaba hanya untuk
 * kewenangan kabupaten.
 */
function susunLayanan(): LayananSpm[] {
  const hasil: LayananSpm[] = [];
  for (const bidang of kerangkaSpm.anak) {
    for (const cabang of bidang.anak ?? []) {
      for (const daun of cabang.anak ?? []) {
        hasil.push({
          id: daun.id,
          bidang: bidang.id,
          bidangNama: bidang.judul,
          kode: bidang.kode ?? null,
          judul: daun.judul,
          kewenangan: cabang.id === "provinsi" ? "provinsi" : "kabupaten",
          jalur: `/dashboard-pemdi/spm/${bidang.id}/${cabang.id}/${daun.id}`,
          opd: daun.opd ?? cabang.opd ?? bidang.opd ?? [],
        });
      }
    }
  }
  return hasil;
}

const LAYANAN = susunLayanan();
const DIR = path.join(process.cwd(), "src", "data", "spm");
let cache: DataSpm | null = null;

export async function muatSpm(): Promise<DataSpm> {
  if (cache) return cache;
  const [nilai, sumber] = await Promise.all([
    readFile(path.join(DIR, "nilai.json"), "utf8").then((t) => JSON.parse(t) as NilaiSpm[]),
    readFile(path.join(DIR, "sumber.json"), "utf8").then((t) => JSON.parse(t) as SumberSpm[]),
  ]);
  cache = { tahunUtama: 2025, layanan: LAYANAN, nilai, sumber };
  return cache;
}
