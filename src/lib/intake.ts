/**
 * Intake: turn a file of any supported kind into something the lakehouse can
 * hold. The lakehouse loads CSV, Excel and Parquet into tables and refuses
 * everything else, so documents (PDF, Word, PowerPoint) are reduced to their
 * text here and recorded as rows of the `pemdi_dokumen` table.
 */
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import * as XLSX from "xlsx";

const run = promisify(execFile);

export type Kind = "tabel" | "dokumen" | "gambar" | "lain";

const KIND: Record<string, Kind> = {
  csv: "tabel",
  tsv: "tabel",
  xls: "tabel",
  xlsx: "tabel",
  parquet: "tabel",
  pdf: "dokumen",
  docx: "dokumen",
  pptx: "dokumen",
  txt: "dokumen",
  md: "dokumen",
  jpg: "gambar",
  jpeg: "gambar",
  png: "gambar",
};

export function extOf(name: string): string {
  return path.extname(name).slice(1).toLowerCase();
}

export function kindOf(name: string): Kind {
  return KIND[extOf(name)] ?? "lain";
}

/** A table name the lakehouse accepts: `^[a-z][a-z0-9]*(_[a-z0-9]+)*$`, at most 128 chars. */
export function tableName(raw: string): string {
  const s = raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100)
    .replace(/_+$/, "");
  return /^[a-z]/.test(s) ? s : `t_${s || "tabel"}`;
}

/** One line per row: line breaks inside a cell become spaces, so any CSV reader agrees on the rows. */
export function toCsv(columns: string[], rows: unknown[][]): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v).replace(/\s*[\r\n]+\s*/g, " ");
    return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

async function withTempFile<T>(data: Uint8Array, ext: string, fn: (file: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "pemdi-"));
  const file = path.join(dir, `f.${ext}`);
  try {
    await writeFile(file, data);
    return await fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function tidy(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pdfText(data: Uint8Array): Promise<string> {
  // A scanned PDF has no text layer and comes back empty: there is no OCR here.
  return withTempFile(data, "pdf", async (file) => {
    const { stdout } = await run("pdftotext", ["-q", "-enc", "UTF-8", file, "-"], { maxBuffer: 64 << 20 });
    return stdout;
  });
}

async function docxText(data: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  return (await mammoth.extractRawText({ buffer: Buffer.from(data) })).value;
}

async function pptxText(data: Uint8Array): Promise<string> {
  return withTempFile(data, "pptx", async (file) => {
    const { stdout } = await run("unzip", ["-p", file, "ppt/slides/slide*.xml"], { maxBuffer: 256 << 20 });
    return stdout
      .replace(/<\/a:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  });
}

function sheetText(data: Uint8Array): string {
  const wb = XLSX.read(data, { type: "array" });
  return wb.SheetNames.map((name) => `# ${name}\n${XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false })}`).join("\n\n");
}

/**
 * The text of a file, or "" when it has none that can be read (an image, a
 * scanned PDF, an unknown format). Never throws: a file that cannot be parsed
 * is a document without text, not a failed intake.
 */
export async function extractText(name: string, data: Uint8Array): Promise<string> {
  try {
    switch (extOf(name)) {
      case "pdf":
        return tidy(await pdfText(data));
      case "docx":
        return tidy(await docxText(data));
      case "pptx":
        return tidy(await pptxText(data));
      case "xls":
      case "xlsx":
        return tidy(sheetText(data));
      case "csv":
      case "tsv":
      case "txt":
      case "md":
        return tidy(new TextDecoder().decode(data));
      default:
        return "";
    }
  } catch {
    return "";
  }
}

const OCR_SCRIPT = path.join(process.cwd(), "scripts", "ocr.py");
const OCR_KINDS = new Set(["pdf", "jpg", "jpeg", "png"]);

/**
 * Text read off the page image, for a scanned PDF or a photo. Slow (seconds
 * per page) and only the first `maxPages` pages are read. "" when OCR is not
 * available (needs `uv`) or finds nothing.
 */
export async function ocrText(name: string, data: Uint8Array, maxPages = 6): Promise<string> {
  const ext = extOf(name);
  if (!OCR_KINDS.has(ext)) return "";
  try {
    return await withTempFile(data, ext, async (file) => {
      const { stdout } = await run("uv", ["run", "-q", "--with", "rapidocr-onnxruntime", "python", OCR_SCRIPT, file, String(maxPages)], {
        maxBuffer: 64 << 20,
        timeout: 300_000,
      });
      return tidy(stdout);
    });
  } catch {
    return "";
  }
}

/** A file's text and how it was obtained: its own text layer, or OCR when that is (nearly) empty. */
export async function readFileText(name: string, data: Uint8Array, ocr = true): Promise<{ teks: string; metode: "teks" | "ocr" | "" }> {
  const teks = await extractText(name, data);
  if (teks.length > 80) return { teks, metode: "teks" };
  if (ocr) {
    const scanned = await ocrText(name, data);
    if (scanned.length > 80) return { teks: scanned, metode: "ocr" };
  }
  return { teks: "", metode: "" };
}
