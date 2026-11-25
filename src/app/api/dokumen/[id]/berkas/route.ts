/**
 * Berkas asli dokumen yang terdaftar di data/dokumen.json (mis. Perda RPJMD).
 * Dicari di data/files lebih dulu; bila tidak ada, di volume sumber/dokumen
 * yang dipasang di produksi.
 */
import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { DIR_SUMBER, sajikanBerkas } from "@/lib/berkas";
import { DATA_DIR, readDok } from "@/lib/store";

async function ada(berkas: string): Promise<boolean> {
  try {
    return (await stat(berkas)).isFile();
  } catch {
    return false;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dok = (await readDok()).find((x) => x.id === id);
  if (!dok) return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

  const nama = `${dok.id}.${dok.jenis}`;
  const diData = path.join(DATA_DIR, "files", nama);
  const diSumber = path.join(DIR_SUMBER, "dokumen", nama);
  const berkas = (await ada(diData)) ? diData : (await ada(diSumber)) ? diSumber : null;
  if (!berkas) return NextResponse.json({ error: "Berkas asli dokumen ini belum tersedia." }, { status: 404 });

  return sajikanBerkas(berkas, dok.nama, req);
}
