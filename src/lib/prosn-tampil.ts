/**
 * Presentation helpers for the Dukungan PROSN views: the kelompok/program
 * tree, the score split (earned / assessed but not earned / no evidence yet),
 * the "documents to upload" list, and source counts. Client-safe.
 */
import type { DataProsn, IndikatorProsn, PenilaianProsn } from "./prosn";
import { belumAdaBukti, kategoriProsn, skor, type KategoriProsn, type SaringanProsn } from "./prosn-hitung";

/** "PENANGGULANGAN KEMISKINAN" -> "Penanggulangan Kemiskinan"; the source prints groups in capitals. */
export const judulBiasa = (s: string) => (s.length > 4 && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()) : s);

export const kodeIndikator = (i: IndikatorProsn) => `${i.kelompokKode}.${i.kode}`;

export type ProgramProsn = { id: string; kode: string; nama: string; jalur: string; indikator: IndikatorProsn[] };
export type KelompokProsn = { id: string; kode: string; nama: string; jalur: string; program: ProgramProsn[] };

/** Kelompok -> program -> indikator, in source order. */
export function pohon(data: Pick<DataProsn, "indikator">): KelompokProsn[] {
  const hasil: KelompokProsn[] = [];
  for (const i of data.indikator) {
    let k = hasil.find((x) => x.id === i.kelompok);
    if (!k) hasil.push((k = { id: i.kelompok, kode: i.kelompokKode, nama: judulBiasa(i.kelompokNama), jalur: `/dashboard-pemdi/prosn/${i.kelompok}`, program: [] }));
    let p = k.program.find((x) => x.id === i.program);
    if (!p) k.program.push((p = { id: i.program, kode: i.programKode, nama: i.programNama, jalur: `/dashboard-pemdi/prosn/${i.kelompok}/${i.program}`, indikator: [] }));
    p.indikator.push(i);
  }
  return hasil;
}

export type RincianSkor = {
  /** Points earned with evidence. */
  terbukti: number;
  /** Bobot of assessed indicators that the chosen criteria did not earn. */
  hilang: number;
  /** Bobot of indicators with no evidence yet: unknown, not lost. */
  tanpaBukti: number;
  maks: number;
  /** Highest score reachable if every indicator without evidence turns out to be fully met. */
  potensi: number;
  capaian: number;
  kategori: KategoriProsn;
  dinilai: number;
  jumlah: number;
  nTanpaBukti: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function rincianSkor(data: Pick<DataProsn, "penilaian" | "indikator">, saring?: SaringanProsn): RincianSkor {
  const s = skor(data.penilaian, data.indikator, saring);
  const kosong = belumAdaBukti(data.penilaian, data.indikator, saring);
  const tanpaBukti = r2(kosong.reduce((a, x) => a + x.bobot, 0));
  return {
    terbukti: s.nilai,
    hilang: r2(Math.max(0, s.maks - tanpaBukti - s.nilai)),
    tanpaBukti,
    maks: s.maks,
    potensi: r2(Math.min(s.maks, s.nilai + tanpaBukti)),
    capaian: s.capaian,
    kategori: kategoriProsn(s.capaian),
    dinilai: s.dinilai,
    jumlah: s.jumlah,
    nTanpaBukti: kosong.length,
  };
}

export const penilaianDari = (data: Pick<DataProsn, "penilaian">, id: string): PenilaianProsn | undefined => data.penilaian.find((p) => p.indikator === id);

/** How many evidence citations each source supplies, optionally within one scope. */
export function jumlahPerSumberProsn(data: Pick<DataProsn, "penilaian" | "indikator">, saring?: (i: IndikatorProsn) => boolean): Map<string, number> {
  const ok = new Set(data.indikator.filter((i) => !saring || saring(i)).map((i) => i.id));
  const m = new Map<string, number>();
  for (const p of data.penilaian) if (ok.has(p.indikator)) for (const b of p.bukti) m.set(b.sumber, (m.get(b.sumber) ?? 0) + 1);
  return m;
}

export type GrupUnggah = { opd: string; indikator: { ind: IndikatorProsn; p?: PenilaianProsn }[]; bobot: number };

/**
 * Indicators without evidence grouped by their lead OPD (the first one named
 * on the programme), most points at stake first: what to upload, and where
 * the score can rise.
 */
export function perluUnggah(data: Pick<DataProsn, "penilaian" | "indikator">, saring?: SaringanProsn): GrupUnggah[] {
  const peta = new Map<string, GrupUnggah>();
  for (const ind of belumAdaBukti(data.penilaian, data.indikator, saring)) {
    const opd = ind.opd[0] ?? "OPD belum dipetakan";
    const g = peta.get(opd) ?? { opd, indikator: [], bobot: 0 };
    g.indikator.push({ ind, p: penilaianDari(data, ind.id) });
    g.bobot = r2(g.bobot + ind.bobot);
    peta.set(opd, g);
  }
  return [...peta.values()].sort((a, b) => b.bobot - a.bobot || a.opd.localeCompare(b.opd));
}

export function warnaProsn(k: KategoriProsn | null | undefined): string | undefined {
  if (k === "Sangat Tinggi" || k === "Tinggi") return "var(--status-good)";
  if (k === "Sedang") return "var(--status-warning)";
  if (k) return "var(--status-serious)";
  return undefined;
}

const dec = (n: number, d = 2) => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
/** Points: "33,50"; whole numbers stay short only when asked. */
export const fmtSkor = (n: number | null | undefined, d = 2) => (n == null ? "–" : dec(n, d));
export const fmtPoinProsn = (n: number | null | undefined) => (n == null ? "–" : `${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`);
export const fmtPersenProsn = (n: number | null | undefined, d = 2) => (n == null ? "–" : `${dec(n, d)}%`);

export const RUMUS_PROSN = "Skor indikator = nilai kriteria terpenuhi (a = bobot penuh). Capaian = skor ÷ bobot maksimum × 100%; total maksimum 100 poin.";
export const INFO_BATAS_BAWAH =
  "Skor ini batas bawah: indikator yang belum punya bukti dihitung 0 karena dokumennya belum diunggah, bukan karena kegiatannya tidak dilakukan. Unggah dokumennya agar dapat dinilai.";
export const INFO_STATUS = "Dinilai AI dari dokumen yang tersedia, belum diverifikasi oleh penilai manusia.";
