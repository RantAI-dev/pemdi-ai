import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { tableName } from "@/lib/intake";
import { ingestUpload, previewUpload } from "@/lib/lakehouse";
import { TABLES } from "@/lib/tables";

/** Load a stored table file into a raw table. Preview only (`dryRun`) re-reads another sheet or header row. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { id?: string; table?: string; sheet?: string; mode?: "replace" | "append"; dryRun?: boolean };
    if (!body.id) return NextResponse.json({ error: "id unggahan kosong." }, { status: 400 });
    const preview = await previewUpload(body.id, body.sheet);
    if (body.dryRun) return NextResponse.json({ preview });
    const table = tableName(body.table ?? "");
    if (TABLES.some((t) => t.name === table)) {
      return NextResponse.json({ error: `Nama tabel ${table} dipakai oleh Pemdi-AI. Pilih nama lain.` }, { status: 409 });
    }
    const launched = await ingestUpload(body.id, { ...preview.using, bronzeTable: table, mode: body.mode ?? "replace" });
    return NextResponse.json({ table, upload: launched.upload });
  } catch (e) {
    return fail(e);
  }
}
