"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tip } from "@/components/viz";
import { ArrowUp, BarChart3, Check, ChevronDown, Copy, Database, Download, History, Plus, RefreshCw, Square, Table2, Trash2, X } from "lucide-react";
import { AutoChart, HBar } from "@/components/charts";
import { cn } from "@/lib/utils";

/**
 * AI Tubaba: one conversation with the lakehouse copilot, laid out the way
 * the lakehouse's own Copilot page is. The chat sits straight on the page
 * (no card), a thin bar on top carries the title, New chat and History, and
 * the composer stays on the bottom edge. There is no SQL editor: every
 * question goes through the AI, and the SQL it ran is shown under each
 * answer so it can be checked.
 */

type Row = Record<string, unknown>;
type Result = { columns: string[]; rows: Row[] };
type Step = { label: string; done: boolean };
type Turn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sql?: string | null; result?: Result; error?: boolean; steps?: Step[]; saran?: string[]; pending?: boolean; detik?: number };
type Sesi = { id: string; judul: string; pada: string; turns: Turn[] };

const KEY = "pemdi-tanya-sesi-v2";
const HISTORY_KEY = "pemdi-tanya-riwayat";

const CONTOH = [
  "Kebutuhan data apa saja yang belum ada, dan siapa pemiliknya?",
  "OPD mana yang paling banyak belum menyerahkan berkas?",
  "Tampilkan nilai 20 indikator, urut dari yang terendah",
  "Berapa jumlah temuan per indikator?",
  "Berapa persen data prioritas pusat yang sudah masuk?",
  "Berapa jumlah penduduk tiap kecamatan?",
];

const LABEL: Record<string, string> = {
  thinking: "Berpikir",
  verifying: "Memeriksa angka terhadap hasil kueri",
  run_sql: "Menjalankan kueri di lakehouse",
  list_datasets: "Melihat daftar tabel",
  describe_dataset: "Membaca struktur tabel",
  lakehouse_overview: "Meninjau isi lakehouse",
};

const isNum = (v: unknown) => v !== null && v !== "" && !Number.isNaN(Number(v));
const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function salam(): string {
  const h = new Date().getHours();
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
}

function chartOf(r: Result) {
  if (r.rows.length < 2 || r.rows.length > 40 || r.columns.length < 2) return null;
  const numeric = r.columns.filter((c) => r.rows.every((row) => isNum(row[c])));
  const labelCol = r.columns.find((c) => !numeric.includes(c)) ?? r.columns[0];
  // A numbering column ("no", "indikator_no") is an identifier, not a measure.
  const valueCol = numeric.filter((c) => c !== labelCol && !/(^|_)(no|id|nomor)$/i.test(c)).pop() ?? numeric.find((c) => c !== labelCol);
  if (!valueCol) return null;
  const labels = r.rows.map((row) => String(row[labelCol] ?? ""));
  return { labels, values: r.rows.map((row) => Number(row[valueCol])), name: valueCol, time: labels.every((l) => /^\d{4}(-\d{2})?(-\d{2})?$/.test(l)) };
}

function csvOf(r: Result) {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [r.columns, ...r.rows.map((row) => r.columns.map((c) => row[c]))].map((x) => x.map(cell).join(",")).join("\n");
}

function unduh(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-6 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40">
      {children}
    </button>
  );
}

function Salin({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <IconButton
      label={ok ? "Tersalin" : label}
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
    </IconButton>
  );
}

/** "Thinking" pill: three pulsing dots, the current step, and the seconds so far. */
function Berpikir({ label }: { label: string }) {
  const [detik, setDetik] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setDetik((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div role="status" className="inline-flex items-center gap-2.5 rounded-full border border-border bg-muted/50 py-1.5 pl-3 pr-3.5 text-sm text-muted-foreground">
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-pulse rounded-full bg-[var(--brand-1)]" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </span>
      {label}
      {detik >= 1 ? <span className="text-xs tabular-nums">· {detik}s</span> : null}
    </div>
  );
}

/** What the copilot did to answer: its steps and the SQL it ran, folded away by default. */
function Langkah({ steps, sql }: { steps: Step[]; sql?: string | null }) {
  const [open, setOpen] = React.useState(false);
  const kueri = steps.filter((s) => s.label === LABEL.run_sql).length;
  if (!steps.length && !sql) return null;
  return (
    <div className="mb-2">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <Database className="size-3.5" aria-hidden />
        {kueri ? `${kueri} kueri dijalankan di lakehouse` : "Dijawab tanpa kueri"}
        <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} aria-hidden />
      </button>
      {open ? (
        <div className="mt-1.5 border-l-2 border-border/60 pl-3">
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {steps.map((s, i) => (
              <li key={i}>{s.label}</li>
            ))}
          </ul>
          {sql ? (
            <div className="relative mt-1.5">
              <pre className="overflow-x-auto rounded bg-muted/60 px-2 py-1.5 pr-8 font-mono text-[11px] leading-snug text-muted-foreground">{sql}</pre>
              <span className="absolute right-1 top-1">
                <Salin text={sql} label="Salin SQL" />
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The rows behind an answer, as a chart or a table. */
function Hasil({ result }: { result: Result }) {
  const chart = React.useMemo(() => chartOf(result), [result]);
  const [tab, setTab] = React.useState<"grafik" | "tabel">(chart ? "grafik" : "tabel");
  if (!result.rows.length) return null;
  const panjang = chart ? chart.labels.length > 8 || chart.labels.some((l) => l.length > 12) : false;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-2 py-1">
        {chart ? (
          <button type="button" onClick={() => setTab("grafik")} className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs", tab === "grafik" ? "bg-background font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
            <BarChart3 className="size-3.5" /> Grafik
          </button>
        ) : null}
        <button type="button" onClick={() => setTab("tabel")} className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs", tab === "tabel" ? "bg-background font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
          <Table2 className="size-3.5" /> Tabel
        </button>
        <span className="ml-1 text-[11px] text-muted-foreground">{result.rows.length} baris</span>
        <span className="ml-auto">
          <IconButton label="Unduh CSV" onClick={() => unduh("hasil-tanya-data.csv", csvOf(result))}>
            <Download className="size-3" />
          </IconButton>
        </span>
      </div>
      {tab === "grafik" && chart ? (
        <div className="p-2">
          {panjang && !chart.time ? <HBar data={chart.labels.map((name, i) => ({ name, value: chart.values[i] }))} labelWidth={34} /> : <AutoChart labels={chart.labels} values={chart.values} name={chart.name} line={chart.time} />}
          <p className="px-1 text-[11px] text-muted-foreground">Kolom yang digambar: {chart.name}</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0">
              <tr className="border-b border-border bg-muted">
                {result.columns.map((c) => (
                  <th key={c} className="whitespace-nowrap px-2 py-1 text-left font-medium text-muted-foreground">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.slice(0, 300).map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  {result.columns.map((c) => (
                    <td key={c} className={cn("max-w-md px-2 py-1 align-top", isNum(row[c]) && "whitespace-nowrap text-right tabular-nums")}>
                      {isNum(row[c]) && !/(^|_)(no|id|kode|tahun)/i.test(c) ? nf.format(Number(row[c])) : String(row[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * The copilot marks figures it worked out itself (not read straight from a query result) as
 * <span data-unverified="true">x</span>. react-markdown shows raw HTML as text, so those become
 * a link to "#belum-terverifikasi" that renders as a dotted number with an explanation on hover.
 * The model also now and then slips in a few Chinese characters mid-sentence; they are dropped.
 */
function rapikan(teks: string): string {
  return teks
    .replace(/<span[^>]*data-unverified[^>]*>([\s\S]*?)<\/span>/gi, (_, isi: string) => `[${isi.replace(/[[\]]/g, "")}](#belum-terverifikasi)`)
    .replace(/<\/?span[^>]*>/gi, "")
    .replace(/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]+/g, "");
}

const KOMPONEN_MD = {
  a: ({ href, children, ...rest }: React.ComponentProps<"a">) =>
    href === "#belum-terverifikasi" ? (
      <Tip isi="Angka ini dihitung AI dari hasil query, bukan dibaca langsung dari tabel. Cek ulang sebelum dipakai.">
        <span className="cursor-help underline decoration-dotted decoration-amber-500 underline-offset-2">{children}</span>
      </Tip>
    ) : (
      <a href={href} {...rest} target="_blank" rel="noreferrer">
        {children}
      </a>
    ),
};

function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none text-sm dark:prose-invert prose-headings:mb-2 prose-headings:mt-4 prose-headings:text-sm prose-headings:font-semibold prose-p:my-2 prose-p:leading-relaxed prose-li:my-0.5 prose-table:my-2 prose-table:text-xs prose-th:px-2 prose-th:text-xs prose-th:font-medium prose-td:px-2 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={KOMPONEN_MD}>{rapikan(children)}</ReactMarkdown>
    </div>
  );
}

function Composer({ onSend, onStop, busy, placeholder, autoFocus }: { onSend: (t: string) => void; onStop: () => void; busy: boolean; placeholder: string; autoFocus?: boolean }) {
  const [input, setInput] = React.useState("");
  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    onSend(t);
    setInput("");
  };
  return (
    <div className="rounded-2xl border border-border bg-background p-1.5 shadow-xs transition-all focus-within:border-foreground/25">
      <textarea
        value={input}
        rows={2}
        autoFocus={autoFocus}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        aria-label="Pesan untuk AI"
        className="block max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-1.5 px-1 pb-0.5">
        <span className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs text-muted-foreground">
          <Database className="size-3.5" /> Data Pemdi di RantAI Lakehouse
        </span>
        {busy ? (
          <button type="button" onClick={onStop} aria-label="Hentikan" title="Hentikan" className="ml-auto grid size-8 place-items-center rounded-lg bg-foreground text-background transition-colors hover:bg-foreground/85">
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim()}
            aria-label="Kirim"
            className={cn("ml-auto grid size-8 place-items-center rounded-lg transition-colors", input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/85" : "bg-muted text-muted-foreground")}
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

const baru = (): Sesi => ({ id: `${Date.now()}`, judul: "", pada: new Date().toISOString(), turns: [] });

export function Tanya() {
  const [sesi, setSesi] = React.useState<Sesi[]>([]);
  const [aktif, setAktif] = React.useState<Sesi>(baru);
  const [busy, setBusy] = React.useState(false);
  const [riwayat, setRiwayat] = React.useState(false);
  const [siap, setSiap] = React.useState(false);
  const abort = React.useRef<AbortController | null>(null);
  const end = React.useRef<HTMLDivElement>(null);
  const turns = aktif.turns;

  // Conversations are kept in this browser; storage may be unavailable, so every access is guarded.
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Sesi[];
      if (Array.isArray(saved)) setSesi(saved);
      setRiwayat(localStorage.getItem(HISTORY_KEY) === "true");
    } catch {
      // keep the defaults
    }
    setSiap(true);
  }, []);

  const simpan = React.useCallback((s: Sesi) => {
    setSesi((all) => {
      const next = [s, ...all.filter((x) => x.id !== s.id)].slice(0, 30);
      try {
        const ringkas = next.map((x) => ({ ...x, turns: x.turns.map((t) => (t.role === "assistant" && t.result ? { ...t, result: { ...t.result, rows: t.result.rows.slice(0, 100) } } : t)) }));
        localStorage.setItem(KEY, JSON.stringify(ringkas));
      } catch {
        // not remembered; the conversation still works for this visit
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    // Braces matter: newer browsers return a promise from scrollIntoView, and an effect may only return a cleanup function.
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const patch = (fn: (t: Extract<Turn, { role: "assistant" }>) => Extract<Turn, { role: "assistant" }>) =>
    setAktif((s) => {
      const last = s.turns[s.turns.length - 1];
      return last?.role === "assistant" ? { ...s, turns: [...s.turns.slice(0, -1), fn(last)] } : s;
    });

  async function ask(question: string, base: Sesi = aktif) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Turn[] = [...base.turns, { role: "user", content: q }];
    const mulai = Date.now();
    setAktif({ ...base, judul: base.judul || q, turns: [...history, { role: "assistant", content: "", steps: [], pending: true }] });
    setBusy(true);
    abort.current = new AbortController();
    const step = (label: string) => patch((t) => ({ ...t, steps: [...(t.steps ?? []).map((s) => ({ ...s, done: true })), { label, done: false }] }));
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.filter((t) => !(t.role === "assistant" && t.error)).map((t) => ({ role: t.role, content: t.content })) }),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `Server menjawab ${res.status}.`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let final: { answer: string; sql: string | null; columns: string[]; rows: Row[] } | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "status") step(LABEL[ev.phase] ?? "Bekerja");
          else if (ev.type === "tool") step(LABEL[ev.tool] ?? `Memakai ${ev.tool}`);
          else if (ev.type === "delta") patch((t) => ({ ...t, content: t.content + ev.text }));
          else if (ev.type === "error") throw new Error(ev.error);
          else if (ev.type === "done") final = ev;
        }
      }
      if (!final) throw new Error("Kopilot berhenti sebelum menjawab.");
      const f = final;
      patch((t) => ({ ...t, pending: false, content: f.answer || t.content, sql: f.sql, result: f.sql ? { columns: f.columns, rows: f.rows } : undefined, steps: (t.steps ?? []).map((s) => ({ ...s, done: true })), detik: Math.round((Date.now() - mulai) / 1000) }));
      // Follow-up ideas arrive after the answer and never block it.
      fetch("/api/ask/saran", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, answer: f.answer }) })
        .then((r) => r.json())
        .then((r: { saran?: string[] }) => {
          if (r.saran?.length) patch((t) => ({ ...t, saran: r.saran }));
        })
        .catch(() => undefined);
    } catch (e) {
      const stopped = e instanceof DOMException && e.name === "AbortError";
      patch((t) => ({ ...t, pending: false, error: !stopped, content: stopped ? t.content || "Dihentikan." : e instanceof Error ? e.message : "Gagal.", steps: (t.steps ?? []).map((s) => ({ ...s, done: true })) }));
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  // Persist the conversation whenever a turn settles.
  React.useEffect(() => {
    if (!busy && aktif.turns.length) simpan(aktif);
  }, [busy, aktif, simpan]);

  // /tanya?q=... asks that question on arrival, so other pages can link straight to an answer.
  const asked = React.useRef(false);
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q || asked.current) return;
    asked.current = true;
    window.history.replaceState(null, "", "/tanya");
    void ask(q, baru());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mulaiBaru = () => {
    if (!busy) setAktif(baru());
  };
  const setHistory = (next: boolean) => {
    setRiwayat(next);
    try {
      localStorage.setItem(HISTORY_KEY, String(next));
    } catch {
      // not remembered
    }
  };
  const hapus = (id: string) => {
    setSesi((all) => {
      const next = all.filter((x) => x.id !== id);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (aktif.id === id) setAktif(baru());
  };
  const lastUser = [...turns].reverse().find((t) => t.role === "user")?.content;
  const kosong = turns.length === 0;

  return (
    <div className="flex h-[calc(100svh-6rem)] sm:h-[calc(100svh-6.5rem)] lg:h-[calc(100svh-7rem)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 pb-2">
          <h1 title={aktif.judul} className="min-w-0 truncate text-sm font-medium text-foreground">
            {aktif.judul || "AI Tubaba"}
          </h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={mulaiBaru} disabled={busy || kosong} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
              <Plus className="size-4" /> Percakapan baru
            </button>
            <button type="button" aria-pressed={riwayat} onClick={() => setHistory(!riwayat)} className={cn("inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium hover:bg-muted", riwayat && "bg-secondary text-secondary-foreground")}>
              <History className="size-4" /> Riwayat
            </button>
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
          {kosong ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center pb-16">
              <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">{siap ? salam() : " "}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tanyakan apa saja tentang data Pemerintah Digital Kabupaten Tulang Bawang Barat.</p>
              <div className="mt-5">
                <Composer onSend={(t) => ask(t)} onStop={() => abort.current?.abort()} busy={busy} placeholder="Tanyakan data Pemdi…" autoFocus />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {CONTOH.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => ask(c)}
                    className="rounded-full border border-border bg-background px-4 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto py-6 pr-0.5">
                <div className="space-y-1">
                  {turns.map((t, i) => {
                    const terakhir = i === turns.length - 1;
                    return (
                      <div key={i} className="py-3">
                        {t.role === "user" ? (
                          <div className="group flex justify-end">
                            <div className="ml-6 min-w-0">
                              <div className="ml-auto w-fit max-w-full whitespace-pre-wrap rounded-2xl bg-[color-mix(in_oklch,var(--brand-1),transparent_88%)] px-4 py-2.5 text-sm text-foreground">{t.content}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="group min-w-0 text-sm">
                            {t.pending && !t.content ? <Berpikir label={t.steps?.[t.steps.length - 1]?.label ?? "Berpikir"} /> : null}
                            {!t.pending ? <Langkah steps={t.steps ?? []} sql={t.sql} /> : null}
                            {t.error ? (
                              <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                                <p className="min-w-0 flex-1 text-sm text-destructive">{t.content}</p>
                                {terakhir && lastUser ? (
                                  <button type="button" onClick={() => ask(lastUser, { ...aktif, turns: turns.slice(0, -2) })} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-muted">
                                    <RefreshCw className="size-4" /> Coba lagi
                                  </button>
                                ) : null}
                              </div>
                            ) : t.content ? (
                              <Markdown>{t.content}</Markdown>
                            ) : null}
                            {t.pending && t.content ? <p className="mt-1 text-[11px] text-muted-foreground">Menulis… angka diperiksa terhadap data setelah jawaban selesai.</p> : null}
                            {t.result ? <Hasil result={t.result} /> : null}
                            {!t.pending && !t.error ? (
                              <div className="mt-2 flex items-center gap-2">
                                {t.detik ? <span className="text-[10px] text-muted-foreground">{t.detik} dtk</span> : null}
                                <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                                  <Salin text={t.content} label="Salin jawaban" />
                                  {terakhir && lastUser ? (
                                    <IconButton label="Jawab ulang" disabled={busy} onClick={() => ask(lastUser, { ...aktif, turns: turns.slice(0, -2) })}>
                                      <RefreshCw className="size-3" />
                                    </IconButton>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                            {t.saran?.length && terakhir ? (
                              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                {t.saran.map((s) => (
                                  <button key={s} type="button" disabled={busy} onClick={() => ask(s)} className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-left text-xs text-foreground/85 transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50">
                                    {s}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div ref={end} />
              </div>
              <div className="shrink-0">
                <Composer onSend={(t) => ask(t)} onStop={() => abort.current?.abort()} busy={busy} placeholder="Lanjutkan pertanyaan…" />
                <p className="mt-2 text-center text-[11px] text-muted-foreground">AI bisa keliru. Periksa jawabannya; kueri yang dijalankan bisa dibuka di atas tiap jawaban.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {riwayat ? (
        <aside className="ml-4 hidden w-72 shrink-0 flex-col rounded-xl border border-border bg-card lg:flex">
          <header className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">Riwayat</h2>
            <IconButton label="Tutup riwayat" onClick={() => setHistory(false)}>
              <X className="size-3.5" />
            </IconButton>
          </header>
          <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {sesi.length === 0 ? <li className="px-2 py-6 text-center text-xs text-muted-foreground">Belum ada percakapan tersimpan di browser ini.</li> : null}
            {sesi.map((s) => (
              <li key={s.id} className="group flex items-center gap-1">
                <button type="button" disabled={busy} onClick={() => setAktif(s)} className={cn("min-w-0 flex-1 rounded-md px-2 py-1.5 text-left hover:bg-muted", s.id === aktif.id && "bg-sidebar-accent")}>
                  <span className="block truncate text-sm">{s.judul}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {new Date(s.pada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {s.turns.filter((t) => t.role === "user").length} pertanyaan
                  </span>
                </button>
                <span className="opacity-0 group-hover:opacity-100">
                  <IconButton label="Hapus percakapan" onClick={() => hapus(s.id)}>
                    <Trash2 className="size-3" />
                  </IconButton>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}
