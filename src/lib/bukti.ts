/** The evidence behind one indicator: survey answers and supporting files mapped to it. */
import { indikatorUntukKode } from "@/data/pemdi";
import { KEBUTUHAN } from "@/data/kebutuhan";
import { query, tableRef } from "./lakehouse";
import { readDok, type Temuan } from "./store";

export type Jawaban = { opd: string; kode: string; jenis: string; pertanyaan: string; jawaban: string };
export type Berkas = { id: string; opd: string; nama: string; jenis: string; terbaca: boolean; dibacaAi: boolean; ringkasan: string; temuan: Temuan[] };

export async function getBuktiIndikator(no: number): Promise<{ jawaban: Jawaban[]; berkas: Berkas[] }> {
  const n = String(Math.trunc(no));
  const [s, dok] = await Promise.all([
    query(
      `SELECT opd, kode, jenis, pertanyaan, jawaban FROM ${tableRef("pemdi_survei")}
       WHERE indikator_no = '${n}' AND dijawab = 'ya' ORDER BY kode, opd LIMIT 400`,
    ),
    readDok(),
  ]);
  // A file belongs to an indicator when the AI found evidence for it there, when it meets one of the
  // indicator's data requirements, or (not read by the AI yet) when it answers a survey question mapped to it.
  const butuh = new Set(KEBUTUHAN.filter((k) => k.indikator === no).map((k) => k.id));
  const d = dok.filter((x) =>
    x.ai?.status === "selesai"
      ? x.ai.temuan.some((t) => t.indikator === no) || x.ai.kebutuhan.some((id) => butuh.has(id))
      : indikatorUntukKode(x.kode).includes(no),
  );
  const str = (v: unknown) => (v == null ? "" : String(v));
  return {
    jawaban: s.rows.map((r) => ({ opd: str(r.opd), kode: str(r.kode), jenis: str(r.jenis), pertanyaan: str(r.pertanyaan), jawaban: str(r.jawaban) })),
    berkas: d.map((x) => ({
      id: x.id,
      opd: x.opd,
      nama: x.nama,
      jenis: x.jenis,
      terbaca: x.karakter > 80,
      dibacaAi: x.ai?.status === "selesai",
      ringkasan: x.ai?.ringkasan ?? "",
      temuan: x.ai?.status === "selesai" ? x.ai.temuan.filter((t) => t.indikator === no) : [],
    })),
  };
}
