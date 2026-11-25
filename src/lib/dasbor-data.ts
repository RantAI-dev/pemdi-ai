/** Everything the Indeks dashboards show, gathered once per request. */
import { ASPEK, INDIKATOR } from "@/data/pemdi";
import { getOpd, getSurveiPerIndikator, getSurveiTotal } from "@/lib/data";
import { llmConfigured } from "@/lib/llm";
import { getPipeline } from "@/lib/ringkasan";
import type { DasborData } from "@/app/dasbor";

export async function muatDasbor(): Promise<DasborData> {
  const [p, opd, survei, perInd] = await Promise.all([getPipeline(), getOpd(), getSurveiTotal(), getSurveiPerIndikator()]);
  const data: DasborData = {
    llm: llmConfigured(),
    lakehouse: survei.tersedia,
    aspek: ASPEK,
    indikator: INDIKATOR.map((i) => {
      const n = p.penilaian.find((x) => x.indikator_no === i.no);
      return { ...i, nilai: n?.nilai ?? null, penilai: n?.penilai ?? null, penjelasan: n?.penjelasan ?? "", jawaban: perInd.get(i.no)?.terjawab ?? 0 };
    }),
    temuan: p.temuan,
    kebutuhan: p.kebutuhan.map((k) => ({
      id: k.id,
      indikator: k.indikator,
      nama: k.nama,
      status: k.status,
      pemilik: k.pemilik,
      lingkup: k.lingkup,
      tingkat: k.tingkat,
      diminta: k.diminta,
      belum: k.belum,
      opdBukti: [...new Set(k.bukti.map((b) => b.opd))],
      berkas: k.bukti.length,
    })),
    dok: p.dok.map((d) => ({ id: d.id, opd: d.opd, jenis: d.jenis, metode: d.metode, terbaca: d.karakter > 80, ai: d.ai?.status ?? null, jenisDokumen: d.ai?.jenis_dokumen ?? "" })),
    metrik: p.dok.flatMap((d) => (d.ai?.status === "selesai" ? d.ai.metrik.map((m) => ({ ...m, opd: d.opd, berkas: d.nama })) : [])),
    opd: opd.map((o) => ({ opd: o.opd, status: o.status, pertanyaan: o.pertanyaan, terjawab: o.terjawab })),
  };
  return data;
}
