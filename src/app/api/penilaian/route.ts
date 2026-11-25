import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { getBuktiIndikator } from "@/lib/bukti";
import { hitungKebutuhan } from "@/lib/kebutuhan";
import { llmConfigured } from "@/lib/llm";
import { readPenilaian, savePenilaian } from "@/lib/penilaian";
import { statusSinkron as syncStatus } from "@/lib/sinkron";

export async function GET(req: Request) {
  try {
    const no = Number(new URL(req.url).searchParams.get("i"));
    const penilaian = await readPenilaian();
    if (!(no >= 1 && no <= 20)) return NextResponse.json({ penilaian, sync: syncStatus(), llm: llmConfigured() });
    let bukti = null;
    let buktiError = "";
    try {
      bukti = await getBuktiIndikator(no);
    } catch (e) {
      buktiError = e instanceof Error ? e.message : "Bukti tidak dapat dibaca.";
    }
    const kebutuhan = (await hitungKebutuhan()).filter((k) => k.indikator === no).map(({ kata: _kata, ...k }) => k);
    return NextResponse.json({ penilaian, bukti, buktiError, kebutuhan, sync: syncStatus(), llm: llmConfigured() });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { indikator_no?: number; nilai?: number | null; penjelasan?: string; penilai?: string };
    const no = Number(b.indikator_no);
    if (!Number.isInteger(no) || no < 1 || no > 20) return NextResponse.json({ error: "Indikator tidak valid." }, { status: 400 });
    const nilai = b.nilai == null ? null : Math.round(Number(b.nilai) * 100) / 100;
    if (nilai != null && !(nilai >= 1 && nilai <= 5)) return NextResponse.json({ error: "Nilai harus antara 1,00 dan 5,00." }, { status: 400 });
    const penilaian = await savePenilaian({
      indikator_no: no,
      nilai,
      penjelasan: String(b.penjelasan ?? "").slice(0, 4000),
      penilai: b.penilai === "AI" ? "AI" : "Manual",
    });
    return NextResponse.json({ penilaian, sync: syncStatus() });
  } catch (e) {
    return fail(e);
  }
}
