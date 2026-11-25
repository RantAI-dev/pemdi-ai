/**
 * Documents already read by the AI, grouped by the Indeks Pemdi indicator
 * they mention. A file counts for an indicator when the AI found a finding or
 * a metric for it, or when the file satisfies a data requirement of it.
 *
 * Only read documents are listed: an unread file is not evidence yet.
 */
import { KEBUTUHAN_BY_ID } from "@/data/kebutuhan";
import { readDok } from "./store";

export type DokBukti = {
  id: string;
  nama: string;
  judul: string;
  opd: string;
  jenis: string;
  /** Findings that name the indicator. */
  temuan: number;
  /** Reported numbers that name the indicator. */
  metrik: number;
  /** Data requirements of the indicator this file satisfies. */
  kebutuhan: string[];
};

export async function dokumenPerIndikator(): Promise<Map<number, DokBukti[]>> {
  const dok = await readDok();
  const out = new Map<number, DokBukti[]>();

  for (const d of dok) {
    if (d.ai?.status !== "selesai") continue;
    const per = new Map<number, { temuan: number; metrik: number }>();
    const tambah = (no: number, bidang: "temuan" | "metrik") => {
      const n = per.get(no) ?? { temuan: 0, metrik: 0 };
      n[bidang]++;
      per.set(no, n);
    };

    for (const t of d.ai.temuan) tambah(t.indikator, "temuan");
    for (const m of d.ai.metrik) if (m.indikator != null) tambah(m.indikator, "metrik");
    for (const id of d.ai.kebutuhan) {
      const no = KEBUTUHAN_BY_ID.get(id)?.indikator;
      if (no != null) per.set(no, per.get(no) ?? { temuan: 0, metrik: 0 });
    }

    for (const [no, n] of per) {
      const list = out.get(no) ?? [];
      list.push({
        id: d.id,
        nama: d.nama,
        judul: d.ai.judul,
        opd: d.opd,
        jenis: d.ai.jenis_dokumen,
        temuan: n.temuan,
        metrik: n.metrik,
        kebutuhan: d.ai.kebutuhan.filter((id) => KEBUTUHAN_BY_ID.get(id)?.indikator === no),
      });
      out.set(no, list);
    }
  }

  for (const list of out.values()) list.sort((a, b) => b.temuan - a.temuan || a.nama.localeCompare(b.nama));
  return out;
}
