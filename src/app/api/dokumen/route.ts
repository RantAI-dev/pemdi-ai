import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { estimasiBerjalan, perbaruiEstimasi } from "@/lib/estimasi";
import { antrekan, statusAntrean } from "@/lib/proses";
import { sinkronkan, statusSinkron } from "@/lib/sinkron";
import { readDok } from "@/lib/store";

/** The document registry with the pipeline's live state, for the Dokumen page to poll. */
export async function GET() {
  try {
    const dok = await readDok();
    return NextResponse.json({
      dokumen: [...dok].sort((a, b) => b.diunggah.localeCompare(a.diunggah) || a.opd.localeCompare(b.opd)),
      antrean: statusAntrean(),
      estimasi: estimasiBerjalan(),
      sinkron: statusSinkron(),
    });
  } catch (e) {
    return fail(e);
  }
}

/** Queue documents for the AI step: `{ids: [...]}`, or `{ids: "semua"}` for every unread one. */
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { ids?: string[] | "semua"; ulang?: boolean; estimasi?: "semua" | "kosong" };
    if (!statusAntrean().llm) {
      return NextResponse.json({ error: "LLM belum dikonfigurasi (LLM_URL, LLM_MODEL, LLM_KEY), jadi dokumen belum bisa diproses AI." }, { status: 503 });
    }
    if (b.estimasi) {
      // Re-run the indicator estimates without re-reading any document.
      void perbaruiEstimasi(b.estimasi === "kosong").then(sinkronkan);
      return NextResponse.json({ estimasi: true });
    }
    const n = await antrekan(b.ids === "semua" ? "semua" : (b.ids ?? []), Boolean(b.ulang));
    return NextResponse.json({ diantrekan: n, antrean: statusAntrean() });
  } catch (e) {
    return fail(e);
  }
}
