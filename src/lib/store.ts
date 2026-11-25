/**
 * The document registry: every file Pemdi-AI has taken in, what could be read
 * from it, and what the AI made of it.
 *
 * It lives in data/dokumen.json because the pipeline changes it file by file
 * and the lakehouse is read-only over SQL (a table load takes most of a
 * minute). src/lib/sinkron.ts copies it into lakehouse tables.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");

export type Temuan = { indikator: number; pernyataan: string; tingkat: number; kutipan: string };
export type Metrik = { nama: string; nilai: string; satuan: string; periode: string; indikator: number | null };

export type HasilAi = {
  status: "selesai" | "gagal";
  error?: string;
  model: string;
  pada: string;
  jenis_dokumen: string;
  judul: string;
  ringkasan: string;
  tahun: string;
  temuan: Temuan[];
  metrik: Metrik[];
  /** Ids of the data requirements (src/data/kebutuhan.ts) this file satisfies. */
  kebutuhan: string[];
};

export type Dok = {
  id: string;
  opd: string;
  /** Survey question the file answers; "" for a file outside the survey. */
  kode: string;
  nama: string;
  jenis: string;
  ukuran_kb: number;
  sumber: "TBB" | "Unggahan";
  diunggah: string;
  karakter: number;
  metode: "teks" | "ocr" | "";
  ai?: HasilAi;
};

const FILE = path.join(DATA_DIR, "dokumen.json");
let cache: Dok[] | null = null;
let writing: Promise<void> = Promise.resolve();

export async function readDok(): Promise<Dok[]> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as Dok[];
  } catch {
    cache = [];
  }
  return cache;
}

/** Apply a change to the registry and persist it. Calls are serialised, so concurrent pipeline steps do not lose writes. */
export function updateDok(change: (all: Dok[]) => Dok[] | void): Promise<void> {
  writing = writing.then(async () => {
    const all = await readDok();
    cache = change(all) ?? all;
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(`${FILE}.tmp`, JSON.stringify(cache, null, 1));
    await rename(`${FILE}.tmp`, FILE);
  });
  return writing;
}

export async function readTeks(id: string): Promise<string> {
  try {
    return await readFile(path.join(DATA_DIR, "teks", `${id}.txt`), "utf8");
  } catch {
    return "";
  }
}

export async function writeTeks(id: string, teks: string): Promise<void> {
  await mkdir(path.join(DATA_DIR, "teks"), { recursive: true });
  await writeFile(path.join(DATA_DIR, "teks", `${id}.txt`), teks);
}
