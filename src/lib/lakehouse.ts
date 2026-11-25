/**
 * Server-side client for the RantAI Lakehouse API.
 *
 * The lakehouse has no CORS layer and its session cookie is HttpOnly, so the
 * browser never talks to it: Next route handlers and the seed script do,
 * signed in as one account (LAKEHOUSE_EMAIL / LAKEHOUSE_PASSWORD). A service
 * token cannot be used instead, because uploads need a tenant and service
 * identities have none.
 */

const BASE = (process.env.LAKEHOUSE_URL ?? "http://localhost:8080").replace(/\/$/, "");

/** ClickHouse database through which the lakehouse reads raw (Bronze) tables. */
export const QUERY_DB = process.env.LAKEHOUSE_QUERY_DB ?? "icecat_api";

/** The FROM expression of an uploaded table. */
export function tableRef(table: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(table)) throw new Error(`Nama tabel tidak valid: ${table}`);
  return `${QUERY_DB}.\`bronze.${table}\``;
}

export class LakehouseError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

let session: { cookie: string; at: number } | null = null;
let signingIn: Promise<string> | null = null;
// The lakehouse session lasts 24 hours; sign in again well before that.
const SESSION_MS = 12 * 60 * 60 * 1000;

async function signIn(): Promise<string> {
  const email = process.env.LAKEHOUSE_EMAIL;
  const password = process.env.LAKEHOUSE_PASSWORD;
  if (!email || !password) {
    throw new LakehouseError(500, "LAKEHOUSE_EMAIL dan LAKEHOUSE_PASSWORD belum diatur (.env.local).");
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new LakehouseError(503, `Lakehouse tidak dapat dihubungi di ${BASE}.`);
  }
  if (!res.ok) {
    throw new LakehouseError(res.status, `Login ke lakehouse gagal (${res.status}).`, await res.text());
  }
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("lh_session="));
  if (!cookie) throw new LakehouseError(502, "Lakehouse tidak mengembalikan sesi.");
  session = { cookie, at: Date.now() };
  return cookie;
}

async function cookie(): Promise<string> {
  if (session && Date.now() - session.at < SESSION_MS) return session.cookie;
  signingIn ??= signIn().finally(() => {
    signingIn = null;
  });
  return signingIn;
}

async function errorOf(res: Response): Promise<LakehouseError> {
  const text = await res.text();
  let body: { error?: string; detail?: string; hint?: string } | undefined;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: keep the text.
  }
  const message = body?.error ? [body.error, body.detail, body.hint].filter(Boolean).join(" ") : text.slice(0, 300);
  return new LakehouseError(res.status, message || `Lakehouse menjawab ${res.status}.`, body ?? text);
}

/** A raw lakehouse call with the session attached. Signs in again once on 401. */
export async function lhFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("cookie", await cookie());
  if (process.env.LAKEHOUSE_TENANT_ID) headers.set("x-tenant", process.env.LAKEHOUSE_TENANT_ID);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new LakehouseError(503, `Lakehouse tidak dapat dihubungi di ${BASE}.`);
  }
  if (res.status === 401 && retry) {
    session = null;
    return lhFetch(path, init, false);
  }
  return res;
}

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await lhFetch(path, init);
  if (!res.ok) throw await errorOf(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function post(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

// ── SQL ────────────────────────────────────────────────────────────────

export type Row = Record<string, unknown>;
export type QueryResult = {
  columns: string[];
  rows: Row[];
  rowCount: number;
  truncated: boolean;
  metrics?: { durationMs?: number };
};

/** Read-only SQL (ClickHouse dialect). At most 2,000 rows come back. */
export function query(sql: string): Promise<QueryResult> {
  return json<QueryResult>("/api/query/run", post({ sql }));
}

/** `query`, but an error (a table not loaded yet, the lakehouse down) is an empty result. */
export async function tryQuery(sql: string): Promise<Row[]> {
  try {
    return (await query(sql)).rows;
  } catch {
    return [];
  }
}

// ── Uploads ────────────────────────────────────────────────────────────

export type Upload = {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  status: "uploaded" | "ingesting" | "ingested" | "failed";
  createdAt: string;
  updatedAt: string;
  bronzeTable?: string;
  loadMode?: string;
  rows?: number;
  runId?: string;
  error?: string;
  workbook?: { sheets: { name: string; visible: boolean }[]; defaultSheet: string };
  duplicateOf?: Upload;
};

export type UploadPreview = {
  using: { encoding: "utf-8" | "utf-16"; delimiter: string; headerRow: number; sheet?: string };
  columns: string[];
  rows: string[][];
  truncated: boolean;
};

export function listUploads(): Promise<Upload[]> {
  return json<Upload[]>("/api/uploads");
}

export function getUpload(id: string): Promise<Upload> {
  return json<Upload>(`/api/uploads/${id}`);
}

export function deleteUpload(id: string): Promise<void> {
  return json<void>(`/api/uploads/${id}`, { method: "DELETE" });
}

/** Store a CSV, Excel or Parquet file in the lakehouse. Nothing is loaded yet. */
export function createUpload(name: string, data: Uint8Array | string, type = "text/csv"): Promise<Upload> {
  const form = new FormData();
  form.append("file", new Blob([data as BlobPart], { type }), name);
  return json<Upload>("/api/uploads", { method: "POST", body: form });
}

export function previewUpload(id: string, sheet?: string): Promise<UploadPreview> {
  const qs = sheet ? `?sheet=${encodeURIComponent(sheet)}` : "";
  return json<UploadPreview>(`/api/uploads/${id}/preview${qs}`);
}

/** Start loading an upload into the raw table `bronzeTable`. Poll `getUpload` for the outcome. */
export function ingestUpload(
  id: string,
  input: UploadPreview["using"] & { bronzeTable: string; mode?: "replace" | "append" },
): Promise<{ upload: Upload; runId: string }> {
  return json(`/api/uploads/${id}/ingest`, post({ mode: "replace", ...input }));
}

/**
 * Upload rows as a CSV and load them into `table`, replacing what it held.
 * Resolves when the load has finished; every column arrives as text.
 */
export async function loadTable(table: string, csv: string, timeoutMs = 300_000): Promise<Upload> {
  const created = await createUpload(`${table}.csv`, csv);
  const preview = await previewUpload(created.id);
  await ingestUpload(created.id, { ...preview.using, bronzeTable: table, mode: "replace" });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    const upload = await getUpload(created.id);
    if (upload.status === "ingested") return upload;
    if (upload.status === "failed") throw new LakehouseError(500, `Muat ${table} gagal: ${upload.error ?? "?"}`);
    if (Date.now() > deadline) throw new LakehouseError(504, `Muat ${table} belum selesai setelah ${timeoutMs / 1000} dtk.`);
  }
}

// ── AI ─────────────────────────────────────────────────────────────────

export type ToolTrace = { tool: string; args: Record<string, unknown>; ok: boolean; result: unknown };
export type ChatAnswer = { answer: string; toolTrace: ToolTrace[]; note?: string };
export type ChatMessage = { role: "user" | "assistant"; content: string };

/** The read-only tools NL2SQL needs; the same allowlist the lakehouse's Query Studio sends. */
const NL2SQL_TOOLS = ["run_sql", "list_datasets", "describe_dataset", "lakehouse_overview"];

/** Ask the lakehouse copilot. `context` tells it which tables exist and how to name them. */
export function chat(messages: ChatMessage[], context: string): Promise<ChatAnswer> {
  return json<ChatAnswer>("/api/ai/chat", post({ messages, context, tools: NL2SQL_TOOLS }));
}
