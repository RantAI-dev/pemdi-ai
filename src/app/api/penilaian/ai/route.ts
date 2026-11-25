import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { estimasiIndikator } from "@/lib/estimasi";
import { LlmError } from "@/lib/llm";

export const maxDuration = 180;

/** Propose a score for one indicator. Nothing is saved: the page shows the proposal and the user accepts or edits it. */
export async function POST(req: Request) {
  try {
    const { indikator_no } = (await req.json()) as { indikator_no?: number };
    const e = await estimasiIndikator(Number(indikator_no));
    if (!e) {
      return NextResponse.json({ error: "Belum ada temuan dokumen atau jawaban survei untuk indikator ini, jadi AI tidak punya dasar untuk menilai." }, { status: 422 });
    }
    return NextResponse.json(e);
  } catch (e) {
    if (e instanceof LlmError) return NextResponse.json({ error: e.message }, { status: 503 });
    return fail(e);
  }
}
