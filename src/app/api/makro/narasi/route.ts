import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { LlmError, llmJson } from "@/lib/llm";
import { muatMakro } from "@/lib/makro";
import { fmtLaju, fmtNilai, fmtPersen, labelSumber, ringkas } from "@/lib/makro-tampil";

export const maxDuration = 180;

/**
 * Draft one LPPD-style paragraph for a macro indicator. The model only sees
 * the numbers and their sources, and is told to cite them; nothing is saved.
 */
export async function POST(req: Request) {
  try {
    const { indikator, tahun } = (await req.json()) as { indikator?: string; tahun?: number };
    const data = await muatMakro();
    const ind = data.indikator.find((i) => i.slug === indikator);
    if (!ind) return NextResponse.json({ error: "Indikator tidak dikenal." }, { status: 400 });
    const th = Number(tahun) || data.tahunUtama;
    const r = ringkas(data, ind, th);
    const sumber = (id?: string, hlm?: number | null) => {
      const s = data.sumber.find((x) => x.id === id);
      return s ? labelSumber(s, hlm) : null;
    };
    const angka = (n?: (typeof data.nilai)[number]) => (n ? { tahun: n.tahun, nilai: fmtNilai(n.nilai, n.satuan, ind.slug), sumber: sumber(n.sumber, n.halaman), catatan: n.catatan } : null);
    const masukan = {
      daerah: "Kabupaten Tulang Bawang Barat",
      indikator: ind.namaLppd,
      satuan: ind.satuan,
      arah: ind.polaritas === "naik" ? "makin tinggi makin baik" : "makin rendah makin baik",
      tahun_laporan: th,
      realisasi: angka(r.realisasi),
      realisasi_tahun_sebelumnya: angka(r.lalu),
      laju_kinerja: r.laju == null ? null : fmtLaju(r.laju),
      target_rpjmd: angka(r.target),
      capaian: r.capaian == null ? null : fmtPersen(r.capaian),
      kategori: r.kategori,
      provinsi_lampung: angka(r.lampung),
      nasional: angka(r.nasional),
    };
    const out = await llmJson<{ narasi?: string }>(
      "Anda penyusun LPPD (Laporan Penyelenggaraan Pemerintahan Daerah) untuk Kemendagri. Tulis satu paragraf narasi capaian indikator kinerja makro dalam bahasa Indonesia baku, 3–5 kalimat, nada formal dan faktual. Gunakan HANYA angka yang diberikan, jangan menambah angka atau penyebab yang tidak ada. Setiap angka diikuti sumbernya dalam kurung, misalnya (BPS Tubaba · Dalam Angka 2026 · hlm. 563). Bila realisasi tahun laporan tidak tersedia, katakan demikian. Bentuk jawaban: {\"narasi\": \"...\"}",
      JSON.stringify(masukan, null, 1),
      3000,
    );
    if (!out.narasi) return NextResponse.json({ error: "LLM tidak mengembalikan narasi." }, { status: 502 });
    return NextResponse.json({ narasi: out.narasi.trim() });
  } catch (e) {
    if (e instanceof LlmError) return NextResponse.json({ error: e.message }, { status: 503 });
    return fail(e);
  }
}
