/**
 * Presentation helpers for the Capaian SPM views: the six bidang, the
 * per-service/per-bidang/kabupaten summary for one year, kategori colours,
 * and source counts. Client-safe (no disk, no React).
 */
import type { DataSpm, LayananSpm, NilaiSpm } from "./spm";
import { capaianBidang, capaianLayanan, kategoriSpm, type KategoriSpm } from "./spm-hitung";
import { laju } from "./makro-hitung";

/** Years with a kabupaten SPM index (2019–2020 exist only for some bidang, from the RPJMD). */
export const TAHUN_SPM = [2025, 2024, 2023, 2022, 2021];
/** Columns of the services x years grid. */
export const TAHUN_PETA = [2021, 2022, 2023, 2024, 2025];

export const RUMUS_SPM = "Capaian = jumlah terlayani ÷ jumlah sasaran × 100%; target setiap jenis layanan 100% (Permendagri 59/2021).";
export const RUMUS_LAJU_SPM = "Laju = (Tahun N − Tahun N-1) ÷ Tahun N-1 × 100% (format LPPD)";
export const INFO_KATEGORI_SPM =
  "Pita kategori dasbor ini, bukan dari sumber: Tuntas 100% · Hampir tuntas ≥90% · Belum tuntas <90%. Sumber hanya mencantumkan label Tuntas Pratama/Madya/Utama tanpa ambang angka.";
export const INFO_JUMLAH_KOSONG = "Jumlah sasaran & terlayani belum tersedia — unggah Laporan Penerapan SPM / ekspor e-SPM per OPD.";

export type BidangSpm = { id: string; nama: string; kode: string | null; jalur: string; layanan: LayananSpm[]; opd: string[] };

/** Short names where the official bidang name does not fit a card or an axis. */
export const NAMA_BIDANG_PENDEK: Record<string, string> = {
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
  "pekerjaan-umum": "Pekerjaan Umum",
  "perumahan-rakyat": "Perumahan Rakyat",
  "trantibum-linmas": "Trantibum & Linmas",
  sosial: "Sosial",
};

export const layananKabupaten = (data: Pick<DataSpm, "layanan">) => data.layanan.filter((l) => l.kewenangan === "kabupaten");

/** The six bidang with their kabupaten services, in Permendagri order. */
export function daftarBidang(data: Pick<DataSpm, "layanan">): BidangSpm[] {
  const peta = new Map<string, BidangSpm>();
  for (const l of layananKabupaten(data)) {
    const b = peta.get(l.bidang) ?? { id: l.bidang, nama: l.bidangNama, kode: l.kode, jalur: `/dashboard-pemdi/spm/${l.bidang}`, layanan: [], opd: [] };
    b.layanan.push(l);
    for (const o of l.opd) if (!b.opd.includes(o)) b.opd.push(o);
    peta.set(l.bidang, b);
  }
  return [...peta.values()];
}

/* ------------------------------------------------------------- Rows */

export const barisLayanan = (nilai: NilaiSpm[], id: string, tahun: number) => nilai.filter((x) => x.layanan === id && x.tahun === tahun && x.jenis === "capaian" && x.wilayah === "tubaba");
export const barisIndeksBidang = (nilai: NilaiSpm[], bidang: string, tahun: number) =>
  nilai.find((x) => x.layanan === null && x.bidang === bidang && x.tahun === tahun && x.jenis === "indeks" && x.wilayah === "tubaba");
export const barisIndeksKab = (nilai: NilaiSpm[], tahun: number) => nilai.find((x) => x.layanan === null && x.bidang === null && x.tahun === tahun && x.jenis === "indeks" && x.wilayah === "tubaba");

/* ---------------------------------------------------------- Summaries */

export type RingkasSpm = {
  tahun: number;
  capaian: number | null;
  lalu: number | null;
  laju: number | null;
  /** Difference in percentage points from the year before. */
  selisih: number | null;
  kategori: KategoriSpm | null;
  /** The rows behind this year's figure (several for a service split in the source). */
  baris: NilaiSpm[];
  barisLalu: NilaiSpm[];
};

function susun(tahun: number, kini: number | null, lalu: number | null, baris: NilaiSpm[], barisLalu: NilaiSpm[]): RingkasSpm {
  return {
    tahun,
    capaian: kini,
    lalu,
    laju: kini != null && lalu != null ? laju(kini, lalu) : null,
    selisih: kini != null && lalu != null ? kini - lalu : null,
    kategori: kini == null ? null : kategoriSpm(kini),
    baris,
    barisLalu,
  };
}

export function ringkasLayanan(data: Pick<DataSpm, "nilai">, id: string, tahun: number): RingkasSpm {
  const kini = capaianLayanan(data.nilai, id, tahun).capaian ?? null;
  const lalu = capaianLayanan(data.nilai, id, tahun - 1).capaian ?? null;
  return susun(tahun, kini, lalu, barisLayanan(data.nilai, id, tahun), barisLayanan(data.nilai, id, tahun - 1));
}

export type RingkasBidangSpm = RingkasSpm & {
  /** True when the figure is the bidang index printed in the source, not a mean of its services. */
  dilaporkan: boolean;
  /** Plain mean of the services' capaian, to show when it differs from the printed index. */
  rataLayanan: number | null;
  /** Services with data below 100%. */
  dibawah: LayananSpm[];
  tanpaData: LayananSpm[];
};

export function ringkasBidang(data: Pick<DataSpm, "nilai" | "layanan">, bidang: string, tahun: number): RingkasBidangSpm {
  const kini = capaianBidang(data.nilai, bidang, tahun);
  const lalu = capaianBidang(data.nilai, bidang, tahun - 1);
  const i = barisIndeksBidang(data.nilai, bidang, tahun);
  const iLalu = barisIndeksBidang(data.nilai, bidang, tahun - 1);
  const layanan = layananKabupaten(data).filter((l) => l.bidang === bidang);
  const per = layanan.map((l) => ({ l, c: capaianLayanan(data.nilai, l.id, tahun).capaian }));
  const ada = per.filter((x) => x.c != null).map((x) => x.c as number);
  return {
    ...susun(tahun, kini, lalu, i ? [i] : [], iLalu ? [iLalu] : []),
    dilaporkan: !!i,
    rataLayanan: ada.length ? ada.reduce((a, b) => a + b, 0) / ada.length : null,
    dibawah: per.filter((x) => x.c != null && x.c < 100).map((x) => x.l),
    tanpaData: per.filter((x) => x.c == null).map((x) => x.l),
  };
}

export type RingkasKabSpm = RingkasSpm & { labelSumber: string | null };

/** The kabupaten SPM index and the label the source gives it ("Tuntas Utama"). */
export function ringkasKab(data: Pick<DataSpm, "nilai">, tahun: number): RingkasKabSpm {
  const n = barisIndeksKab(data.nilai, tahun);
  const l = barisIndeksKab(data.nilai, tahun - 1);
  return { ...susun(tahun, n?.nilai ?? null, l?.nilai ?? null, n ? [n] : [], l ? [l] : []), labelSumber: labelKategoriSumber(n) };
}

/** "Kategori per tahun menurut sumber: 2021 Tuntas Pratama, …" -> the label for this row's year. */
export function labelKategoriSumber(n: NilaiSpm | undefined): string | null {
  if (!n?.catatan) return null;
  return new RegExp(`${n.tahun} (Tuntas \\w+)`).exec(n.catatan)?.[1] ?? null;
}

/** Capaian of one service per year. */
export function seriLayananSpm(data: Pick<DataSpm, "nilai">, id: string, tahun: number[]): { tahun: number; nilai: number | null }[] {
  return tahun.map((t) => ({ tahun: t, nilai: capaianLayanan(data.nilai, id, t).capaian ?? null }));
}
/** Bidang index per year (reported, else mean of services). */
export function seriBidangSpm(data: Pick<DataSpm, "nilai">, bidang: string, tahun: number[]): { tahun: number; nilai: number | null }[] {
  return tahun.map((t) => ({ tahun: t, nilai: capaianBidang(data.nilai, bidang, t) }));
}
export function seriKabSpm(data: Pick<DataSpm, "nilai">, tahun: number[]): { tahun: number; nilai: number | null }[] {
  return tahun.map((t) => ({ tahun: t, nilai: barisIndeksKab(data.nilai, t)?.nilai ?? null }));
}

/** All years any row exists for, ascending (2019–2025). */
export const tahunAda = (nilai: NilaiSpm[], saring: (n: NilaiSpm) => boolean = () => true) => [...new Set(nilai.filter(saring).map((n) => n.tahun))].sort((a, b) => a - b);

/* ------------------------------------------------------------- Display */

export function warnaSpm(k: KategoriSpm | null | undefined): string | undefined {
  if (k === "Tuntas") return "var(--status-good)";
  if (k === "Hampir tuntas") return "var(--status-warning)";
  if (k === "Belum tuntas") return "var(--status-serious)";
  return undefined;
}

const dec = (n: number, d: number) => n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
/** "96,59%"; whole hundreds print as "100%". */
export const fmtSpm = (p: number | null | undefined, d = 2) => (p == null || Number.isNaN(p) ? "–" : p === 100 ? "100%" : `${dec(p, d)}%`);
export const fmtPoin = (p: number | null | undefined) => (p == null ? "–" : `${p > 0 ? "+" : p < 0 ? "−" : "±"}${dec(Math.abs(p), 2)} poin`);

/** How many rows each source supplies, optionally within one bidang or one service. */
export function jumlahPerSumberSpm(nilai: NilaiSpm[], saring: (n: NilaiSpm) => boolean = () => true): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of nilai) if (saring(n)) m.set(n.sumber, (m.get(n.sumber) ?? 0) + 1);
  return m;
}

/** "Pelayanan Pencegahan dan Kesiapsiagaan…" — the sub-row name after the dash of a split service. */
export const namaSubBaris = (n: NilaiSpm) => (n.catatan ? /\(\d\/\d\):\s*([^.]+)/.exec(n.catatan)?.[1] ?? null : null);
