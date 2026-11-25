/**
 * Presentation helpers for the Kinerja Makro views: number formatting per
 * unit, short source labels, page links, and the per-indicator summary the
 * cards, tables and exports all share. Client-safe (no disk, no React).
 */
import type { DataMakro, IndikatorMakro, NilaiMakro, SlugMakro, SumberMakro } from "./makro";
import { capaian, kategori, laju, lajuBaik, terkini, type Kategori } from "./makro-hitung";

/* ------------------------------------------------------------- Formatting */

const dec = (n: number, d: number) => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

/** A value split into number and unit, so the number can be set large. */
export function bagianNilai(nilai: number, satuan: string, indikator?: SlugMakro): { angka: string; satuan: string; awalan?: string } {
  switch (satuan) {
    case "%":
      return { angka: dec(nilai, 2), satuan: "%" };
    case "indeks":
      return { angka: dec(nilai, indikator === "gini" ? 3 : 2), satuan: "" };
    case "rupiah":
      return { awalan: "Rp", angka: dec(nilai / 1e6, 2), satuan: "jt" };
    case "ribu rupiah":
      return { awalan: "Rp", angka: dec(nilai / 1e3, 2), satuan: "jt" };
    case "juta rupiah":
      return { awalan: "Rp", angka: dec(nilai, 2), satuan: "jt" };
    case "juta rupiah/kapita/tahun":
      return { awalan: "Rp", angka: dec(nilai, 2), satuan: "jt/thn" };
    case "rupiah/kapita/bulan":
      return { awalan: "Rp", angka: Math.round(nilai).toLocaleString("id-ID"), satuan: "/kapita/bln" };
    case "ribu jiwa":
      return { angka: dec(nilai, 2), satuan: "rb jiwa" };
    case "juta jiwa":
      return { angka: dec(nilai, 2), satuan: "jt jiwa" };
    case "tahun":
      return { angka: dec(nilai, 2), satuan: "thn" };
    default:
      return { angka: dec(nilai, 2), satuan };
  }
}

/** One-line value: "5,15%", "Rp 55,87 jt", "0,297". */
export function fmtNilai(nilai: number | null | undefined, satuan: string, indikator?: SlugMakro): string {
  if (nilai == null || Number.isNaN(nilai)) return "–";
  const b = bagianNilai(nilai, satuan, indikator);
  const s = b.satuan === "%" ? `${b.angka}%` : b.satuan ? `${b.angka} ${b.satuan}` : b.angka;
  return b.awalan ? `${b.awalan} ${s}` : s;
}

/** Signed percentage: "+13,19%", "−9,95%". */
export function fmtLaju(l: number | null | undefined, d = 2): string {
  if (l == null || Number.isNaN(l)) return "–";
  return `${l > 0 ? "+" : l < 0 ? "−" : "±"}${dec(Math.abs(l), d)}%`;
}

export const fmtPersen = (p: number | null | undefined, d = 1) => (p == null || Number.isNaN(p) ? "–" : `${dec(p, d)}%`);

/** Everything to a common base (rupiah, jiwa) so series of different printed units share one axis. */
export function keDasar(n: { nilai: number; satuan: string }): number {
  if (n.satuan === "juta rupiah" || n.satuan === "juta jiwa") return n.nilai * 1e6;
  if (n.satuan === "ribu rupiah" || n.satuan === "ribu jiwa") return n.nilai * 1e3;
  return n.nilai;
}
/** The unit `keDasar` lands on. */
export function satuanDasar(satuan: string): string {
  if (satuan === "juta rupiah" || satuan === "ribu rupiah") return "rupiah";
  if (satuan === "juta jiwa" || satuan === "ribu jiwa") return "jiwa";
  return satuan;
}

/** Range target ("rentang 3,90–4,06") as printed in the RPJMD, when the stored value is its midpoint. */
export function rentangTarget(n: NilaiMakro | undefined): string | null {
  const m = n?.catatan ? /rentang\s+([\d.,]+\s*[–-]\s*[\d.,]+)/.exec(n.catatan) : null;
  return m ? m[1].replace(/\s+/g, "") : null;
}

/* ---------------------------------------------------------------- Sources */

/** Same rule as hrefHalaman in makro.ts (server-only there): PDFs get a #page anchor. */
export function hrefHalaman(s: SumberMakro, halaman: number | null): string {
  const pdf = s.jenis === "rpjmd" || /\.pdf($|[?#])/i.test(s.href);
  if (halaman == null || !pdf) return s.href;
  return `${s.href.split("#")[0]}#page=${halaman}`;
}

export function penerbitPendek(s: SumberMakro): string {
  if (s.jenis === "rpjmd") return "RPJMD";
  if (s.jenis === "dokumen") return "Dok. OPD";
  if (/Tulang Bawang Barat/.test(s.penerbit)) return "BPS Tubaba";
  if (/Lampung/.test(s.penerbit)) return "BPS Lampung";
  return "BPS RI";
}

export function judulPendek(s: SumberMakro): string {
  if (s.jenis === "rpjmd") return "RPJMD 2025–2029";
  if (s.jenis === "dokumen") return s.judul.replace(/\.(xlsx|xls|pdf|docx?)$/i, "").replace(/_/g, " ").replace(/^Kabupaten Tulang Bawang Barat /, "").replace(/^File /, "").replace(/\s*\(\d+\)$/, "").trim();
  return s.judul
    .replace(/^BRS:.*?(Maret|September) (\d{4}).*$/, "BRS Gini $1 $2")
    .replace(/^Produk Domestik Regional Bruto/, "PDRB")
    .replace(/\s*\(Statistical Yearbook.*\)$/, "")
    .replace(/Kabupaten\/Kota Provinsi Lampung/, "Kab/Kota")
    .replace(/Kabupaten Tulang Bawang Barat:?\s*/g, "")
    .replace(/Provinsi Lampung\s*/g, "")
    .replace(/Tahun (\d{4})/, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** "BPS Tubaba · Dalam Angka 2026 · hlm. 566" */
export function labelSumber(s: SumberMakro, halaman?: number | null): string {
  return [penerbitPendek(s) === "RPJMD" ? null : penerbitPendek(s), judulPendek(s), halaman != null ? `hlm. ${halaman}` : null].filter(Boolean).join(" · ");
}

export const NAMA_PENDEK: Record<SlugMakro, string> = {
  pertumbuhan_ekonomi: "Pertumbuhan Ekonomi",
  tpt: "TPT",
  kemiskinan: "Kemiskinan",
  ipm: "IPM",
  gini: "Gini",
  pdrb_per_kapita: "PDRB/kapita",
};

export type KelompokSumber = { nama: string; sumber: SumberMakro[] };

/** Sources grouped by publisher, BPS first from the kabupaten up, then the Pemkab's own documents. */
export function kelompokSumber(sumber: SumberMakro[], jumlah: Map<string, number>): KelompokSumber[] {
  const urut = ["BPS Kabupaten Tulang Bawang Barat", "BPS Provinsi Lampung", "BPS", "Pemkab Tulang Bawang Barat: RPJMD & dokumen OPD"];
  const peta = new Map<string, SumberMakro[]>();
  for (const s of sumber) {
    const k = s.jenis === "bps" ? s.penerbit : urut[3];
    peta.set(k, [...(peta.get(k) ?? []), s]);
  }
  return [...peta.entries()]
    .sort((a, b) => (urut.indexOf(a[0]) + 1 || 99) - (urut.indexOf(b[0]) + 1 || 99))
    .map(([nama, list]) => ({
      nama,
      sumber: list.sort((a, b) => (jumlah.get(b.id) ?? 0) - (jumlah.get(a.id) ?? 0) || (b.tahunTerbit ?? 0) - (a.tahunTerbit ?? 0)),
    }));
}

/** How many values each source supplies (optionally for one indicator). */
export function jumlahPerSumber(nilai: NilaiMakro[], slug?: SlugMakro): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of nilai) if (!slug || n.indikator === slug) m.set(n.sumber, (m.get(n.sumber) ?? 0) + 1);
  return m;
}

/* ---------------------------------------------------------------- Summary */

export type Ringkas = {
  ind: IndikatorMakro;
  tahun: number;
  realisasi?: NilaiMakro;
  lalu?: NilaiMakro;
  target?: NilaiMakro;
  /** True when the latest realisation is older than the year asked for (Gini). */
  tertinggal: boolean;
  laju: number | null;
  baik: boolean | null;
  capaian: number | null;
  kategori: Kategori | null;
  /** Capaian of the older realisation against this year's target, for the tooltip only. */
  capaianIndikatif: number | null;
  lampung?: NilaiMakro;
  nasional?: NilaiMakro;
};

export function ringkas(data: Pick<DataMakro, "nilai">, ind: IndikatorMakro, tahun: number): Ringkas {
  const t = terkini(data.nilai, ind.slug, tahun);
  // terkini falls back to an earlier target; only this year's target counts for capaian.
  const target = t.target?.tahun === tahun ? t.target : undefined;
  const tertinggal = !!t.realisasi && t.realisasi.tahun < tahun;
  const l = t.realisasi && t.lalu ? laju(t.realisasi.nilai, t.lalu.nilai) : null;
  const cap = t.realisasi && target && !tertinggal ? capaian(t.realisasi.nilai, target.nilai, ind.polaritas) : null;
  const banding = (w: "lampung" | "nasional") =>
    data.nilai.find((x) => x.indikator === ind.slug && x.wilayah === w && x.jenis === "realisasi" && x.komponen === null && x.tahun === (t.realisasi?.tahun ?? tahun));
  return {
    ind,
    tahun,
    realisasi: t.realisasi,
    lalu: t.lalu,
    target,
    tertinggal,
    laju: l,
    baik: l == null ? null : lajuBaik(l, ind.polaritas),
    capaian: cap,
    kategori: cap == null ? null : kategori(cap),
    capaianIndikatif: tertinggal && t.realisasi && target ? capaian(t.realisasi.nilai, target.nilai, ind.polaritas) : null,
    lampung: banding("lampung"),
    nasional: banding("nasional"),
  };
}

export function warnaKategori(k: Kategori | null): string | undefined {
  if (k === "Sangat Tinggi" || k === "Tinggi") return "var(--status-good)";
  if (k === "Sedang") return "var(--status-warning)";
  if (k) return "var(--status-serious)";
  return undefined;
}

export const RUMUS_LAJU = "Laju kinerja = (Tahun N − Tahun N-1) ÷ Tahun N-1 × 100%";
export const rumusCapaian = (p: "naik" | "turun") =>
  p === "naik" ? "Capaian = Realisasi ÷ Target × 100%" : "Capaian = (2 × Target − Realisasi) ÷ Target × 100% (indikator menurun, Permendagri 86/2017)";
export const PITA_KATEGORI = "Sangat Tinggi ≥91 · Tinggi 76–90 · Sedang 66–75 · Rendah 51–65 · Sangat Rendah ≤50";

export const TAHUN_PILIHAN = [2025, 2024, 2023];
