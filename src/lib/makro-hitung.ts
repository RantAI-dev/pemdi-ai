/**
 * Hitungan murni untuk dasbor makro: laju kinerja, capaian terhadap target,
 * kategori capaian, dan pemilihan seri. Tidak menyentuh disk atau React,
 * sehingga bisa dipakai di komponen klien.
 */
import type { NilaiMakro, SlugMakro } from "./makro";

/** Laju kinerja (%) seperti rumus LPPD: (kini - lalu) / lalu x 100. */
export function laju(kini: number, lalu: number): number {
  return lalu === 0 ? 0 : ((kini - lalu) / lalu) * 100;
}

/** Apakah laju bergerak ke arah yang baik; null bila tidak ada perubahan. */
export function lajuBaik(l: number, polaritas: "naik" | "turun"): boolean | null {
  if (l === 0) return null;
  return polaritas === "naik" ? l > 0 : l < 0;
}

/**
 * Capaian realisasi terhadap target (%). Untuk indikator "turun" dipakai
 * praktik Permendagri 86/2017: (2 x target - realisasi) / target x 100.
 */
export function capaian(realisasi: number, target: number, polaritas: "naik" | "turun"): number {
  if (target === 0) return 0;
  return polaritas === "naik" ? (realisasi / target) * 100 : ((2 * target - realisasi) / target) * 100;
}

export type Kategori = "Sangat Tinggi" | "Tinggi" | "Sedang" | "Rendah" | "Sangat Rendah";

/** Ambang kategori capaian dari pedoman evaluasi kinerja. */
export function kategori(capaianPersen: number): Kategori {
  if (capaianPersen >= 91) return "Sangat Tinggi";
  if (capaianPersen >= 76) return "Tinggi";
  if (capaianPersen >= 66) return "Sedang";
  if (capaianPersen >= 51) return "Rendah";
  return "Sangat Rendah";
}

/** Satu seri menurut indikator, wilayah, jenis, dan komponen (null = indikator utama). */
export function seri(
  nilai: NilaiMakro[],
  indikator: SlugMakro,
  wilayah: "tubaba" | "lampung" | "nasional",
  jenis: "realisasi" | "target",
  komponen: string | null = null,
): { tahun: number; nilai: number; n: NilaiMakro }[] {
  return nilai
    .filter((x) => x.indikator === indikator && x.wilayah === wilayah && x.jenis === jenis && x.komponen === komponen)
    .sort((a, b) => a.tahun - b.tahun)
    .map((n) => ({ tahun: n.tahun, nilai: n.nilai, n }));
}

/**
 * Nilai terakhir yang tersedia sampai `tahun` untuk Tubaba, beserta target
 * tahun itu dan realisasi tahun sebelumnya (untuk laju). Bila realisasi tahun
 * itu belum ada, dipakai realisasi terakhir sebelumnya.
 */
export function terkini(
  nilai: NilaiMakro[],
  indikator: SlugMakro,
  tahun: number,
): { realisasi?: NilaiMakro; lalu?: NilaiMakro; target?: NilaiMakro } {
  const utama = nilai.filter((x) => x.indikator === indikator && x.wilayah === "tubaba" && x.komponen === null);
  const realisasi = utama
    .filter((x) => x.jenis === "realisasi" && x.tahun <= tahun)
    .sort((a, b) => b.tahun - a.tahun)[0];
  const target =
    utama.find((x) => x.jenis === "target" && x.tahun === tahun) ??
    utama.filter((x) => x.jenis === "target" && x.tahun <= tahun).sort((a, b) => b.tahun - a.tahun)[0];
  const lalu = realisasi ? utama.find((x) => x.jenis === "realisasi" && x.tahun === realisasi.tahun - 1) : undefined;
  return { realisasi, lalu, target };
}
