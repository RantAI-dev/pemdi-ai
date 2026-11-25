/**
 * Menyajikan berkas dari disk dengan dukungan HTTP Range, untuk penampil PDF
 * di dasbor makro. Route yang memanggil fungsi ini sudah memastikan bahwa
 * pemanggil boleh melihat berkasnya (sesi diperiksa oleh src/proxy.ts).
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const DIR_SUMBER = process.env.SUMBER_DIR ?? path.join(process.cwd(), "sumber");

const TIPE: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  zip: "application/zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export function tipeBerkas(nama: string): string {
  const ext = path.extname(nama).slice(1).toLowerCase();
  return TIPE[ext] ?? "application/octet-stream";
}

/** Nama aman untuk header: buang karakter kontrol, kutip, dan non-ASCII. */
function namaHeader(nama: string): string {
  return nama.replace(/[^\x20-\x7e]/g, "_").replace(/["\\\r\n]/g, "_");
}

function disposisi(nama: string): string {
  const enc = encodeURIComponent(nama).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `inline; filename="${namaHeader(nama)}"; filename*=UTF-8''${enc}`;
}

function tidakValid(ukuran: number): Response {
  return new Response("Rentang tidak valid.", {
    status: 416,
    headers: { "Content-Range": `bytes */${ukuran}`, "Accept-Ranges": "bytes" },
  });
}

/** `Range: bytes=...` -> irisan yang sah, atau null bila header tidak bisa dipakai. */
function bacaRange(header: string, ukuran: number): { mulai: number; akhir: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, kiri, kanan] = m;
  let mulai: number;
  let akhir: number;
  if (kiri === "") {
    const n = Number(kanan);
    if (!Number.isFinite(n) || n <= 0) return null;
    mulai = Math.max(0, ukuran - n);
    akhir = ukuran - 1;
  } else {
    mulai = Number(kiri);
    akhir = kanan === "" ? ukuran - 1 : Number(kanan);
  }
  if (!Number.isFinite(mulai) || !Number.isFinite(akhir)) return null;
  if (mulai < 0 || mulai >= ukuran || akhir < mulai) return null;
  return { mulai, akhir: Math.min(akhir, ukuran - 1) };
}

export async function sajikanBerkas(berkas: string, nama: string, req: Request): Promise<Response> {
  let info;
  try {
    info = await stat(berkas);
  } catch {
    return new Response("Berkas tidak ditemukan.", { status: 404 });
  }
  if (!info.isFile()) return new Response("Berkas tidak ditemukan.", { status: 404 });

  const ukuran = info.size;
  const headers = new Headers({
    "Content-Type": tipeBerkas(nama),
    "Content-Disposition": disposisi(nama),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  });

  const range = req.headers.get("range");
  if (!range) {
    headers.set("Content-Length", String(ukuran));
    return new Response(Readable.toWeb(createReadStream(berkas)) as ReadableStream, { status: 200, headers });
  }

  const irisan = bacaRange(range, ukuran);
  if (!irisan) return tidakValid(ukuran);

  const panjang = irisan.akhir - irisan.mulai + 1;
  headers.set("Content-Range", `bytes ${irisan.mulai}-${irisan.akhir}/${ukuran}`);
  headers.set("Content-Length", String(panjang));
  const aliran = createReadStream(berkas, { start: irisan.mulai, end: irisan.akhir });
  return new Response(Readable.toWeb(aliran) as ReadableStream, { status: 206, headers });
}
