"use client";

/**
 * Pieces shared by the report-style dashboards (Kinerja Makro, Capaian SPM,
 * Dukungan PROSN): the page header with its year selector, the kategori chip,
 * the source chip, a percent sparkline and trend chart, the Excel/print
 * toolbar, and the source list that closes every page. Each dashboard passes
 * its own labels and colour; the look stays the same everywhere.
 */
import * as React from "react";
import Link from "next/link";
import { ChevronRight, Download, ExternalLink, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InfoTip, Panel, Tip, TipCard } from "@/components/viz";
import { Chip, Pil } from "@/components/viz-bukti";
import type { SumberMakro } from "@/lib/makro";
import { hrefHalaman } from "@/lib/makro-tampil";
import { cn, fmtInt } from "@/lib/utils";

/* ------------------------------------------------------------ Tooltip text */

export const Judul = ({ children }: { children: React.ReactNode }) => <p className="font-medium text-foreground">{children}</p>;
export const Baris = ({ k, v }: { k: React.ReactNode; v: React.ReactNode }) => (
  <p className="flex justify-between gap-4">
    <span className="text-muted-foreground">{k}</span>
    <span className="text-right font-medium tabular-nums">{v}</span>
  </p>
);
export const Pisah = ({ children }: { children: React.ReactNode }) => <div className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{children}</div>;

export const tombolLaporan = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50";
/** Table cell and header classes of the report tables. */
export const sel = "border-b border-border/60 px-2.5 py-2 align-top";
export const kepala = "border-b border-border px-2.5 py-2 text-left text-[11px] font-medium text-muted-foreground align-bottom";

/* ------------------------------------------------------------ Small marks */

/** A kategori as a dot + label chip; the bands sit in the tooltip. */
export function ChipKategori({ label, warna, info, kecil }: { label: string | null | undefined; warna?: string; info?: React.ReactNode; kecil?: boolean }) {
  if (!label) return <span className="text-[11px] text-muted-foreground">–</span>;
  return (
    <Tip isi={info}>
      <Chip warna={warna} className={cn(info && "cursor-help", kecil && "h-[18px] px-1.5 text-[10px]")}>
        {label}
      </Chip>
    </Tip>
  );
}

/** "BPS Tubaba · Dalam Angka 2026 · hlm. 566" as a link to that page of the file. */
export function ChipSumber({ s, halaman, label, className, href = hrefHalaman }: { s?: SumberMakro; halaman: number | null; label: string; className?: string; href?: (s: SumberMakro, halaman: number | null) => string }) {
  if (!s) return null;
  return (
    <Tip
      isi={
        <>
          <Judul>{s.judul}</Judul>
          <p className="text-muted-foreground">
            {s.penerbit}
            {s.tahunTerbit ? ` · ${s.tahunTerbit}` : ""}
            {halaman != null ? ` · halaman PDF ${halaman}` : ""}
          </p>
          <p className="mt-1 text-muted-foreground">Klik untuk membuka berkas di tab baru.</p>
        </>
      }
      className={cn("min-w-0 max-w-full", className)}
    >
      <a
        href={href(s, halaman)}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex h-5 min-w-0 max-w-full items-center gap-1 rounded-full bg-muted px-2 text-[10.5px] font-medium text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      >
        <FileText className="size-3 shrink-0" />
        <span className="truncate">{label}</span>
      </a>
    </Tip>
  );
}

/** "belum diverifikasi" pill; the tooltip says where the numbers come from. */
export function BelumVerifikasi({ isi, label = "belum diverifikasi" }: { isi: React.ReactNode; label?: string }) {
  return (
    <Tip isi={isi}>
      <span className="cursor-help whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{label}</span>
    </Tip>
  );
}

/* ------------------------------------------------------------------ Header */

export type AngkaKepala = { nilai: React.ReactNode; label: string; info?: React.ReactNode };

/** Breadcrumb, coloured title with its (i) and verification pill, a few numbers, and the year selector. */
export function KepalaDasbor({
  judul,
  info,
  angka,
  tahun,
  tahunPilihan,
  onTahun,
  jejak,
  warna,
  verifikasi,
  sub = "Kab. Tulang Bawang Barat",
}: {
  judul: React.ReactNode;
  info?: React.ReactNode;
  angka: AngkaKepala[];
  tahun?: number;
  tahunPilihan?: number[];
  onTahun?: (t: number) => void;
  jejak?: { href: string; label: string }[];
  warna: string;
  verifikasi?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 print:hidden">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 px-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        {(jejak ?? []).map((j, i, arr) => (
          <span key={j.href} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0 opacity-60" />
            {i === arr.length - 1 ? (
              <span className="max-w-80 truncate font-medium text-foreground">{j.label}</span>
            ) : (
              <Link href={j.href} className="max-w-56 truncate hover:text-foreground">
                {j.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{sub}</p>
          <div className="flex items-center gap-1.5">
            <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: warna }} />
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">{judul}</h1>
            {info ? <InfoTip isi={info} /> : null}
            {verifikasi ? <BelumVerifikasi isi={verifikasi} /> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-6 sm:gap-8">
          <dl className="flex gap-6 sm:gap-8">
            {angka.map((a) => (
              <Tip key={a.label} isi={a.info} className="block">
                <div className={cn("text-right", a.info && "cursor-help")}>
                  <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{a.nilai}</dd>
                  <dt className="text-[11px] text-muted-foreground">{a.label}</dt>
                </div>
              </Tip>
            ))}
          </dl>
          {tahunPilihan && tahun != null && onTahun ? (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-muted-foreground">Tahun</span>
              <PilihTahun opsi={tahunPilihan} nilai={tahun} onUbah={onTahun} />
            </div>
          ) : null}
        </div>
      </header>
    </div>
  );
}

export function PilihTahun({ opsi, nilai, onUbah }: { opsi: number[]; nilai: number; onUbah: (t: number) => void }) {
  return <Pil opsi={opsi.map((t) => ({ key: String(t), label: String(t) }))} nilai={String(nilai)} onUbah={(k) => onUbah(Number(k))} />;
}

/** Keep view state (tab, year…) in the address bar so the view can be linked; null or the default removes the key. */
export function useParamUrl(param: Record<string, string | null>) {
  const kunci = JSON.stringify(param);
  React.useEffect(() => {
    const p = JSON.parse(kunci) as Record<string, string | null>;
    const u = new URL(window.location.href);
    for (const [k, v] of Object.entries(p)) {
      if (v == null) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    }
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u);
  }, [kunci]);
}

/* ---------------------------------------------------------------- Exports */

export type LembarExcel = { nama: string; baris: (string | number | null)[][]; lebar?: number[] };

/** Build and download an .xlsx from plain rows (the `xlsx` package is loaded only when asked). */
export async function unduhExcel(berkas: string, lembar: LembarExcel[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const l of lembar) {
    const ws = XLSX.utils.aoa_to_sheet(l.baris.map((r) => r.map((c) => c ?? "")));
    if (l.lebar) ws["!cols"] = l.lebar.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, l.nama);
  }
  XLSX.writeFile(wb, berkas);
}

/** Absolute address for a link written into a file or onto paper. */
export const urlPenuh = (href: string) => new URL(href, window.location.origin).href;

/** The Excel and print buttons above a report, with what the files contain in the (i). */
export function AlatLaporan({ onExcel, info, children }: { onExcel: () => Promise<void>; info?: React.ReactNode; children?: React.ReactNode }) {
  const [unduh, setUnduh] = React.useState(false);
  const klik = async () => {
    setUnduh(true);
    try {
      await onExcel();
    } finally {
      setUnduh(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 px-1 print:hidden">
      <button type="button" onClick={klik} disabled={unduh} className={tombolLaporan}>
        <Download className="size-3.5" /> {unduh ? "Menyiapkan…" : "Unduh Excel"}
      </button>
      <button type="button" onClick={() => window.print()} className={tombolLaporan}>
        <Printer className="size-3.5" /> Cetak / PDF
      </button>
      {info ? <InfoTip isi={info} /> : null}
      {children}
    </div>
  );
}

/** A4 landscape print setup and the title printed above the tables. */
export function KepalaCetak({ judul, sub }: { judul: string; sub: string }) {
  return (
    <>
      <style>{"@media print { @page { size: A4 landscape; margin: 12mm } html, body { background: white !important } }"}</style>
      <div className="hidden text-center print:block">
        <p className="text-base font-semibold uppercase leading-6">{judul}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Percent charts */

export type TitikPersen = { tahun: number; nilai: number | null };

const fmtP = (v: number, d = 2) => `${v.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

/** A percentage over the years as a sparkline, the selected year marked. */
export function GarisPersen({ titik, tahun, warna, tinggi = 40, maks = 100 }: { titik: TitikPersen[]; tahun?: number; warna: string; tinggi?: number; maks?: number }) {
  const rows = titik.filter((t) => t.nilai != null);
  if (rows.length < 2) return <div style={{ height: tinggi }} />;
  const min = Math.min(...rows.map((r) => r.nilai as number));
  return (
    <ResponsiveContainer width="100%" height={tinggi}>
      <LineChart data={rows} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <YAxis hide domain={[Math.min(min, maks - 10), maks]} />
        <XAxis dataKey="tahun" hide />
        <Tooltip
          cursor={{ stroke: "var(--viz-grid)", strokeWidth: 8 }}
          content={({ active, payload }) => {
            const r = payload?.[0]?.payload as TitikPersen | undefined;
            return active && r ? (
              <TipCard>
                <Baris k={r.tahun} v={r.nilai == null ? "–" : fmtP(r.nilai)} />
              </TipCard>
            ) : null;
          }}
        />
        <Line
          dataKey="nilai"
          stroke={warna}
          strokeWidth={2}
          isAnimationActive={false}
          dot={(p: { cx?: number; cy?: number; payload?: { tahun: number }; index?: number }) =>
            p.payload?.tahun === tahun ? <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={warna} stroke="var(--card)" strokeWidth={2} /> : <g key={p.index} />
          }
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export type DeretPersen = { key: string; nama: string; warna: string; tebal?: number; putus?: string; titik: TitikPersen[] };

/**
 * Several percentage series on one 0..100-ish axis, with a dashed target line.
 * `tip` renders the hovered year; the last point of each series is labelled.
 */
export function TrenPersen({
  deret,
  target = 100,
  tinggi = 280,
  tip,
}: {
  deret: DeretPersen[];
  target?: number | null;
  tinggi?: number;
  tip: (tahun: number) => React.ReactNode;
}) {
  const tahun = [...new Set(deret.flatMap((d) => d.titik.filter((t) => t.nilai != null).map((t) => t.tahun)))].sort((a, b) => a - b);
  const rows = tahun.map((th) => Object.fromEntries([["tahun", th], ...deret.map((d) => [d.key, d.titik.find((t) => t.tahun === th)?.nilai ?? null])]) as Record<string, number | null>);
  const semua = deret.flatMap((d) => d.titik.map((t) => t.nilai)).filter((v): v is number => v != null);
  const min = Math.max(0, Math.floor((Math.min(...semua, target ?? 100) - 5) / 10) * 10);
  const akhir = Object.fromEntries(deret.map((d) => [d.key, d.titik.filter((t) => t.nilai != null).at(-1)?.tahun]));
  const label = (d: DeretPersen, i: number) =>
    function Label(p: { x?: number | string; y?: number | string; index?: number }) {
      const row = rows[p.index ?? -1];
      if (!row || row.tahun !== akhir[d.key] || p.x == null || p.y == null || deret.length < 2) return null;
      return (
        <text x={Number(p.x) + 8} y={Number(p.y) + (i === deret.length - 1 ? 16 : -4)} fontSize={11} fill="var(--viz-ink)" fontWeight={i === deret.length - 1 ? 600 : 400}>
          {d.nama.length > 14 ? `${d.nama.slice(0, 13)}…` : d.nama}
        </text>
      );
    };
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {[...deret].reverse().map((d) => (
          <span key={d.key} className="flex items-center gap-1.5">
            <svg width="16" height="6" aria-hidden>
              <line x1="0" y1="3" x2="16" y2="3" stroke={d.warna} strokeWidth={2} strokeDasharray={d.putus} />
            </svg>
            {d.nama}
          </span>
        ))}
        {target != null ? (
          <span className="flex items-center gap-1.5">
            <svg width="16" height="6" aria-hidden>
              <line x1="0" y1="3" x2="16" y2="3" stroke="var(--viz-ink)" strokeWidth={1.5} strokeDasharray="4 3" />
            </svg>
            Target {fmtP(target, 0)}
          </span>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height={tinggi}>
        <LineChart data={rows} margin={{ top: 18, right: deret.length > 1 ? 112 : 24, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="tahun" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--viz-ink)" }} padding={{ left: 12, right: 12 }} />
          <YAxis width={44} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--viz-ink)" }} domain={[min, Math.max(100, ...semua)]} tickFormatter={(v: number) => `${v}%`} />
          {target != null ? <ReferenceLine y={target} stroke="var(--viz-ink)" strokeDasharray="4 3" strokeWidth={1.5} /> : null}
          <Tooltip
            cursor={{ stroke: "var(--viz-ink)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const r = payload?.[0]?.payload as { tahun: number } | undefined;
              return active && r ? <TipCard className="min-w-56">{tip(r.tahun)}</TipCard> : null;
            }}
          />
          {deret.map((d, i) => (
            <Line
              key={d.key}
              dataKey={d.key}
              stroke={d.warna}
              strokeWidth={d.tebal ?? 2}
              strokeDasharray={d.putus}
              dot={{ r: i === deret.length - 1 ? 3.5 : 2.5, fill: d.warna, stroke: "var(--card)", strokeWidth: 1.5 }}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
              connectNulls
              label={label(d, i)}
              animationDuration={600}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------------------------------------- Sources */

const kelasTombol = "inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-medium hover:bg-muted";

export type GrupSumber = { nama: string; sumber: SumberMakro[] };

const ukuran = (kb: number | null) => (kb == null ? "–" : kb >= 1024 ? `${(kb / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB` : `${kb} KB`);
const ikonBerkas = (s: SumberMakro) => (s.jenis === "dokumen" && /\.xlsx?$/i.test(s.judul) ? FileSpreadsheet : FileText);

/**
 * Every source document behind a dashboard's numbers, grouped, each openable,
 * with the pages cited and how many values or assessments it supplies.
 */
export function DaftarSumber({
  grup,
  jumlah,
  judul,
  info,
  warna,
  judulTampil,
  tag,
  halaman,
  satuan = "nilai",
  infoJumlah,
  className,
  href = hrefHalaman,
}: {
  href?: (s: SumberMakro, halaman: number | null) => string;
  grup: GrupSumber[];
  jumlah: Map<string, number>;
  judul: React.ReactNode;
  info: React.ReactNode;
  warna: string;
  judulTampil: (s: SumberMakro) => string;
  tag?: (s: SumberMakro) => string[];
  halaman?: (id: string) => number[];
  satuan?: string;
  infoJumlah?: (n: number) => string;
  className?: string;
}) {
  const total = grup.reduce((a, g) => a + g.sumber.length, 0);
  // Printed copies carry the full address, since a link cannot be clicked on paper.
  const [asal, setAsal] = React.useState("");
  React.useEffect(() => setAsal(window.location.origin), []);
  return (
    <Panel
      className={cn("break-inside-avoid", className)}
      judul={
        <span className="flex items-center gap-2">
          {judul}
          <span className="rounded-full bg-muted px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground">{total}</span>
        </span>
      }
      info={info}
    >
      <div className="flex flex-col gap-4">
        {grup.map((k) => (
          <section key={k.nama}>
            <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              {k.nama}
              <span className="tabular-nums opacity-70">{k.sumber.length}</span>
            </h3>
            <ul className="grid gap-1.5 xl:grid-cols-2 print:grid-cols-1">
              {k.sumber.map((s) => {
                const n = jumlah.get(s.id) ?? 0;
                const hlm = halaman ? halaman(s.id) : [];
                const Ikon = ikonBerkas(s);
                return (
                  <li key={s.id} className="grid break-inside-avoid items-center gap-x-3 gap-y-1 rounded-xl border border-border/60 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <Ikon className="size-3.5 shrink-0 text-muted-foreground" />
                        <Tip isi={<><Judul>{s.judul}</Judul><p className="text-muted-foreground">{s.penerbit}</p></>} className="min-w-0">
                          <a href={s.href} target="_blank" rel="noreferrer" className="block truncate text-[13px] font-medium hover:underline">
                            {judulTampil(s)}
                          </a>
                        </Tip>
                        {s.tahunTerbit ? <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{s.tahunTerbit}</span> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 pl-5">
                        {(tag ? tag(s) : []).map((i) => (
                          <span key={i} className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                            {i}
                          </span>
                        ))}
                        {hlm.map((h) => (
                          <a key={h} href={href(s, h)} target="_blank" rel="noreferrer" className="rounded-full px-1.5 text-[10px] font-medium hover:underline" style={{ background: `color-mix(in oklab, ${warna} 12%, transparent)`, color: warna }}>
                            hlm. {h}
                          </a>
                        ))}
                        {s.jenis === "dokumen" && s.dokId ? (
                          <Link href={`/dokumen?dok=${s.dokId}`} className="rounded-full px-1.5 text-[10px] text-muted-foreground underline-offset-2 hover:underline print:hidden">
                            di Dokumen
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-5 text-[11px] text-muted-foreground sm:pl-0">
                      <Tip isi={n ? (infoJumlah?.(n) ?? `${n} ${satuan} di dasbor ini dikutip dari berkas ini.`) : "Belum ada angka yang dikutip; dokumen pendukung."}>
                        <span className={cn("w-16 cursor-help text-right tabular-nums", n && "font-medium text-foreground")}>{n ? `${fmtInt(n)} ${satuan}` : "pendukung"}</span>
                      </Tip>
                      <span className="w-14 text-right tabular-nums">{ukuran(s.ukuranKb)}</span>
                      <a href={s.href} target="_blank" rel="noreferrer" className={cn(kelasTombol, "print:hidden")}>
                        Buka <ExternalLink className="size-3" />
                      </a>
                      <span className="hidden max-w-80 truncate text-[9px] print:inline">
                        {/^https?:/.test(s.href) ? "" : asal}
                        {s.href}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Panel>
  );
}

/** Compact source footer for the Beranda: the most-cited few as links, the rest one click away. */
export function SumberRingkasan({
  sumber,
  jumlah,
  label,
  judul,
  info,
  warna,
  satuan = "nilai",
  awal = 4,
}: {
  sumber: SumberMakro[];
  jumlah: Map<string, number>;
  label: (s: SumberMakro) => string;
  judul: string;
  info: React.ReactNode;
  warna: string;
  satuan?: string;
  awal?: number;
}) {
  const [semua, setSemua] = React.useState(false);
  const urut = [...sumber].sort((a, b) => (jumlah.get(b.id) ?? 0) - (jumlah.get(a.id) ?? 0) || (b.tahunTerbit ?? 0) - (a.tahunTerbit ?? 0));
  const tampil = semua ? urut : urut.slice(0, awal);
  return (
    <div className="mt-3 border-t border-border/60 pt-2.5">
      <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {judul}
        <InfoTip isi={info} />
      </p>
      <ul className="flex flex-wrap gap-1">
        {tampil.map((s) => (
          <li key={s.id} className="min-w-0 max-w-full">
            <Tip isi={<><Judul>{s.judul}</Judul><p className="text-muted-foreground">{s.penerbit}{jumlah.get(s.id) ? ` · ${jumlah.get(s.id)} ${satuan}` : " · pendukung"}</p></>} className="max-w-full">
              <a href={s.href} target="_blank" rel="noreferrer" className="inline-flex h-5 max-w-full items-center gap-1 rounded-full bg-muted px-2 text-[10.5px] text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
                <span className="truncate">{label(s)}</span>
              </a>
            </Tip>
          </li>
        ))}
        {urut.length > awal ? (
          <li>
            <button type="button" onClick={() => setSemua((v) => !v)} className="inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-medium hover:bg-muted" style={{ color: warna }}>
              {semua ? "ringkas" : `+${urut.length - awal} sumber lainnya`}
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
