/**
 * Berkas sumber (PDF BPS, laporan SPM, dokumen PROSN, dan seterusnya) untuk
 * dasbor. Hanya berkas yang tercatat di sumber/<kumpulan>/manifest.json yang
 * boleh diambil; path lain ditolak, sehingga tidak ada jalan untuk membaca
 * berkas di luar direktori sumber.
 *
 * Kumpulan yang dilayani dibaca dari isi sumber/: setiap subfolder yang punya
 * manifest.json. Menambah kumpulan baru cukup dengan menambah foldernya.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { DIR_SUMBER, sajikanBerkas } from "@/lib/berkas";

type Butir = { file?: string };

/** Nama kumpulan yang sah; sengaja hanya huruf/angka/strip agar tidak bisa dipakai untuk keluar folder. */
const POLA_KUMPULAN = /^[a-z0-9][a-z0-9-]*$/;

/** Cache daftar kumpulan; isi sumber/ jarang berubah dan hanya bertambah saat rilis. */
let cacheKumpulan: { pada: number; daftar: Set<string> } | null = null;

async function kumpulanSah(): Promise<Set<string>> {
  if (cacheKumpulan && Date.now() - cacheKumpulan.pada < 60_000) return cacheKumpulan.daftar;
  const daftar = new Set<string>();
  let isi;
  try {
    isi = await readdir(DIR_SUMBER, { withFileTypes: true });
  } catch {
    return daftar;
  }
  for (const entri of isi) {
    if (!entri.isDirectory() || !POLA_KUMPULAN.test(entri.name)) continue;
    try {
      await readFile(path.join(DIR_SUMBER, entri.name, "manifest.json"), "utf8");
      daftar.add(entri.name);
    } catch {
      // Folder tanpa manifest bukan kumpulan berkas yang boleh diambil.
    }
  }
  cacheKumpulan = { pada: Date.now(), daftar };
  return daftar;
}

export async function GET(req: Request, { params }: { params: Promise<{ berkas: string[] }> }) {
  const { berkas } = await params;
  // Bentuk yang dilayani hanya /api/sumber/<kumpulan>/<nama berkas>.
  if (berkas.length !== 2) {
    return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
  }
  const [kumpulan, nama] = berkas;
  if (!kumpulan || !POLA_KUMPULAN.test(kumpulan)) {
    return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
  }
  if (!nama || nama === "." || nama === ".." || nama.includes("/") || nama.includes("\\") || nama.includes("\0")) {
    return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
  }

  const sah = await kumpulanSah();
  if (!sah.has(kumpulan)) return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });

  let daftar: string[];
  try {
    const isi = JSON.parse(await readFile(path.join(DIR_SUMBER, kumpulan, "manifest.json"), "utf8")) as Butir[];
    daftar = isi.map((x) => x.file).filter((x): x is string => typeof x === "string");
  } catch {
    return NextResponse.json({ error: "Daftar sumber belum tersedia." }, { status: 503 });
  }
  if (!daftar.includes(nama)) return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });

  return sajikanBerkas(path.join(DIR_SUMBER, kumpulan, nama), nama, req);
}
