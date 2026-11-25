import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { intakeDokumen } from "@/lib/dokumen";
import { kindOf, tableName } from "@/lib/intake";
import { createUpload, listUploads, previewUpload } from "@/lib/lakehouse";

export const maxDuration = 300;
const MAX_BYTES = 50 * 1024 * 1024;

/** Uploads known to the lakehouse, newest first. */
export async function GET() {
  try {
    const uploads = await listUploads();
    uploads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json(uploads.slice(0, 100));
  } catch (e) {
    return fail(e);
  }
}

/**
 * Take one file. A table file (CSV, Excel, Parquet) is stored in the
 * lakehouse and previewed, to be loaded by /api/upload/ingest once the user
 * confirms sheet and table name. Anything else is a document: its text is
 * read (OCR for scans), it joins the registry, and it is queued for the AI.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Ukuran berkas melebihi 50 MB." }, { status: 413 });
    const data = new Uint8Array(await file.arrayBuffer());
    const kind = kindOf(file.name);

    if (kind === "tabel") {
      const upload = await createUpload(file.name, data, file.type || "application/octet-stream");
      const preview = await previewUpload(upload.id);
      return NextResponse.json({
        kind,
        upload,
        preview,
        sheets: upload.workbook?.sheets.filter((s) => s.visible).map((s) => s.name) ?? [],
        suggestedTable: tableName(file.name.replace(/\.[^.]+$/, "")),
      });
    }
    if (kind === "lain") {
      return NextResponse.json({ error: "Jenis berkas tidak didukung. Gunakan CSV, Excel, Parquet, PDF, Word, PowerPoint, atau gambar." }, { status: 415 });
    }
    const dok = await intakeDokumen({ name: file.name, data }, { opd: String(form.get("opd") ?? "").trim() });
    return NextResponse.json({ kind, dok });
  } catch (e) {
    return fail(e);
  }
}
