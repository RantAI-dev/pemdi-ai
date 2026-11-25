/**
 * Maturity scores per indicator: entered by hand, or estimated by the AI from
 * the pipeline's findings. Kept in data/penilaian.json (what the app reads)
 * and copied to the `pemdi_penilaian` lakehouse table by src/lib/sinkron.ts.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type Penilaian = {
  indikator_no: number;
  nilai: number;
  penjelasan: string;
  penilai: "AI" | "Manual";
  diperbarui: string;
};

const FILE = path.join(process.cwd(), "data", "penilaian.json");
let writing: Promise<unknown> = Promise.resolve();

export async function readPenilaian(): Promise<Penilaian[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Penilaian[];
  } catch {
    return [];
  }
}

/** Save one score, or clear it with `nilai: null`. `sync` copies the result to the lakehouse in the background. */
export function savePenilaian(input: { indikator_no: number; nilai: number | null; penjelasan: string; penilai: "AI" | "Manual" }, sync = true): Promise<Penilaian[]> {
  const next = writing.then(async () => {
    const rest = (await readPenilaian()).filter((p) => p.indikator_no !== input.indikator_no);
    if (input.nilai != null) rest.push({ ...input, nilai: input.nilai, diperbarui: new Date().toISOString() });
    rest.sort((a, b) => a.indikator_no - b.indikator_no);
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(`${FILE}.tmp`, JSON.stringify(rest, null, 2));
    await rename(`${FILE}.tmp`, FILE);
    if (sync) (await import("./sinkron")).sinkronkan();
    return rest;
  });
  writing = next.catch(() => undefined);
  return next;
}
