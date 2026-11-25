/**
 * Short labels for the Pemkab documents behind Capaian SPM and Dukungan PROSN
 * (perbup, perda, kepbup, RKPD, APBD, LAKIP, LKPD, OPD uploads, BPS, news),
 * and the grouping of the source list. Client-safe (no disk, no React).
 */
import type { SumberMakro } from "./makro";
import { hrefHalaman } from "./makro-tampil";

/**
 * Link to a cited page. Besides the PDFs hrefHalaman already knows, documents
 * served from /api/dokumen are mostly PDFs too; a #page fragment is harmless on
 * the few that are not (DOCX/XLSX download, images ignore it).
 */
export function hrefSumber(s: SumberMakro, halaman: number | null): string {
  if (halaman == null || /^https?:/.test(s.href)) return s.href;
  if (s.href.startsWith("/api/dokumen/")) return `${s.href.split("#")[0]}#page=${halaman}`;
  return hrefHalaman(s, halaman);
}

const SINGKATAN: [RegExp, string][] = [
  [/Perubahan Rencana Kerja Pemerintah Daerah\s*\(P-RKPD\)/i, "P-RKPD"],
  [/Perubahan Anggaran Pendapatan dan Belanja Daerah/i, "P-APBD"],
  [/Anggaran Pendapatan dan Belanja Daerah/i, "APBD"],
  [/Rencana Kerja Pemerintah Daerah/i, "RKPD"],
  [/Rencana Pembangunan Jangka Menengah Daerah/i, "RPJMD"],
  [/Laporan Akuntabilitas Kinerja Pemerintah Daerah/i, "LAKIP"],
  [/Laporan Keuangan Pemerintah Daerah/i, "LKPD"],
  [/Rencana Aksi Daerah Penerapan Standar Pelayanan Minimal/i, "RAD SPM"],
  [/Standar Pelayanan Minimal/i, "SPM"],
  [/Masyarakat Berpenghasilan Rendah/i, "MBR"],
  [/Bea Perolehan Hak atas Tanah dan Bangunan/i, "BPHTB"],
  [/Persetujuan Bangunan Gedung/i, "PBG"],
  [/Koperasi Desa\/Kelurahan Merah Putih/i, "Kopdes Merah Putih"],
  [/Tahun Anggaran/gi, ""],
];

function singkat(s: string): string {
  let t = s;
  for (const [re, ganti] of SINGKATAN) t = t.replace(re, ganti);
  return t
    .replace(/Kabupaten Tulang Bawang Barat/g, "")
    .replace(/\bTahun (\d{4})\s*[-–]\s*(\d{4})\b/g, "$1–$2")
    .replace(/\bTahun (\d{4})\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(di|pada|bagi)$/i, "");
}

/** "Perbup 18/2026 · RKPD 2027", "Kepbup 145/2025 · Satuan Tugas …", "LAKIP 2025", "BPS Tubaba · Dalam Angka 2026". */
export function judulDokumen(s: SumberMakro): string {
  if (s.jenis === "rpjmd") return "RPJMD 2025–2029";
  if (s.jenis === "bps") {
    const tubaba = /Tulang Bawang Barat/.test(s.judul + s.penerbit);
    const judul = s.judul.replace(/^Kabupaten Tulang Bawang Barat\s*/, "").replace(/\s*\(.*\)$/, "");
    return `${tubaba ? "BPS Tubaba" : /Lampung/.test(s.penerbit + s.judul) ? "BPS Lampung" : "BPS RI"} · ${judul}`;
  }
  const m = /^(Peraturan Bupati|Peraturan Daerah|Keputusan Bupati)(?: Kabupaten)?(?: Tulang Bawang Barat)? Nomor ([\w./]+)(?: Tahun (\d{4}))? tentang (.+)$/i.exec(s.judul);
  if (m) {
    const jenis = /^Peraturan Bupati/i.test(m[1]) ? "Perbup" : /^Peraturan Daerah/i.test(m[1]) ? "Perda" : "Kepbup";
    // Kepbup numbers are registry codes ("100.3.3.2/145/II.6/HK/2025"): keep the running number and the year.
    const kode = m[2].split("/");
    const no = kode.length > 1 ? kode[1] : m[2];
    const tahun = m[3] ?? (kode.length > 1 ? kode.at(-1) : "");
    return `${jenis} ${no}/${tahun} · ${singkat(m[4])}`;
  }
  // Same shape without "Nomor" (the RPJMD Perda is stored as a document elsewhere).
  return singkat(s.judul.replace(/\.(xlsx|xls|pdf|docx?)$/i, "").replace(/_/g, " "));
}

/** "Perbup 18/2026 · RKPD 2027 · hlm. 196" */
export function labelDokumen(s: SumberMakro, halaman?: number | null): string {
  return [judulDokumen(s), halaman != null && halaman > 0 ? `hlm. ${halaman}` : null].filter(Boolean).join(" · ");
}

export type JenisDokumen = "perencanaan" | "regulasi" | "opd" | "bps" | "berita";

/** Which kind of evidence a document is, for grouping the source list. */
export function jenisDokumen(s: SumberMakro): JenisDokumen {
  if (s.jenis === "bps") return "bps";
  if (/^https?:/.test(s.href)) return "berita";
  if (s.jenis === "rpjmd" || /Rencana Kerja|Anggaran Pendapatan|Akuntabilitas Kinerja|Laporan Keuangan|RKPD|APBD/i.test(s.judul)) return "perencanaan";
  if (/^(Peraturan|Keputusan)/i.test(s.judul) && !s.dokId) return "regulasi";
  return "opd";
}

export const NAMA_JENIS: Record<JenisDokumen, string> = {
  perencanaan: "Perencanaan, anggaran & laporan kinerja Pemkab",
  regulasi: "Peraturan & keputusan Bupati/Daerah",
  opd: "Dokumen unggahan OPD",
  bps: "Badan Pusat Statistik",
  berita: "Berita resmi Pemkab",
};

const URUT_JENIS: JenisDokumen[] = ["perencanaan", "regulasi", "opd", "bps", "berita"];

/** Sources grouped by kind, each group most-cited first. */
export function grupDokumen(sumber: SumberMakro[], jumlah: Map<string, number>): { nama: string; sumber: SumberMakro[] }[] {
  const peta = new Map<JenisDokumen, SumberMakro[]>();
  for (const s of sumber) {
    const j = jenisDokumen(s);
    peta.set(j, [...(peta.get(j) ?? []), s]);
  }
  return URUT_JENIS.filter((j) => peta.has(j)).map((j) => ({
    nama: NAMA_JENIS[j],
    sumber: peta.get(j)!.sort((a, b) => (jumlah.get(b.id) ?? 0) - (jumlah.get(a.id) ?? 0) || (b.tahunTerbit ?? 0) - (a.tahunTerbit ?? 0)),
  }));
}

/** Compact label for narrow cards: "RKPD 2027 · hlm. 197" (the regulation number dropped; the full name is in the tooltip). */
export function labelRingkas(s: SumberMakro, halaman?: number | null): string {
  const j = judulDokumen(s);
  const inti = /^(Perbup|Perda|Kepbup) [^·]+ · (.+)$/.exec(j)?.[2] ?? j;
  return [inti, halaman != null && halaman > 0 ? `hlm. ${halaman}` : null].filter(Boolean).join(" · ");
}
