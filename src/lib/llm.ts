/**
 * Direct calls to the OpenAI-compatible endpoint the lakehouse copilot also
 * uses (LLM_URL / LLM_MODEL / LLM_KEY). Used where there is no SQL to write:
 * reading a document at intake and proposing a maturity score.
 */
export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_URL && process.env.LLM_MODEL && process.env.LLM_KEY);
}

export class LlmError extends Error {}

async function complete(system: string, user: string, maxTokens: number): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${process.env.LLM_URL!.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.LLM_KEY}`,
        // OpenCode Go routes by session and refuses requests without one.
        ...(process.env.LLM_SESSION ? { "x-opencode-session": process.env.LLM_SESSION, "user-agent": "pemdi-ai/1.0" } : {}),
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        max_tokens: maxTokens,
        temperature: 0.1,
        messages: [
          { role: "system", content: `${system}\nJawab hanya dengan satu objek JSON yang valid, tanpa teks lain dan tanpa blok kode.` },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(240_000),
    });
  } catch (e) {
    throw new LlmError(`LLM tidak dapat dihubungi: ${e instanceof Error ? e.message : e}`);
  }
  if (!res.ok) throw new LlmError(`LLM menjawab ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { choices?: { finish_reason?: string; message?: { content?: string } }[]; base_resp?: { status_code?: number; status_msg?: string } };
  if (body.base_resp?.status_code) throw new LlmError(`LLM menolak permintaan: ${body.base_resp.status_msg ?? body.base_resp.status_code}`);
  const choice = body.choices?.[0];
  // The model reasons inside <think> tags before answering; that reasoning counts against max_tokens.
  const content = (choice?.message?.content ?? "").replace(/<think>[\s\S]*?(<\/think>|$)/g, "");
  if (choice?.finish_reason === "length") throw new LlmError("Jawaban LLM terpotong sebelum selesai.");
  return content;
}

function parse<T>(content: string): T {
  const match = /\{[\s\S]*\}/.exec(content);
  if (!match) throw new LlmError("LLM tidak mengembalikan JSON.");
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    // The usual slips: a trailing comma, or a raw line break inside a string.
    try {
      return JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1").replace(/[\r\n\t]+/g, " ")) as T;
    } catch {
      throw new LlmError("JSON dari LLM tidak dapat dibaca.");
    }
  }
}

/** One completion that must answer with a JSON object. A truncated or unreadable answer is asked for once more. */
export async function llmJson<T>(system: string, user: string, maxTokens = 4000): Promise<T> {
  if (!llmConfigured()) throw new LlmError("LLM belum dikonfigurasi (LLM_URL, LLM_MODEL, LLM_KEY di .env.local).");
  try {
    return parse<T>(await complete(system, user, maxTokens));
  } catch (e) {
    if (!(e instanceof LlmError) || /menjawab 4\d\d|menolak/.test(e.message)) throw e;
    return parse<T>(await complete(system, user, maxTokens * 2));
  }
}
