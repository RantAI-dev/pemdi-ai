/** What the pipeline has produced so far, summarised for the dashboards. */
import { ASPEK, INDIKATOR, hitungIndeks } from "@/data/pemdi";
import { hitungKebutuhan, type HasilKebutuhan } from "./kebutuhan";
import { readPenilaian, type Penilaian } from "./penilaian";
import { readDok, type Dok, type Temuan } from "./store";

export type TemuanDok = Temuan & { opd: string; nama: string; id: string };

export async function getPipeline() {
  const [dok, kebutuhan, penilaian] = await Promise.all([readDok(), hitungKebutuhan(), readPenilaian()]);
  const terbaca = dok.filter((d) => d.karakter > 80);
  const selesai = dok.filter((d) => d.ai?.status === "selesai");
  const temuan: TemuanDok[] = selesai.flatMap((d) => d.ai!.temuan.map((t) => ({ ...t, opd: d.opd, nama: d.nama, id: d.id })));
  const hasil = hitungIndeks(penilaian.map((p) => ({ indikator: p.indikator_no, nilai: p.nilai })));
  return {
    dok,
    kebutuhan,
    penilaian,
    temuan,
    hasil,
    angka: {
      dokumen: dok.length,
      terbaca: terbaca.length,
      ocr: dok.filter((d) => d.metode === "ocr").length,
      tanpaTeks: dok.length - terbaca.length,
      dibacaAi: selesai.length,
      menungguAi: terbaca.length - selesai.length,
      gagalAi: dok.filter((d) => d.ai?.status === "gagal").length,
      temuan: temuan.length,
      metrik: selesai.reduce((s, d) => s + d.ai!.metrik.length, 0),
      dinilai: penilaian.length,
      dinilaiAi: penilaian.filter((p) => p.penilai === "AI").length,
    },
  };
}

export type Pipeline = Awaited<ReturnType<typeof getPipeline>>;

/** Per indicator: its score, the findings behind it, and how many of its data requirements are still open. */
export function perIndikator(p: { kebutuhan: HasilKebutuhan[]; penilaian: Penilaian[]; temuan: TemuanDok[]; dok: Dok[] }) {
  return INDIKATOR.map((i) => {
    const butuh = p.kebutuhan.filter((k) => k.indikator === i.no);
    return {
      ...i,
      aspekNama: ASPEK.find((a) => a.no === i.aspek)!.nama,
      nilai: p.penilaian.find((x) => x.indikator_no === i.no) ?? null,
      temuan: p.temuan.filter((t) => t.indikator === i.no).length,
      butuh: butuh.length,
      terpenuhi: butuh.filter((k) => k.status === "terpenuhi").length,
      belum: butuh.filter((k) => k.status === "belum_ada").length,
    };
  });
}
