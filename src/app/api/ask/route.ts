import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { lhFetch, type ChatMessage, type Row, type ToolTrace } from "@/lib/lakehouse";
import { schemaContext } from "@/lib/tables";
import { userTables } from "@/lib/user-tables";

export const maxDuration = 300;

const TOOLS = ["run_sql", "list_datasets", "describe_dataset", "lakehouse_overview"];

type Body = { answer?: string; toolTrace?: ToolTrace[]; note?: string; error?: string; detail?: string; hint?: string };

const angka = (v: unknown) => v !== null && v !== "" && !Number.isNaN(Number(v));

/** 2–40 rows with a label and a number: something the chat can draw. */
function bisaDigambar(t: ToolTrace) {
  const rows = (t.result as { rows?: Row[] } | undefined)?.rows ?? [];
  if (rows.length < 2 || rows.length > 40) return false;
  const cols = Object.keys(rows[0] ?? {});
  return cols.length >= 2 && cols.some((c) => rows.every((r) => angka(r[c])));
}

/**
 * The answer with the SQL it ran and that query's rows. The copilot often ends
 * with a one-row check query, so prefer the last successful `run_sql` that can
 * be drawn, else the last one.
 */
function hasil(body: Body) {
  const trace = body.toolTrace ?? [];
  const runs = trace.filter((t) => t.tool === "run_sql" && t.ok);
  const last = runs.filter(bisaDigambar).pop() ?? runs[runs.length - 1];
  const data = last?.result as { columns?: string[]; rows?: Row[] } | undefined;
  return {
    type: "done",
    answer: body.answer ?? "",
    sql: typeof last?.args?.sql === "string" ? last.args.sql : null,
    columns: data?.columns ?? (data?.rows?.[0] ? Object.keys(data.rows[0]) : []),
    rows: data?.rows ?? [],
    queries: runs.length,
  };
}

/**
 * Natural-language question -> the lakehouse copilot (NL2SQL), streamed.
 *
 * The copilot answers as NDJSON; this route passes its progress on as
 * `status` / `tool` / `delta` lines and ends with one `done` line (answer,
 * SQL, rows) or one `error` line.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    const messages = (body.messages ?? []).filter((m) => m.content?.trim()).slice(-12);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Pertanyaan kosong." }, { status: 400 });
    }
    const upstream = await lhFetch("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, context: schemaContext(await userTables()), tools: TOOLS, stream: true }),
      signal: req.signal,
    });
    if (!upstream.ok || !upstream.body) {
      const b = (await upstream.json().catch(() => ({}))) as Body;
      return NextResponse.json({ error: [b.error, b.detail, b.hint].filter(Boolean).join(" ") || `Kopilot menjawab ${upstream.status}.` }, { status: upstream.status });
    }

    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (o: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(o)}\n`));
        // Cloudflare drops a response that stays silent for 100 s, and the model can think longer than that
        // between steps on a hard question. A ping every 15 s keeps the line open; the page ignores it.
        const detak = setInterval(() => send({ type: "ping" }), 15_000);
        let adaTeks = false;
        let buf = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let nl: number;
            while ((nl = buf.indexOf("\n")) >= 0) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line) continue;
              const ev = JSON.parse(line) as { type: string; phase?: string; tool?: string; text?: string; body?: Body };
              if (ev.type === "status") send({ type: "status", phase: ev.phase });
              else if (ev.type === "tool") send({ type: "tool", tool: ev.tool });
              else if (ev.type === "delta") {
                if (ev.text?.trim()) adaTeks = true;
                send({ type: "delta", text: ev.text });
              } else if (ev.type === "done") {
                const h = hasil(ev.body ?? {});
                // Now and then the model runs its queries and then says nothing; say so instead of showing a blank answer.
                if (!h.answer?.trim() && !adaTeks) send({ type: "error", error: "AI tidak mengembalikan jawaban untuk pertanyaan ini. Coba kirim ulang, atau pecah pertanyaannya menjadi lebih kecil." });
                else send(h);
              }
              else if (ev.type === "error") send({ type: "error", error: [ev.body?.error, ev.body?.detail, ev.body?.hint].filter(Boolean).join(" ") || "Kopilot gagal menjawab." });
            }
          }
        } catch (e) {
          send({ type: "error", error: e instanceof Error ? e.message : "Sambungan ke kopilot terputus." });
        } finally {
          clearInterval(detak);
        }
        controller.close();
      },
      cancel() {
        void reader.cancel();
      },
    });
    return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-cache" } });
  } catch (e) {
    return fail(e);
  }
}
