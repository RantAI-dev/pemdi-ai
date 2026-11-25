/** Shapes the survey tables into what the /opd view draws. Pure, so it runs anywhere. */
import type { Opd } from "@/lib/data";

// The four themes every technical OPD answers; other prefixes belong to one form each.
export const TEMA = [
  { kode: "t1", label: "Layanan prioritas", pendek: "Layanan" },
  { kode: "t2", label: "Proses bisnis", pendek: "Proses" },
  { kode: "t3", label: "Aplikasi", pendek: "Aplikasi" },
  { kode: "t4", label: "Kepuasan pengguna", pendek: "Kepuasan" },
  { kode: "", label: "Khusus / sektoral", pendek: "Khusus" },
];

export type Sel = { n: number; ya: number } | null;
export type BarisOpd = Pick<Opd, "opd" | "status" | "pertanyaan" | "terjawab" | "dokumen"> & { tema: Sel[] };
export type DataOpd = {
  opd: BarisOpd[];
  tema: { label: string; pendek: string; n: number; ya: number; opd: number }[];
  jenis: { nama: string; terbaca: number; tanpa: number; n: number }[];
};

const indeksTema = (kode: string) => {
  const i = TEMA.findIndex((t) => t.kode === kode);
  return i < 0 ? TEMA.length - 1 : i;
};

export function susunOpd(opd: Opd[], tema: { opd: string; tema: string; n: number; ya: number }[], dok: { jenis: string; karakter: number }[]): DataOpd {
  const baris: BarisOpd[] = opd.map((o) => {
    const sel: Sel[] = TEMA.map(() => null);
    for (const t of tema.filter((x) => x.opd === o.opd)) {
      const i = indeksTema(t.tema);
      const s = sel[i] ?? { n: 0, ya: 0 };
      sel[i] = { n: s.n + t.n, ya: s.ya + t.ya };
    }
    return { opd: o.opd, status: o.status, pertanyaan: o.pertanyaan, terjawab: o.terjawab, dokumen: o.dokumen, tema: sel };
  });
  const perTema = TEMA.map((t, i) => {
    const sel = baris.map((b) => b.tema[i]).filter((s): s is NonNullable<Sel> => s != null);
    return { label: t.label, pendek: t.pendek, n: sel.reduce((s, x) => s + x.n, 0), ya: sel.reduce((s, x) => s + x.ya, 0), opd: sel.length };
  });
  const jenis = [...new Set(dok.map((d) => d.jenis || "lain"))]
    .map((j) => {
      const semua = dok.filter((d) => (d.jenis || "lain") === j);
      const terbaca = semua.filter((d) => d.karakter > 80).length;
      return { nama: j, terbaca, tanpa: semua.length - terbaca, n: semua.length };
    })
    .sort((a, b) => b.n - a.n);
  return { opd: baris, tema: perTema, jenis };
}
