import { NextResponse } from "next/server";
import { llmJson } from "@/lib/llm";
import { TABLES } from "@/lib/tables";

/** Three follow-up questions for an answer. Best effort: any failure is an empty list. */
export async function POST(req: Request) {
  try {
    const { question, answer } = (await req.json()) as { question?: string; answer?: string };
    const r = await llmJson<{ saran?: string[] }>(
      `Anda membantu analis Pemerintah Digital sebuah kabupaten menjelajah data. Tabel yang tersedia: ${TABLES.map((t) => `${t.name} (${t.about})`).join("; ")}.
Usulkan 3 pertanyaan lanjutan yang singkat (maks. 12 kata), konkret, dan bisa dijawab dari tabel itu, yang memperdalam jawaban terakhir. Balas {"saran": ["...", "...", "..."]}.`,
      `Pertanyaan: ${String(question ?? "").slice(0, 500)}\n\nJawaban: ${String(answer ?? "").slice(0, 1500)}`,
      1500,
    );
    return NextResponse.json({ saran: (r.saran ?? []).map(String).filter(Boolean).slice(0, 3) });
  } catch {
    return NextResponse.json({ saran: [] });
  }
}
