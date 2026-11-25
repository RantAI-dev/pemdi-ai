/**
 * Data layer untuk dasbor "Dukungan PROSN" (dukungan daerah terhadap Prioritas
 * Nasional / Program Strategis Nasional): 65 indikator pada kerangka
 * src/data/kerangka/prosn.ts, penilaian kriteria a/b/c-nya, dan sumber bukti.
 *
 * Berkas penilaian disusun tangan di src/data/prosn/penilaian.json (setiap bukti
 * menyebut dokumen, halaman/lokasi, dan kutipan yang benar-benar dibaca).
 * Daftar sumber dihasilkan oleh scripts/prosn-bangun.ts menjadi
 * src/data/prosn/sumber.json dari sumber/prosn/manifest.json, data/dokumen.json,
 * dan sumber/bps.
 *
 * Bentuk sumber sengaja memakai SumberMakro yang sama dengan dasbor makro.
 *
 * Catatan id: id simpul pada kerangka PROSN berulang antarkelompok (mis.
 * "indikator-1-1" ada di kelompok A, B, C, D, dan E) karena id hanya unik di
 * antara saudara. Agar penilaian bisa disambungkan tanpa salah pasang, `id` di
 * sini adalah id simpul yang diberi jalur lengkap
 * ("a-penanggulangan-kemiskinan/program-1/indikator-1-1"), dan `jalur` adalah
 * URL halaman kerangkanya. Nilai `PenilaianProsn.indikator` memakai id yang sama.
 *
 * Modul ini khusus server (membaca JSON dari disk), tanpa React.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SumberMakro } from "@/lib/makro";
import { prosn as kerangkaProsn } from "@/data/kerangka/prosn";

export type SumberProsn = SumberMakro;

/**
 * Kode kriteria. Kerangka memuat opsi "d" pada 8 indikator (mis. capaian
 * <50%), jadi kode tidak dibatasi a/b/c seperti tabel sumber pada umumnya.
 */
export type KodeKriteria = "a" | "b" | "c" | "d";

export type KriteriaProsn = { kode: KodeKriteria; teks: string; nilai: number };

export type IndikatorProsn = {
  /** Id simpul kerangka yang diberi jalur lengkap; unik di seluruh pohon. */
  id: string;
  kode: string;
  judul: string;
  /** Id simpul kelompok (mis. "a-penanggulangan-kemiskinan"). */
  kelompok: string;
  kelompokKode: string;
  kelompokNama: string;
  /** Id simpul program di dalam kelompok (mis. "program-1"). */
  program: string;
  programKode: string;
  programNama: string;
  /** Bobot indikator dalam poin dari 100 (mis. 1,5). */
  bobot: number;
  dasarHukum: string;
  /** Jalur halaman kerangka: /dashboard-pemdi/prosn/<kelompok>/<program>/<indikator>. */
  jalur: string;
  opd: string[];
  kriteria: KriteriaProsn[];
};

export type BuktiProsn = {
  /** SumberProsn.id */
  sumber: string;
  halaman: number | null;
  lokasi: string;
  kutipan: string;
};

export type PenilaianProsn = {
  /** IndikatorProsn.id */
  indikator: string;
  tahun: number;
  kriteria: KodeKriteria | null;
  nilai: number | null;
  alasan: string;
  bukti: BuktiProsn[];
  penilai: "AI";
  terverifikasi: boolean;
};

export type DataProsn = {
  tahunUtama: number;
  indikator: IndikatorProsn[];
  penilaian: PenilaianProsn[];
  sumber: SumberProsn[];
};

/** "Dasar hukum: Inpres ..." -> "Inpres ..." */
function dasarHukum(penjelasan: string): string {
  return penjelasan.replace(/^Dasar hukum:\s*/i, "").replace(/\.$/, "").trim();
}

/** "Nilai: 1,50. Skor pilihan kriteria ini, bukan bobot." -> 1.5 */
function nilaiKriteria(penjelasan: string): number {
  const angka = /Nilai:\s*([\d.,]+)/i.exec(penjelasan)?.[1] ?? "";
  return Number(angka.replace(/\./g, "").replace(",", "."));
}

/** "a. Terdapat ..." -> "Terdapat ..." */
function teksKriteria(judul: string): string {
  return judul.replace(/^[a-d]\.\s*/i, "").trim();
}

function susunIndikator(): IndikatorProsn[] {
  const hasil: IndikatorProsn[] = [];
  for (const kelompok of kerangkaProsn.anak) {
    for (const program of kelompok.anak ?? []) {
      for (const ind of program.anak ?? []) {
        hasil.push({
          id: `${kelompok.id}/${program.id}/${ind.id}`,
          kode: ind.kode ?? "",
          judul: ind.judul,
          kelompok: kelompok.id,
          kelompokKode: kelompok.kode ?? "",
          kelompokNama: kelompok.judul,
          program: program.id,
          programKode: program.kode ?? "",
          programNama: program.judul,
          bobot: Math.round((ind.bobot ?? 0) * 100 * 100) / 100,
          dasarHukum: dasarHukum(ind.penjelasan),
          jalur: `/dashboard-pemdi/prosn/${kelompok.id}/${program.id}/${ind.id}`,
          opd: ind.opd ?? program.opd ?? kelompok.opd ?? [],
          kriteria: (ind.anak ?? []).map((k) => ({
            kode: k.id.replace("kriteria-", "") as KodeKriteria,
            teks: teksKriteria(k.judul),
            nilai: nilaiKriteria(k.penjelasan),
          })),
        });
      }
    }
  }
  return hasil;
}

const INDIKATOR = susunIndikator();
const DIR = path.join(process.cwd(), "src", "data", "prosn");
const TAHUN_UTAMA = 2025;
let cache: DataProsn | null = null;

export async function muatProsn(): Promise<DataProsn> {
  if (cache) return cache;
  const [penilaian, sumber] = await Promise.all([
    readFile(path.join(DIR, "penilaian.json"), "utf8").then((t) => JSON.parse(t) as PenilaianProsn[]),
    readFile(path.join(DIR, "sumber.json"), "utf8").then((t) => JSON.parse(t) as SumberProsn[]),
  ]);
  cache = { tahunUtama: TAHUN_UTAMA, indikator: INDIKATOR, penilaian, sumber };
  return cache;
}
