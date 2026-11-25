/**
 * Kebutuhan data: for each item of the catalogue, is it in hand, and if not,
 * who still owes it.
 *
 * A file counts for an item when the AI read it and said so. A file the AI
 * has not read yet is matched by the survey question it was submitted for,
 * or by the item's keywords in its name and opening text, and is marked as
 * such ("terdeteksi"), because that match is a guess.
 */
import { KEBUTUHAN, type Kebutuhan } from "@/data/kebutuhan";
import { query, tableRef } from "./lakehouse";
import { readDok, readTeks, type Dok } from "./store";

export type StatusKebutuhan = "terpenuhi" | "sebagian" | "perlu_dicek" | "belum_ada";

export type BuktiKebutuhan = { id: string; nama: string; opd: string; dasar: "ai" | "terdeteksi"; terbaca: boolean };

export type HasilKebutuhan = Kebutuhan & {
  status: StatusKebutuhan;
  bukti: BuktiKebutuhan[];
  /** OPD scope only: OPDs asked for the item, and those among them with no file for it. */
  diminta: string[];
  belum: string[];
};

/** OCR text often loses its spaces, so a keyword is also tried with optional whitespace. */
function cocok(re: RegExp, text: string): boolean {
  if (re.test(text)) return true;
  const loose = new RegExp(re.source.replace(/\\b/g, "").replace(/ /g, "\\s*"), re.flags);
  return loose.test(text);
}

/** Synchronous on purpose: thousands of awaits in one render overflow React dev's async tracking. */
function cocokDok(k: Kebutuhan, d: Dok, kepala: string): "ai" | "terdeteksi" | null {
  if (d.ai?.status === "selesai") return d.ai.kebutuhan.includes(k.id) ? "ai" : null;
  if (d.kode && k.kode?.includes(d.kode)) return "terdeteksi";
  return cocok(k.kata, `${d.nama}\n${kepala}`) ? "terdeteksi" : null;
}

/** Which OPDs were asked each survey question (As-Is questions are requests for a document). */
async function dimintaPerKode(): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  try {
    const r = await query(`SELECT kode, opd FROM ${tableRef("pemdi_survei")} WHERE jenis = 'As-Is' ORDER BY opd LIMIT 2000`);
    for (const row of r.rows) {
      const kode = String(row.kode);
      out.set(kode, [...(out.get(kode) ?? []), String(row.opd)]);
    }
  } catch {
    // Lakehouse unreachable: OPD-scope items fall back to the OPDs that did submit.
  }
  return out;
}

export async function hitungKebutuhan(): Promise<HasilKebutuhan[]> {
  const [dok, diminta] = await Promise.all([readDok(), dimintaPerKode()]);
  // Only the title area is searched: a keyword deep in a long report is a mention, not the document.
  const kepala = new Map<string, string>();
  await Promise.all(dok.filter((d) => d.ai?.status !== "selesai" && d.karakter > 0).map(async (d) => kepala.set(d.id, (await readTeks(d.id)).slice(0, 1500))));

  const out: HasilKebutuhan[] = [];
  for (const k of KEBUTUHAN) {
    const bukti: BuktiKebutuhan[] = [];
    for (const d of dok) {
      const dasar = cocokDok(k, d, kepala.get(d.id) ?? "");
      if (dasar) bukti.push({ id: d.id, nama: d.nama, opd: d.opd, dasar, terbaca: d.karakter > 80 });
    }
    const asked = [...new Set((k.kode ?? []).flatMap((c) => diminta.get(c) ?? []))].sort();
    const punya = new Set(bukti.map((b) => b.opd));
    const belum = k.lingkup === "opd" ? asked.filter((o) => !punya.has(o)) : [];

    let status: StatusKebutuhan;
    if (bukti.length === 0) status = "belum_ada";
    else if (k.lingkup === "opd" && asked.length) status = belum.length === 0 ? "terpenuhi" : "sebagian";
    else if (bukti.some((b) => b.terbaca)) status = bukti.some((b) => b.dasar === "ai") ? "terpenuhi" : "perlu_dicek";
    else status = "perlu_dicek";
    out.push({ ...k, status, bukti, diminta: asked, belum });
  }
  return out;
}
