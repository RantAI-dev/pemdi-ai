/**
 * Hitungan murni untuk dasbor Capaian SPM. Tidak menyentuh disk atau React,
 * sehingga bisa dipakai di komponen klien.
 *
 * Rumus capaian mengikuti laporan SPM (Permendagri 59/2021):
 * capaian % = jumlah terlayani / jumlah sasaran x 100, dengan target 100%.
 * Bila laporan sudah mencantumkan capaian, angka laporan dipakai apa adanya.
 */
import type { NilaiSpm } from "./spm";

export type CapaianLayanan = {
  sasaran?: number;
  terlayani?: number;
  capaian?: number;
};

/** Hitung dari sekumpulan baris yang sudah disaring ke satu layanan dan tahun. */
function dariBaris(baris: NilaiSpm[]): CapaianLayanan {
  const sasaran = baris.find((x) => x.jenis === "sasaran")?.nilai;
  const terlayani = baris.find((x) => x.jenis === "terlayani")?.nilai;
  // Satu jenis layanan bisa dipecah menjadi beberapa sub-indikator di tabel
  // sumber (mis. "rawan-bencana"), sehingga capaiannya rata-rata dari baris
  // yang dilaporkan.
  const dilaporkan = baris.filter((x) => x.jenis === "capaian").map((x) => x.nilai);
  const dariSasaran = sasaran != null && sasaran > 0 && terlayani != null ? (terlayani / sasaran) * 100 : undefined;
  const capaian = dilaporkan.length ? dilaporkan.reduce((a, b) => a + b, 0) / dilaporkan.length : dariSasaran;
  return { sasaran, terlayani, capaian };
}

/**
 * Capaian satu jenis layanan pada satu tahun. Bila laporan memuat angka
 * capaian, angka itu yang dipakai; bila tidak, dihitung dari terlayani/sasaran.
 */
export function capaianLayanan(nilai: NilaiSpm[], layananId: string, tahun: number): CapaianLayanan {
  const semua = nilai.filter((x) => x.layanan === layananId && x.tahun === tahun);
  const tubaba = semua.filter((x) => x.wilayah === "tubaba");
  return dariBaris(tubaba.length ? tubaba : semua);
}

/**
 * Capaian satu bidang pada satu tahun: indeks bidang yang dilaporkan bila ada,
 * jika tidak rata-rata capaian jenis layanan di bidang itu.
 */
export function capaianBidang(nilai: NilaiSpm[], bidangId: string, tahun: number): number | null {
  const dilaporkan = nilai.find((x) => x.layanan === null && x.bidang === bidangId && x.tahun === tahun && x.jenis === "indeks" && x.wilayah === "tubaba");
  if (dilaporkan) return dilaporkan.nilai;
  const layanan = [...new Set(nilai.filter((x) => x.bidang === bidangId && x.layanan !== null && x.wilayah === "tubaba").map((x) => x.layanan as string))];
  const capaian = layanan.map((id) => capaianLayanan(nilai, id, tahun).capaian).filter((x): x is number => x != null);
  return capaian.length ? capaian.reduce((a, b) => a + b, 0) / capaian.length : null;
}

export type KategoriSpm = "Tuntas" | "Hampir tuntas" | "Belum tuntas";

/**
 * Pita kategori capaian SPM.
 *
 * Laporan (Perbup 18/2026 Tabel 2.105) hanya mencantumkan nama kategori
 * "Tuntas Pratama", "Tuntas Madya", dan "Tuntas Utama" tanpa ambang angka,
 * sehingga ambang tidak bisa disalin dari sumber. Sesuai kontrak dasbor,
 * dipakai pita: Tuntas = 100%, Hampir tuntas >= 90%, Belum tuntas < 90%.
 */
export function kategoriSpm(persen: number): KategoriSpm {
  if (persen >= 100) return "Tuntas";
  if (persen >= 90) return "Hampir tuntas";
  return "Belum tuntas";
}

export const PITA_KATEGORI_SPM = "Tuntas 100% · Hampir tuntas ≥90% · Belum tuntas <90%";

export type TitikSeriSpm = { tahun: number; capaian: number | null; sasaran?: number; terlayani?: number };

/** Deret capaian satu layanan menurut tahun, urut naik, untuk satu wilayah. */
export function seriLayanan(nilai: NilaiSpm[], layananId: string, wilayah: NilaiSpm["wilayah"] = "tubaba"): TitikSeriSpm[] {
  const tahun = [...new Set(nilai.filter((x) => x.layanan === layananId && x.wilayah === wilayah).map((x) => x.tahun))].sort((a, b) => a - b);
  return tahun.map((t) => {
    const { sasaran, terlayani, capaian } = dariBaris(nilai.filter((x) => x.layanan === layananId && x.tahun === t && x.wilayah === wilayah));
    return { tahun: t, capaian: capaian ?? null, sasaran, terlayani };
  });
}
