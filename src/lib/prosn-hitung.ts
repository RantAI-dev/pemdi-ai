/**
 * Hitungan murni untuk dasbor Dukungan PROSN. Tidak menyentuh disk atau React,
 * sehingga bisa dipakai di komponen klien.
 *
 * Skor indikator = nilai kriteria yang dipilih (a = bobot penuh, b = sebagian,
 * c/d = 0 atau sebagian kecil), sedangkan maksimumnya adalah bobot indikator
 * (total 100 poin). Capaian = skor / maks x 100 untuk total, per kelompok, atau
 * per program.
 *
 * Catatan sumber: pada tabel INDIKATOR KINERJA PROSN, nilai kriteria a untuk
 * indikator A-1-7 (2,00) lebih besar daripada bobotnya (1,50). Nilai dibiarkan
 * apa adanya mengikuti sumber, sehingga capaian satu indikator bisa sedikit di
 * atas 100% dan total hanya melewati 100% bila hampir semua indikator bernilai a.
 * Angka itu tidak dipangkas agar inkonsistensi sumber tetap terlihat.
 */
import type { IndikatorProsn, PenilaianProsn } from "./prosn";

export type SaringanProsn = {
  /** Id simpul kelompok, mis. "a-penanggulangan-kemiskinan". */
  kelompok?: string;
  /** Id simpul program, mis. "program-1" (boleh digabung dengan kelompok). */
  program?: string;
};

export type SkorProsn = {
  /** Jumlah nilai kriteria yang dipilih. */
  nilai: number;
  /** Jumlah bobot indikator dalam lingkup saringan (poin dari 100). */
  maks: number;
  /** nilai / maks x 100; 0 bila maks 0. */
  capaian: number;
  /** Indikator yang sudah dinilai (kriteria bukan null). */
  dinilai: number;
  /** Indikator dalam lingkup saringan. */
  jumlah: number;
};

function dalamSaringan(ind: IndikatorProsn, saring?: SaringanProsn): boolean {
  if (!saring) return true;
  if (saring.kelompok && ind.kelompok !== saring.kelompok) return false;
  if (saring.program && ind.program !== saring.program) return false;
  return true;
}

/**
 * Skor satu lingkup: seluruh indikator (tanpa saringan), satu kelompok, atau
 * satu program. Indikator tanpa bukti tetap masuk `maks` (bobotnya dihitung)
 * tetapi tidak menambah `nilai`, sehingga capaian menggambarkan dukungan yang
 * benar-benar terbukti.
 */
export function skor(penilaian: PenilaianProsn[], indikator: IndikatorProsn[], saring?: SaringanProsn): SkorProsn {
  const dipakai = indikator.filter((x) => dalamSaringan(x, saring));
  const nilaiPer = new Map(penilaian.map((p) => [p.indikator, p]));
  let nilai = 0;
  let dinilai = 0;
  for (const ind of dipakai) {
    const p = nilaiPer.get(ind.id);
    if (p && p.kriteria !== null) {
      dinilai++;
      nilai += p.nilai ?? 0;
    }
  }
  const maks = Math.round(dipakai.reduce((a, x) => a + x.bobot, 0) * 100) / 100;
  const capaian = maks === 0 ? 0 : (nilai / maks) * 100;
  return { nilai: Math.round(nilai * 100) / 100, maks, capaian: Math.round(capaian * 100) / 100, dinilai, jumlah: dipakai.length };
}

export type KategoriProsn = "Sangat Tinggi" | "Tinggi" | "Sedang" | "Rendah" | "Sangat Rendah";

/**
 * Pita kategori capaian.
 *
 * Tabel INDIKATOR KINERJA PROSN tidak mencantumkan pita kategori, sehingga
 * dipakai pita evaluasi kinerja Permendagri 86/2017 yang juga dipakai dasbor
 * makro: >=91 Sangat Tinggi, 76–90 Tinggi, 66–75 Sedang, 51–65 Rendah,
 * <=50 Sangat Rendah.
 */
export function kategoriProsn(persen: number): KategoriProsn {
  if (persen >= 91) return "Sangat Tinggi";
  if (persen >= 76) return "Tinggi";
  if (persen >= 66) return "Sedang";
  if (persen >= 51) return "Rendah";
  return "Sangat Rendah";
}

export const PITA_KATEGORI_PROSN = "Sangat Tinggi ≥91% · Tinggi 76–90% · Sedang 66–75% · Rendah 51–65% · Sangat Rendah ≤50%";

/** Indikator yang belum punya bukti (kriteria null), urut seperti kerangka. */
export function belumAdaBukti(penilaian: PenilaianProsn[], indikator: IndikatorProsn[], saring?: SaringanProsn): IndikatorProsn[] {
  const kosong = new Set(penilaian.filter((p) => p.kriteria === null).map((p) => p.indikator));
  return indikator.filter((x) => kosong.has(x.id) && dalamSaringan(x, saring));
}
