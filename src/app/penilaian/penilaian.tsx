"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2, Pencil, Sparkles, TrendingUp } from "lucide-react";
import { Button, Notice } from "@/components/ui";
import { InfoTip, Panel, Tip } from "@/components/viz";
import { Chip, KepalaHalaman, WARNA_STATUS } from "@/components/viz-bukti";
import { hitungIndeks, type Aspek, type Indikator, type KriteriaIndikator, type Predikat } from "@/data/pemdi";
import { cn, fmtDec } from "@/lib/utils";

type Nilai = { indikator_no: number; nilai: number; penjelasan: string; penilai: "AI" | "Manual"; diperbarui: string };
type Temuan = { pernyataan: string; tingkat: number; kutipan: string };
type Bukti = {
  jawaban: { opd: string; kode: string; jenis: string; pertanyaan: string; jawaban: string }[];
  berkas: { id: string; opd: string; nama: string; jenis: string; terbaca: boolean; dibacaAi: boolean; ringkasan: string; temuan: Temuan[] }[];
};
type Butuh = { id: string; nama: string; status: "terpenuhi" | "sebagian" | "perlu_dicek" | "belum_ada"; pemilik: string; tingkat: number; lingkup: string; diminta: string[]; belum: string[]; bukti: { id: string; nama: string; opd: string }[] };
type Sync = { state: "idle" | "running" | "failed"; error?: string };
type State = { penilaian: Nilai[]; bukti: Bukti | null; buktiError?: string; kebutuhan?: Butuh[]; sync: Sync; llm: boolean };
type Usulan = { nilai: number; penjelasan: string; kekurangan: string[]; dasar: { temuan: number; jawaban: number; kebutuhanBelum: number } };

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ error: `Server menjawab ${res.status}.` }));
  if (!res.ok) throw new Error(json.error ?? `Server menjawab ${res.status}.`);
  return json as T;
}

/** "…\n\nBelum ada bukti untuk: a; b." -> the explanation and the list of gaps. */
function pisah(penjelasan: string): { isi: string; kurang: string[] } {
  const m = /\n*Belum ada bukti untuk:\s*([\s\S]*)$/.exec(penjelasan);
  if (!m) return { isi: penjelasan, kurang: [] };
  return { isi: penjelasan.slice(0, m.index).trim(), kurang: m[1].replace(/\.$/, "").split(/;\s*/).filter(Boolean) };
}

const LABEL_STATUS = { terpenuhi: "Terpenuhi", sebagian: "Sebagian", perlu_dicek: "Perlu dicek", belum_ada: "Belum ada" } as const;

/** A KPI card: label, number, a muted line, an optional thin bar. */
function Angka({ label, nilai, sub, info, bilah }: { label: string; nilai: React.ReactNode; sub?: string; info?: React.ReactNode; bilah?: number }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="truncate">{label}</span>
        {info ? <InfoTip isi={info} className="-my-1" /> : null}
      </p>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-[-0.03em]">{nilai}</div>
      {sub ? <p className="truncate text-[11px] text-muted-foreground" title={sub}>{sub}</p> : null}
      {bilah != null ? (
        <span className="mt-2 h-1 w-full rounded-full bg-[var(--viz-grid)]">
          <span className="block h-full rounded-full bg-[var(--viz-pemdi)] transition-[width] duration-700" style={{ width: `${Math.min(1, bilah) * 100}%` }} />
        </span>
      ) : null}
    </div>
  );
}

/** The index, or while scoring is incomplete the provisional one, marked as such. */
function NilaiIndeks({ indeks, sementara, terisi, jumlah }: { indeks: number | null; sementara: number | null; terisi: number; jumlah: number }) {
  if (indeks != null) return <>{fmtDec(indeks)}</>;
  if (sementara == null) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-muted-foreground">{fmtDec(sementara)}</span>
      <span className="inline-flex items-center gap-0.5 self-center">
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground">
          sementara · {terisi}/{jumlah}
        </span>
        <InfoTip isi={`Sementara, dihitung dari ${terisi} dari ${jumlah} indikator yang sudah dinilai. Nilai resmi baru keluar setelah semua indikator dinilai.`} />
      </span>
    </span>
  );
}

/** The 1-5 scale with the predicate bands of Tabel 4 and a marker at the score. */
function Skala({ nilai, predikat }: { nilai: number | null; predikat: Predikat[] }) {
  const pos = (v: number) => `${((v - 1) / 4) * 100}%`;
  return (
    <div className="relative pt-5">
      {nilai != null ? (
        <div className="absolute top-0 -translate-x-1/2 text-[11px] font-semibold tabular-nums" style={{ left: pos(nilai) }}>
          {fmtDec(nilai)}
          <div className="mx-auto mt-0.5 h-2 w-px bg-foreground" />
        </div>
      ) : null}
      <div className="flex h-2.5 gap-0.5">
        {predikat.map((p) => {
          const aktif = nilai != null && nilai >= p.min && (p.level === 5 || nilai < p.max);
          return <div key={p.level} className={cn("rounded-sm", aktif ? "bg-[var(--viz-pemdi)]" : "bg-[var(--viz-grid)]")} style={{ width: `${((p.max - p.min) / 4) * 100}%` }} />;
        })}
      </div>
      <div className="relative mt-1 h-3 text-[10px] tabular-nums text-muted-foreground">
        {[1, 1.5, 2.5, 3.5, 4, 5].map((v) => (
          <span key={v} className={cn("absolute", v === 5 ? "right-0" : v === 1 ? "left-0" : "-translate-x-1/2")} style={v === 1 || v === 5 ? undefined : { left: pos(v) }}>
            {String(v).replace(".", ",")}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Penilaian({ awal, aspek, indikator, kriteria, predikat }: { awal: number; aspek: Aspek[]; indikator: Indikator[]; kriteria: KriteriaIndikator[]; predikat: Predikat[] }) {
  const [no, setNo] = React.useState(awal);
  const [state, setState] = React.useState<State | null>(null);
  const [form, setForm] = React.useState({ nilai: "", penjelasan: "", penilai: "Manual" as "AI" | "Manual" });
  const [edit, setEdit] = React.useState(false);
  const [usulan, setUsulan] = React.useState<Usulan | null>(null);
  const [busy, setBusy] = React.useState<"" | "ai" | "simpan">("");
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState<"temuan" | "kebutuhan" | "survei" | "berkas">("temuan");
  const [lihat, setLihat] = React.useState<number | null>(null);

  const ind = indikator.find((i) => i.no === no)!;
  const k = kriteria.find((x) => x.no === no)!;
  const predikatOf = (v: number) => [...predikat].reverse().find((p) => v >= p.min) ?? predikat[0];

  React.useEffect(() => {
    let live = true;
    setState((s) => (s ? { ...s, bukti: null, kebutuhan: undefined } : s));
    setUsulan(null);
    setError("");
    setEdit(false);
    setLihat(null);
    api<State>(`/api/penilaian?i=${no}`)
      .then((s) => {
        if (!live) return;
        setState(s);
        const p = s.penilaian.find((x) => x.indikator_no === no);
        setForm({ nilai: p ? String(p.nilai) : "", penjelasan: p?.penjelasan ?? "", penilai: p?.penilai ?? "Manual" });
        if (!p) setEdit(true);
      })
      .catch((e) => live && setError(e.message));
    window.history.replaceState(null, "", `/penilaian?i=${no}`);
    return () => {
      live = false;
    };
  }, [no]);

  const nilai = new Map(state?.penilaian.map((p) => [p.indikator_no, p]) ?? []);
  const tersimpan = nilai.get(no);
  const angka = Number(form.nilai.replace(",", "."));
  const valid = form.nilai !== "" && angka >= 1 && angka <= 5;
  const berubah = valid && (!tersimpan || tersimpan.nilai !== angka || tersimpan.penjelasan !== form.penjelasan);
  const level = valid ? predikatOf(angka).level : null;
  const tampilLevel = lihat ?? level ?? 1;
  const hasil = hitungIndeks([...nilai.values()].map((p) => ({ indikator: p.indikator_no, nilai: p.nilai })));
  const { isi, kurang } = pisah(form.penjelasan);
  const temuan = state?.bukti?.berkas.flatMap((b) => b.temuan.map((t) => ({ ...t, opd: b.opd, nama: b.nama }))).sort((a, b) => b.tingkat - a.tingkat) ?? [];

  async function simpan(hapus = false) {
    setBusy("simpan");
    setError("");
    try {
      const r = await api<{ penilaian: Nilai[]; sync: Sync }>("/api/penilaian", { indikator_no: no, nilai: hapus ? null : angka, penjelasan: form.penjelasan, penilai: form.penilai });
      setState((s) => (s ? { ...s, penilaian: r.penilaian, sync: r.sync } : s));
      if (hapus) setForm({ nilai: "", penjelasan: "", penilai: "Manual" });
      setEdit(hapus);
      setUsulan(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
    setBusy("");
  }

  async function usulkan() {
    setBusy("ai");
    setError("");
    try {
      setUsulan(await api<Usulan>("/api/penilaian/ai", { indikator_no: no }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI gagal.");
    }
    setBusy("");
  }

  const TABS = [
    ["temuan", "Temuan dokumen", temuan.length],
    ["kebutuhan", "Kebutuhan data", state?.kebutuhan?.length ?? 0],
    ["survei", "Jawaban survei", state?.bukti?.jawaban.length ?? 0],
    ["berkas", "Berkas", state?.bukti?.berkas.length ?? 0],
  ] as const;

  const aspekIni = hasil.aspek.find((x) => x.no === ind.aspek)!;
  // Provisional index over the indicators scored so far (hitungIndeks adds it once available).
  const sementaraOf = (x: object) => ((x as { sementara?: number | null }).sementara ?? null) as number | null;
  const nAi = [...nilai.values()].filter((p) => p.penilai === "AI").length;

  return (
    <>
      <KepalaHalaman
        judul="Penilaian Indikator"
        info="Isi nilai tingkat kematangan tiap indikator dengan membandingkan bukti OPD terhadap kriteria Permen. AI dapat mengusulkan nilai; usulan baru dipakai setelah disimpan, dan tetap bukan hasil evaluasi resmi."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Angka
          label="Indeks Pemdi"
          nilai={<NilaiIndeks indeks={hasil.indeks} sementara={sementaraOf(hasil)} terisi={hasil.terisi} jumlah={hasil.jumlah} />}
          sub={hasil.indeks != null ? `${predikatOf(hasil.indeks).nama} · ${predikatOf(hasil.indeks).label}` : undefined}
        />
        <Angka
          label="Indikator dinilai"
          nilai={
            <>
              {nilai.size}
              <span className="text-base font-medium text-muted-foreground">/{indikator.length}</span>
            </>
          }
          sub={`${nAi} estimasi AI · ${nilai.size - nAi} manual`}
          bilah={nilai.size / indikator.length}
        />
        <Angka
          label={`Aspek ${ind.aspek}`}
          nilai={<NilaiIndeks indeks={aspekIni.indeks} sementara={sementaraOf(aspekIni)} terisi={aspekIni.terisi} jumlah={aspekIni.jumlah} />}
          sub={aspek.find((a) => a.no === ind.aspek)!.nama}
        />
        <Angka
          label="Sumbangan indikator ini"
          info={`Bobot ${Math.round(ind.bobot * 100)}% × nilai. Paling besar ${fmtDec(ind.bobot * 5, 2)}.`}
          nilai={tersimpan ? fmtDec(ind.bobot * tersimpan.nilai, 3) : "–"}
          sub={`maks. ${fmtDec(ind.bobot * 5, 2)}`}
          bilah={tersimpan ? tersimpan.nilai / 5 : 0}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Panel
          judul="Indikator"
          aksi={<span className="text-xs tabular-nums text-muted-foreground">{nilai.size}/{indikator.length}</span>}
          bodyClassName="px-0 pb-2"
          className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-auto"
        >
          {aspek.map((a) => (
            <div key={a.no}>
              <p className="flex justify-between px-4 pb-0.5 pt-2.5 text-[11px] font-medium text-muted-foreground">
                <span className="truncate">
                  {a.no}. {a.nama.replace(" Layanan Digital Pemerintah", "")}
                </span>
                <span className="tabular-nums">{Math.round(a.bobot * 100)}%</span>
              </p>
              {indikator
                .filter((i) => i.aspek === a.no)
                .map((i) => {
                  const p = nilai.get(i.no);
                  const aktif = i.no === no;
                  return (
                    <Tip key={i.no} isi={`${i.no}. ${i.nama}${p ? ` · ${p.penilai === "AI" ? "estimasi AI" : "manual"}` : " · belum dinilai"}`} className="block">
                      <button
                        type="button"
                        onClick={() => setNo(i.no)}
                        className={cn("relative flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs hover:bg-muted/60", aktif && "bg-muted font-medium")}
                      >
                        {aktif ? <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--viz-pemdi)]" /> : null}
                        <span className="w-4 shrink-0 tabular-nums text-muted-foreground">{i.no}</span>
                        <span className="min-w-0 flex-1 truncate">{i.nama.replace(/^Tingkat (Kematangan|Pengelolaan) /, "")}</span>
                        <span className="h-1.5 w-6 shrink-0 rounded-full bg-[var(--viz-grid)]">
                          <span className="block h-full rounded-full" style={{ width: `${p ? ((p.nilai - 1) / 4) * 100 : 0}%`, background: "var(--viz-pemdi)", opacity: p?.penilai === "AI" ? 0.55 : 1 }} />
                        </span>
                        <span className={cn("w-8 shrink-0 text-right tabular-nums", p ? "font-medium" : "text-muted-foreground")}>{p ? fmtDec(p.nilai) : "–"}</span>
                      </button>
                    </Tip>
                  );
                })}
            </div>
          ))}
        </Panel>

        <div className="min-w-0 space-y-3">
          <section className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
            <header className="flex items-start gap-3 border-b border-border/70 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">
                  Indikator {ind.no} · Aspek {ind.aspek} · bobot {Math.round(ind.bobot * 100)}%
                </p>
                <div className="flex items-center gap-1.5">
                  <h2 className="mt-0.5 text-lg font-semibold leading-6 tracking-[-0.01em]">{ind.nama}</h2>
                  {k.deskripsi ? <InfoTip isi={k.deskripsi.split("\n")[0]} /> : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="outline" aria-label="Indikator sebelumnya" disabled={no === 1} onClick={() => setNo(no - 1)} className="w-8 px-0">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" aria-label="Indikator berikutnya" disabled={no === 20} onClick={() => setNo(no + 1)} className="w-8 px-0">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </header>

            <div className="grid gap-5 p-4 md:grid-cols-[15rem_minmax(0,1fr)]">
              <div>
                <p className="text-5xl font-semibold tabular-nums tracking-[-0.03em]">{valid ? fmtDec(angka) : "–"}</p>
                <p className="mt-2 flex flex-wrap items-center gap-1.5">
                  {valid ? <Chip warna="var(--viz-pemdi)">{predikatOf(angka).nama} · {predikatOf(angka).label}</Chip> : <Chip>Belum dinilai</Chip>}
                  {tersimpan && !berubah ? tersimpan.penilai === "AI" ? <Chip>Estimasi AI</Chip> : <Chip>Manual</Chip> : null}
                  {berubah ? <Chip warna="var(--status-warning)">Belum disimpan</Chip> : null}
                </p>
                <div className="mt-4">
                  <Skala nilai={valid ? angka : null} predikat={predikat} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.05}
                    value={valid ? angka : 1}
                    onChange={(e) => setForm({ ...form, nilai: Number(e.target.value).toFixed(2), penilai: "Manual" })}
                    aria-label="Nilai tingkat kematangan"
                    className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--viz-pemdi)]"
                  />
                  <input
                    inputMode="decimal"
                    value={form.nilai}
                    onChange={(e) => setForm({ ...form, nilai: e.target.value, penilai: "Manual" })}
                    placeholder="1,00"
                    aria-label="Nilai"
                    className="h-8 w-16 rounded-lg border border-input bg-background px-2 text-right text-sm font-medium tabular-nums outline-none focus:border-ring"
                  />
                </div>
                {tersimpan ? <p className="mt-3 text-[11px] text-muted-foreground">Diperbarui {new Date(tersimpan.diperbarui).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p> : null}
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Dasar penilaian</p>
                  {!edit && form.penjelasan ? (
                    <button type="button" onClick={() => setEdit(true)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="size-3.5" /> Ubah
                    </button>
                  ) : null}
                </div>
                {edit ? (
                  <textarea
                    rows={8}
                    value={form.penjelasan}
                    onChange={(e) => setForm({ ...form, penjelasan: e.target.value, penilai: "Manual" })}
                    placeholder="Kriteria mana yang terpenuhi, dan bukti dari OPD mana."
                    className="mt-1 w-full resize-y rounded-lg border border-input bg-background p-2.5 text-sm leading-6 outline-none focus:border-ring"
                  />
                ) : (
                  <>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6">{isi || <span className="text-muted-foreground">Belum ada penjelasan.</span>}</p>
                    {kurang.length ? (
                      <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium">
                          <TrendingUp className="size-3.5 text-[var(--viz-pemdi)]" /> Belum ada bukti untuk naik tingkat
                        </p>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
                          {kurang.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-border/70 px-4 py-3">
              <Button onClick={() => simpan()} disabled={!berubah || busy !== ""}>
                {busy === "simpan" ? <Loader2 className="size-4 animate-spin" /> : null} Simpan
              </Button>
              <Button variant="outline" onClick={usulkan} disabled={busy !== "" || !state?.llm} title={state?.llm ? undefined : "LLM belum dikonfigurasi"}>
                {busy === "ai" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {busy === "ai" ? "AI menilai bukti…" : "Estimasi AI"}
              </Button>
              {tersimpan ? (
                <Button variant="ghost" onClick={() => simpan(true)} disabled={busy !== ""}>
                  Hapus nilai
                </Button>
              ) : null}
              <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                {state?.sync.state === "running" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Menyalin ke lakehouse…
                  </>
                ) : state?.sync.state === "failed" ? (
                  <span className="text-[color:var(--status-serious)]">Salin ke lakehouse gagal: {state.sync.error}</span>
                ) : null}
                <InfoTip isi="Nilai tersimpan disalin ke lakehouse. Nilai manual tidak ditimpa estimasi AI otomatis." />
              </span>
            </footer>
            {error ? <div className="px-4 pb-3"><Notice tone="serious">{error}</Notice></div> : null}
            {usulan ? (
              <div className="mx-4 mb-4 rounded-xl border border-[color-mix(in_oklab,var(--viz-pemdi)_40%,transparent)] bg-[color-mix(in_oklab,var(--viz-pemdi)_5%,transparent)] p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <Chip warna="var(--viz-pemdi)">Estimasi AI</Chip> {fmtDec(usulan.nilai)} · {predikatOf(usulan.nilai).nama}
                  {tersimpan ? <span className="text-xs font-normal text-muted-foreground">(tersimpan: {fmtDec(tersimpan.nilai)})</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Dari {usulan.dasar.temuan} temuan dokumen dan {usulan.dasar.jawaban} jawaban survei; {usulan.dasar.kebutuhanBelum} dokumen kunci belum ada.
                </p>
                <p className="mt-2 leading-6">{usulan.penjelasan}</p>
                {usulan.kekurangan.length ? (
                  <ul className="ml-4 mt-2 list-disc text-xs leading-5 text-muted-foreground">
                    {usulan.kekurangan.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => {
                      setForm({ nilai: String(usulan.nilai), penjelasan: usulan.penjelasan + (usulan.kekurangan.length ? `\n\nBelum ada bukti untuk: ${usulan.kekurangan.join("; ")}.` : ""), penilai: "AI" });
                      setUsulan(null);
                      setEdit(false);
                    }}
                  >
                    Pakai estimasi ini
                  </Button>
                  <Button variant="ghost" onClick={() => setUsulan(null)}>
                    Abaikan
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <Panel judul="Kriteria Permen PANRB 8/2026" info="Klik tingkat untuk membaca kriterianya.">
            <div className="flex flex-wrap gap-1.5">
              {k.tingkat.map((t) => {
                const p = predikat[t.level - 1];
                return (
                  <button
                    key={t.level}
                    type="button"
                    onClick={() => setLihat(t.level)}
                    className={cn(
                      "min-w-28 flex-1 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                      tampilLevel === t.level ? "border-[var(--viz-pemdi)] bg-[color-mix(in_oklab,var(--viz-pemdi)_8%,transparent)]" : "border-border/70 hover:bg-muted/40",
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-xs font-semibold">
                      {t.level} · {p.nama}
                      {level === t.level ? <span className="rounded-full bg-[var(--viz-pemdi)] px-1.5 text-[10px] font-medium text-white">saat ini</span> : null}
                      {level != null && level + 1 === t.level ? <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">target</span> : null}
                    </p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">{fmtDec(p.min)} – {p.level === 5 ? "5,00" : `< ${fmtDec(p.max)}`}</p>
                  </button>
                );
              })}
            </div>
            <ol className="mt-3 space-y-1.5 text-sm leading-6">
              {k.tingkat[tampilLevel - 1].kriteria
                .replace(/ (\d)\. /g, "\n$1. ")
                .split("\n")
                .map((baris, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--viz-pemdi)]" />
                    <span>{baris.replace(/^\d\.\s*/, "")}</span>
                  </li>
                ))}
            </ol>
          </Panel>

          <section className="rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]">
            <header className="flex flex-wrap items-center gap-1 border-b border-border/70 px-2 py-1.5">
              {TABS.map(([key, label, n]) => (
                <button key={key} type="button" onClick={() => setTab(key)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm", tab === key ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60")}>
                  {label} <span className="text-xs tabular-nums opacity-60">{n}</span>
                </button>
              ))}
            </header>
            <div className="max-h-[34rem] overflow-auto p-3">
              {!state?.bukti && !state?.buktiError ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Memuat bukti…
                </p>
              ) : state.buktiError ? (
                <Notice tone="warning">Bukti tidak dapat dibaca dari lakehouse: {state.buktiError}</Notice>
              ) : tab === "temuan" ? (
                temuan.length ? (
                  <ul className="space-y-2">
                    {temuan.map((t, i) => (
                      <li key={i} className="rounded-xl border border-border/70 p-2.5">
                        <p className="text-sm leading-6">{t.pernyataan}</p>
                        {t.kutipan ? <p className="mt-1 border-l-2 border-border pl-2 text-xs italic leading-5 text-muted-foreground">“{t.kutipan}”</p> : null}
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Chip warna="var(--viz-pemdi)">Tingkat {t.tingkat}</Chip> {t.opd} <span className="opacity-70">· {t.nama}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">AI tidak menemukan bukti indikator ini di dokumen yang ada.</p>
                )
              ) : tab === "kebutuhan" ? (
                <ul className="space-y-2">
                  {(state.kebutuhan ?? []).map((b) => (
                    <li key={b.id} className="rounded-xl border border-border/70 p-2.5">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">{b.id}</span>
                        <p className="min-w-0 flex-1 text-sm leading-5">{b.nama}</p>
                        <Chip warna={WARNA_STATUS[b.status]}>{LABEL_STATUS[b.status]}</Chip>
                      </div>
                      <p className="mt-1 pl-8 text-[11px] text-muted-foreground">
                        Pemilik: {b.pemilik} · diperlukan mulai tingkat {b.tingkat}
                        {b.bukti.length ? ` · ${b.bukti.length} berkas` : ""}
                        {b.belum.length ? ` · ${b.belum.length} OPD belum menyerahkan` : ""}
                      </p>
                      {b.belum.length ? <p className="mt-1 pl-8 text-[11px] leading-4 text-muted-foreground/80">{b.belum.join(" · ")}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : tab === "survei" ? (
                state.bukti!.jawaban.length ? (
                  <ul className="space-y-2">
                    {state.bukti!.jawaban.map((j, i) => (
                      <li key={i} className="rounded-xl border border-border/70 p-2.5 text-xs">
                        <p className="flex flex-wrap items-center gap-1.5 font-medium">
                          {j.opd} <Chip>{j.kode}</Chip> <Chip warna={j.jenis === "To-Be" ? undefined : "var(--viz-makro)"}>{j.jenis === "To-Be" ? "Rencana" : "Kondisi saat ini"}</Chip>
                        </p>
                        <p className="mt-1 text-muted-foreground">{j.pertanyaan}</p>
                        <p className="mt-1 text-sm leading-6">{j.jawaban}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada jawaban survei untuk indikator ini.</p>
                )
              ) : state.bukti!.berkas.length ? (
                <ul className="space-y-2">
                  {state.bukti!.berkas.map((b) => (
                    <li key={b.id} className="flex items-start gap-2 rounded-xl border border-border/70 p-2.5 text-xs">
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm">{b.nama}</p>
                        <p className="text-muted-foreground">{b.opd}</p>
                        {b.ringkasan ? <p className="mt-1 leading-5 text-muted-foreground">{b.ringkasan}</p> : null}
                      </div>
                      {b.dibacaAi ? <Chip warna={b.temuan.length ? "var(--viz-pemdi)" : undefined}>{b.temuan.length} temuan</Chip> : b.terbaca ? <Chip>Menunggu AI</Chip> : <Chip warna="var(--status-warning)">Tak terbaca</Chip>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada berkas untuk indikator ini.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
