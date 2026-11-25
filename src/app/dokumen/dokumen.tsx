"use client";

import * as React from "react";
import { ChevronDown, FileText, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { Button, Notice } from "@/components/ui";
import { BatangH, Panel, Tip } from "@/components/viz";
import { Cari, Chip, Corong, KepalaHalaman, kelasField, Pil, Pilihan } from "@/components/viz-bukti";
import { cn, fmtInt } from "@/lib/utils";

type Ai = {
  status: "selesai" | "gagal";
  error?: string;
  jenis_dokumen: string;
  judul: string;
  ringkasan: string;
  tahun: string;
  temuan: { indikator: number; pernyataan: string; tingkat: number; kutipan: string }[];
  metrik: { nama: string; nilai: string; satuan: string; periode: string }[];
  kebutuhan: string[];
};
type Dok = { id: string; opd: string; nama: string; jenis: string; ukuran_kb: number; sumber: string; diunggah: string; karakter: number; metode: "teks" | "ocr" | ""; ai?: Ai };
type State = {
  dokumen: Dok[];
  antrean: { aktif: string | null; sedang: string[]; menunggu: number; selesai: number; total: number; llm: boolean };
  estimasi: boolean;
  sinkron: { state: "idle" | "running" | "failed"; error?: string };
};
type Preview = { columns: string[]; rows: string[][]; using: { sheet?: string } };
type Tabel = { id: string; nama: string; preview: Preview; sheets: string[]; sheet: string; table: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({ error: `Server menjawab ${res.status}.` }));
  if (!res.ok) throw new Error(json.error ?? `Server menjawab ${res.status}.`);
  return json as T;
}
const post = (body: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const tahap = (d: Dok, aktif: string[]) => (aktif.includes(d.id) ? "diproses" : d.karakter <= 80 ? "tanpa" : d.ai?.status === "selesai" ? "selesai" : d.ai?.status === "gagal" ? "gagal" : "menunggu");

const FILTER = [
  { key: "semua", label: "Semua" },
  { key: "selesai", label: "Dibaca AI" },
  { key: "menunggu", label: "Menunggu AI" },
  { key: "gagal", label: "Gagal" },
  { key: "tanpa", label: "Tak terbaca" },
];

export function Dokumen({ opd, kebutuhan, awal, awalDok }: { opd: string[]; kebutuhan: Record<string, string>; awal: string; awalDok?: string | null }) {
  const [state, setState] = React.useState<State | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState("");
  // A link from a framework page opens that file directly, whatever the filter.
  const [filter, setFilter] = React.useState(awalDok ? "semua" : FILTER.some((f) => f.key === awal) ? awal : "semua");
  const [cari, setCari] = React.useState("");
  const [pemilik, setPemilik] = React.useState("");
  const [buka, setBuka] = React.useState<string | null>(awalDok ?? null);
  const [tabel, setTabel] = React.useState<Tabel | null>(null);
  const [pesan, setPesan] = React.useState("");
  const [over, setOver] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async () => {
    try {
      setState(await api<State>("/api/dokumen"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat.");
    }
  }, []);
  React.useEffect(() => void refresh(), [refresh]);

  // Poll while the pipeline is doing something.
  const sibuk = Boolean(state && (state.antrean.aktif || state.antrean.menunggu || state.estimasi || state.sinkron.state === "running"));
  React.useEffect(() => {
    if (!sibuk) return;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [sibuk, refresh]);

  async function unggah(files: FileList | File[]) {
    setError("");
    setPesan("");
    for (const file of Array.from(files)) {
      setBusy(`Membaca ${file.name}… (pindaian memakai OCR, bisa beberapa puluh detik)`);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("opd", pemilik);
        const r = await api<{ kind: string; dok?: Dok & { antre: boolean }; upload?: { id: string; originalFilename: string }; preview?: Preview; sheets?: string[]; suggestedTable?: string }>("/api/upload", { method: "POST", body: form });
        if (r.kind === "tabel" && r.upload && r.preview) {
          setTabel({ id: r.upload.id, nama: r.upload.originalFilename, preview: r.preview, sheets: r.sheets ?? [], sheet: r.preview.using.sheet ?? "", table: r.suggestedTable ?? "" });
        } else if (r.dok) {
          setBuka(r.dok.id);
          setPesan(
            r.dok.karakter <= 80
              ? `${file.name}: tidak ada teks yang bisa dibaca, jadi tidak dapat diproses AI.`
              : r.dok.antre
                ? `${file.name}: ${fmtInt(r.dok.karakter)} karakter terbaca${r.dok.metode === "ocr" ? " lewat OCR" : ""}, sedang diproses AI.`
                : `${file.name}: ${fmtInt(r.dok.karakter)} karakter terbaca. AI belum aktif, jadi belum diekstrak.`,
          );
        }
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : "gagal"}`);
      }
      await refresh();
    }
    setBusy("");
  }

  async function proses(ids: string[] | "semua", ulang = false) {
    setError("");
    try {
      const r = await api<{ diantrekan: number }>("/api/dokumen", post({ ids, ulang }));
      setPesan(r.diantrekan ? `${r.diantrekan} dokumen masuk antrean AI.` : "Tidak ada dokumen yang perlu diproses.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal.");
    }
    void refresh();
  }

  async function muatTabel() {
    if (!tabel) return;
    setBusy("Memuat tabel ke lakehouse…");
    try {
      const r = await api<{ table: string }>("/api/upload/ingest", post({ id: tabel.id, sheet: tabel.sheet || undefined, table: tabel.table }));
      setPesan(`Tabel ${r.table} sedang dimuat ke lakehouse; dalam sekitar satu menit bisa ditanyakan di AI Tubaba.`);
      setTabel(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat.");
    }
    setBusy("");
  }

  const dok = state?.dokumen ?? [];
  const aktif = state?.antrean.sedang ?? [];
  const hitung = (k: string) => dok.filter((d) => k === "semua" || tahap(d, aktif) === k || (k === "menunggu" && tahap(d, aktif) === "diproses")).length;
  const q = cari.trim().toLowerCase();
  const tampil = dok.filter((d) => (filter === "semua" || tahap(d, aktif) === filter || (filter === "menunggu" && tahap(d, aktif) === "diproses")) && (!q || `${d.nama} ${d.opd} ${d.ai?.judul ?? ""} ${d.ai?.jenis_dokumen ?? ""}`.toLowerCase().includes(q)));
  const llm = state?.antrean.llm ?? false;
  const field = kelasField;
  const terbaca = dok.filter((d) => d.karakter > 80).length;
  const nTemuan = dok.reduce((s, d) => s + (d.ai?.temuan.length ?? 0), 0);
  const nMetrik = dok.reduce((s, d) => s + (d.ai?.metrik.length ?? 0), 0);
  const nBertemuan = dok.filter((d) => d.ai?.temuan.length).length;
  const perJenis = new Map<string, number>();
  for (const d of dok) if (d.ai?.jenis_dokumen) perJenis.set(d.ai.jenis_dokumen, (perJenis.get(d.ai.jenis_dokumen) ?? 0) + 1);
  const jenis = [...perJenis].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nama, v]) => ({ nama, v }));

  return (
    <>
      <KepalaHalaman
        judul="Dokumen"
        info="Unggah dokumen apa pun. Teksnya dibaca (OCR bila hasil pindai), lalu AI mengubahnya menjadi temuan, angka, dan pemenuhan kebutuhan data yang mengisi dasbor."
        aksi={
          <Button onClick={() => proses("semua")} disabled={!llm || sibuk} title={llm ? "Proses semua dokumen yang belum dibaca AI" : "AI belum aktif"}>
            {sibuk ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Proses dengan AI
          </Button>
        }
      />

      <Panel
        judul="Alur dokumen"
        info="Dokumen → teks terbaca (lapisan teks, atau OCR untuk pindaian dan foto, 6 halaman pertama) → dibaca AI (jenis, temuan per indikator, angka, kebutuhan data) → estimasi nilai indikator dihitung ulang dan disalin ke lakehouse."
        aksi={
          sibuk && state ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {state.antrean.aktif || state.antrean.menunggu
                ? `AI membaca ${state.antrean.selesai}/${state.antrean.total}`
                : state.estimasi
                  ? "Memperbarui estimasi nilai…"
                  : "Menyalin ke lakehouse…"}
            </span>
          ) : state && !llm ? (
            <Tip isi={<>Isi <code>LLM_KEY</code> di <code>infra/lakehouse.env</code>, jalankan <code>scripts/lakehouse.sh up</code> dan <code>bun run lakehouse:bootstrap</code>, lalu mulai ulang aplikasi. Sampai saat itu dokumen hanya dibaca teksnya.</>}>
              <Chip warna="var(--status-warning)">AI belum aktif</Chip>
            </Tip>
          ) : null
        }
      >
        {state ? (
          <Corong
            tahap={[
              { nama: "Dokumen", nilai: dok.length, info: "Semua berkas yang tercatat.", cabang: [{ nama: "diunggah di aplikasi", nilai: dok.filter((d) => d.sumber === "Unggahan").length }] },
              {
                nama: "Teks terbaca",
                nilai: terbaca,
                info: "Berkas yang teksnya bisa dibaca, langsung atau lewat OCR.",
                cabang: [
                  { nama: "lewat OCR", nilai: dok.filter((d) => d.metode === "ocr").length },
                  { nama: "tak terbaca", nilai: hitung("tanpa"), warna: "var(--status-warning)" },
                ],
              },
              {
                nama: "Dibaca AI",
                nilai: hitung("selesai"),
                info: "Berkas yang sudah diekstrak AI.",
                cabang: [
                  { nama: "menunggu", nilai: hitung("menunggu") },
                  { nama: "gagal", nilai: hitung("gagal"), warna: "var(--status-serious)" },
                ],
              },
              {
                nama: "Temuan",
                nilai: nTemuan,
                rasio: dok.length ? nBertemuan / dok.length : 0,
                info: `Pernyataan bukti per indikator. Batang: ${fmtInt(nBertemuan)} dokumen yang memuat temuan.`,
                cabang: [
                  { nama: "angka", nilai: nMetrik },
                  { nama: "dokumen", nilai: nBertemuan },
                ],
              },
            ]}
          />
        ) : (
          <p className="flex h-20 items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </p>
        )}
      </Panel>

      {state?.sinkron.state === "failed" ? <Notice tone="serious">Penyalinan ke lakehouse gagal: {state.sinkron.error}</Notice> : null}
      {error ? <Notice tone="serious">{error}</Notice> : null}
      {pesan ? <Notice>{pesan}</Notice> : null}

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-4">
        <Panel judul="Unggah" info="PDF, DOCX, PPTX, JPG/PNG, maks. 50 MB. CSV/Excel dimuat sebagai tabel ke lakehouse.">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              void unggah(e.dataTransfer.files);
            }}
            className={cn("grid place-items-center rounded-xl border border-dashed border-border px-4 py-8 text-center transition-colors", over && "border-[var(--viz-pemdi)] bg-[color-mix(in_oklab,var(--viz-pemdi)_6%,transparent)]")}
          >
            <span className="grid size-10 place-items-center rounded-xl" style={{ background: "color-mix(in oklab, var(--viz-pemdi) 12%, transparent)", color: "var(--viz-pemdi)" }}>
              <UploadCloud className="size-5" />
            </span>
            <p className="mt-2 text-sm">Tarik berkas ke sini</p>
            <Button className="mt-3" variant="outline" onClick={() => input.current?.click()} disabled={Boolean(busy)}>
              Pilih berkas
            </Button>
            <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files && unggah(e.target.files).then(() => (e.target.value = ""))} />
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">OPD</span>
            <Pilihan nilai={pemilik} onUbah={setPemilik} semua="Tidak diisi" opsi={opd.map((o) => ({ value: o, label: o }))} className="min-w-0 flex-1" />
          </label>
          {busy ? (
            <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" /> {busy}
            </p>
          ) : null}
        </Panel>
        {jenis.length ? (
          <Panel judul="Jenis dokumen" info="Jenis menurut bacaan AI. Klik batang untuk mencari jenis itu.">
            <BatangH
              data={jenis}
              seri={[{ key: "v", nama: "Dokumen", warna: "var(--viz-pemdi)" }]}
              tinggiBaris={26}
              lebarLabel={130}
              onPilih={(r) => setCari(cari === r.nama ? "" : r.nama)}
              tip={(r) => (
                <>
                  <p className="font-medium">{r.nama}</p>
                  <p className="text-muted-foreground">{fmtInt(r.v)} dokumen</p>
                </>
              )}
            />
          </Panel>
        ) : null}
        </div>

        <Panel
          judul="Daftar dokumen"
          className="lg:col-span-8"
          bodyClassName="px-0 pb-0"
          aksi={
            <span className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-muted-foreground">
                {fmtInt(tampil.length)} dari {fmtInt(dok.length)}
              </span>
              <Cari nilai={cari} onUbah={setCari} placeholder="Cari berkas, OPD, jenis" className="w-56" />
            </span>
          }
        >
          <div className="border-b border-border/70 px-4 pb-2.5">
            <Pil opsi={FILTER.map((f) => ({ ...f, n: hitung(f.key) }))} nilai={filter} onUbah={setFilter} />
          </div>
          {!state ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat…
            </p>
          ) : (
            <ul className="max-h-[calc(100vh-14rem)] min-h-64 divide-y divide-border/50 overflow-auto">
              {tampil.map((d) => {
                const t = tahap(d, aktif);
                const open = buka === d.id;
                return (
                  <li key={d.id}>
                    <button type="button" onClick={() => setBuka(open ? null : d.id)} className={cn("flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-muted/40", open && "bg-muted/40")}>
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px]">{d.ai?.judul || d.nama}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {d.opd || "OPD tidak diisi"} · {d.jenis.toUpperCase()} · {fmtInt(d.ukuran_kb)} KB
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {d.ai?.jenis_dokumen ? <Chip className="hidden max-w-40 truncate xl:inline-flex">{d.ai.jenis_dokumen}</Chip> : null}
                        {d.metode === "ocr" ? <Chip>OCR</Chip> : null}
                        {t === "selesai" ? <Chip warna={d.ai!.temuan.length ? "var(--viz-pemdi)" : undefined}>{d.ai!.temuan.length} temuan</Chip> : null}
                        {t === "diproses" ? (
                          <Chip warna="var(--status-warning)">
                            <Loader2 className="size-3 animate-spin" /> Dibaca AI
                          </Chip>
                        ) : null}
                        {t === "menunggu" ? <Chip>Menunggu AI</Chip> : null}
                        {t === "gagal" ? <Chip warna="var(--status-serious)">AI gagal</Chip> : null}
                        {t === "tanpa" ? <Chip warna="var(--status-warning)">Tak terbaca</Chip> : null}
                      </div>
                      <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </button>
                    {open ? (
                      <div className="space-y-3 border-t border-border/50 bg-muted/20 px-4 py-3 pl-11 text-sm">
                        {d.ai?.judul ? <p className="break-all text-[11px] text-muted-foreground">{d.nama}</p> : null}
                        {t === "tanpa" ? <p className="text-xs text-muted-foreground">Tidak ada teks yang bisa dibaca, juga lewat OCR. Unggah versi yang lebih jelas atau versi teksnya.</p> : null}
                        {t === "gagal" ? <p className="text-xs text-[color:var(--status-serious)]">{d.ai?.error}</p> : null}
                        {t === "menunggu" ? <p className="text-xs text-muted-foreground">{fmtInt(d.karakter)} karakter terbaca{d.metode === "ocr" ? " lewat OCR" : ""}. Belum diekstrak AI.</p> : null}
                        {d.ai?.status === "selesai" ? (
                          <>
                            <p className="leading-6">{d.ai.ringkasan}</p>
                            {d.ai.temuan.length ? (
                              <div>
                                <p className="mb-1 text-[11px] font-medium text-muted-foreground">Temuan</p>
                                <ul className="space-y-1.5">
                                  {d.ai.temuan.map((x, i) => (
                                    <li key={i} className="rounded-lg border border-border/70 bg-card p-2 text-xs">
                                      <p className="text-[13px] leading-5">{x.pernyataan}</p>
                                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-muted-foreground">
                                        <Chip warna="var(--viz-pemdi)">Indikator {x.indikator}</Chip>
                                        <Chip>Tingkat {x.tingkat}</Chip>
                                        {x.kutipan ? <span className="italic">“{x.kutipan}”</span> : null}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">AI tidak menemukan bukti indikator Pemdi di dokumen ini.</p>
                            )}
                            {d.ai.metrik.length ? (
                              <div>
                                <p className="mb-1 text-[11px] font-medium text-muted-foreground">Angka</p>
                                <ul className="flex flex-wrap gap-1.5">
                                  {d.ai.metrik.map((m, i) => (
                                    <li key={i} className="rounded-lg border border-border/70 bg-card px-2 py-1 text-xs">
                                      <span className="text-muted-foreground">{m.nama}: </span>
                                      <span className="font-medium tabular-nums">
                                        {m.nilai} {m.satuan}
                                      </span>
                                      {m.periode ? <span className="text-muted-foreground"> · {m.periode}</span> : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {d.ai.kebutuhan.length ? (
                              <div>
                                <p className="mb-1 text-[11px] font-medium text-muted-foreground">Kebutuhan data dipenuhi</p>
                                <ul className="space-y-0.5 text-xs">
                                  {d.ai.kebutuhan.map((id) => (
                                    <li key={id}>
                                      <span className="font-mono text-muted-foreground">{id}</span> {kebutuhan[id]}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                        {d.karakter > 80 ? (
                          <Button variant="outline" onClick={() => proses([d.id], true)} disabled={!llm || sibuk}>
                            <Sparkles className="size-4" /> {d.ai ? "Proses ulang" : "Proses dengan AI"}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
              {tampil.length === 0 ? <li className="p-6 text-center text-sm text-muted-foreground">Tidak ada dokumen untuk filter ini.</li> : null}
            </ul>
          )}
        </Panel>
      </div>

      {tabel ? (
        <Panel judul={`Muat sebagai tabel: ${tabel.nama}`} info="Berkas tabel dimuat apa adanya ke lakehouse (semua kolom teks) dan bisa ditanyakan di AI Tubaba.">
          <div className="flex flex-wrap items-end gap-2">
            {tabel.sheets.length > 1 ? (
              <label className="text-xs text-muted-foreground">
                Sheet
                <select
                  className={cn(field, "mt-1 block text-foreground")}
                  value={tabel.sheet}
                  onChange={async (e) => {
                    const sheet = e.target.value;
                    const r = await api<{ preview: Preview }>("/api/upload/ingest", post({ id: tabel.id, sheet, dryRun: true }));
                    setTabel({ ...tabel, sheet, preview: r.preview });
                  }}
                >
                  {tabel.sheets.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="text-xs text-muted-foreground">
              Nama tabel
              <input className={cn(field, "mt-1 block w-72 font-mono text-foreground")} value={tabel.table} onChange={(e) => setTabel({ ...tabel, table: e.target.value })} />
            </label>
            <Button onClick={muatTabel} disabled={Boolean(busy) || !tabel.table.trim()}>
              Muat ke lakehouse
            </Button>
            <Button variant="outline" onClick={() => setTabel(null)}>
              Batal
            </Button>
          </div>
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-muted-foreground">
                  {tabel.preview.columns.map((c, i) => (
                    <th key={i} className="whitespace-nowrap px-2 py-1.5">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabel.preview.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    {r.map((v, j) => (
                      <td key={j} className="max-w-xs truncate px-2 py-1">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
