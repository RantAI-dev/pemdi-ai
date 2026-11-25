"use client";

/**
 * Dashboard Pemdi visuals, drawn with Recharts (SVG). Explanations live in
 * hover tooltips so the page itself stays quiet: a number, a name, a chart.
 * Colours come from the --viz-* tokens in globals.css.
 */
import * as React from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RRadar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Tooltip */

/** The card every tooltip on this page uses, chart or not. */
export function TipCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-72 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-5 text-popover-foreground shadow-lg", className)}>{children}</div>
  );
}

/**
 * Hover (or focus) to show `isi` above the child. Rendered in a portal so it
 * is never clipped by a card's overflow.
 */
export function Tip({ isi, children, className }: { isi: React.ReactNode; children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number; bawah: boolean } | null>(null);
  const buka = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const bawah = r.top < 140;
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150), y: bawah ? r.bottom + 8 : r.top - 8, bawah });
  };
  const tutup = () => setPos(null);
  return (
    <span ref={ref} onMouseEnter={buka} onMouseLeave={tutup} onFocus={buka} onBlur={tutup} className={cn("inline-flex", className)}>
      {children}
      {pos && isi
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[100] animate-in fade-in-0 zoom-in-95 duration-100"
              style={{ left: pos.x, top: pos.y, transform: `translate(-50%, ${pos.bawah ? "0" : "-100%"})` }}
            >
              <TipCard>{isi}</TipCard>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

/** A small (i) that explains whatever it sits next to. */
export function InfoTip({ isi, className }: { isi: React.ReactNode; className?: string }) {
  return (
    <Tip isi={isi} className={className}>
      <button type="button" aria-label="Keterangan" className="grid size-5 place-items-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground">
        <Info className="size-3.5" />
      </button>
    </Tip>
  );
}

/** A dashboard card: title, an optional (i), an optional action on the right. */
export function Panel({
  judul,
  info,
  aksi,
  children,
  className,
  bodyClassName,
}: {
  judul: React.ReactNode;
  info?: React.ReactNode;
  aksi?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]", className)}>
      <header className="flex items-center gap-1.5 px-4 pt-3.5">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">{judul}</h2>
        {info ? <InfoTip isi={info} /> : null}
        {aksi ? <div className="ml-auto">{aksi}</div> : null}
      </header>
      <div className={cn("min-w-0 flex-1 px-4 pb-4 pt-2", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------- Charts */

const AXIS = { fontSize: 11, fill: "var(--viz-ink)" };

type Payload = { payload?: Record<string, unknown> };
/** Recharts hands the hovered row to `content`; this turns it into our card. */
function ChartTip({ active, payload, render }: { active?: boolean; payload?: Payload[]; render: (row: Record<string, unknown>) => React.ReactNode }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <TipCard>{render(row)}</TipCard>;
}

export type Seri = { key: string; nama: string; warna: string };

/**
 * Horizontal bars, one row per category; several series stack. The last
 * series gets the rounded end. Clicking a row calls `onPilih` with its row.
 */
export function BatangH<T extends { nama: string }>({
  data,
  seri,
  tinggiBaris = 34,
  lebarLabel = 150,
  tip,
  onPilih,
  domain,
}: {
  data: T[];
  seri: Seri[];
  tinggiBaris?: number;
  lebarLabel?: number;
  tip: (row: T) => React.ReactNode;
  onPilih?: (row: T) => void;
  domain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={data.length * tinggiBaris + 8}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
        <XAxis type="number" hide domain={domain ?? [0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="nama"
          width={lebarLabel}
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          interval={0}
          tickFormatter={(v: string) => (v.length > lebarLabel / 7 ? `${v.slice(0, Math.floor(lebarLabel / 7) - 1)}…` : v)}
        />
        <Tooltip cursor={{ fill: "var(--viz-grid)", radius: 6 }} content={<ChartTip render={(r) => tip(r as T)} />} />
        {seri.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.nama}
            stackId="a"
            fill={s.warna}
            radius={i === seri.length - 1 ? [0, 6, 6, 0] : 0}
            stroke="var(--card)"
            strokeWidth={seri.length > 1 ? 1 : 0}
            cursor={onPilih ? "pointer" : undefined}
            onClick={onPilih ? (e: unknown) => onPilih((e as { payload: T }).payload) : undefined}
            animationDuration={700}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Spider chart of one series on a fixed 0..max scale. Gaps (null) sit at 0 and say so in the tooltip. */
export function Laba({
  data,
  warna,
  max = 5,
  tinggi = 260,
  tip,
}: {
  data: { nama: string; nilai: number | null }[];
  warna: string;
  max?: number;
  tinggi?: number;
  tip: (row: { nama: string; nilai: number | null }) => React.ReactNode;
}) {
  const rows = data.map((d) => ({ ...d, v: d.nilai ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={tinggi}>
      <RadarChart data={rows} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke="var(--viz-grid)" />
        <PolarAngleAxis dataKey="nama" tick={{ ...AXIS, fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, max]} tickCount={max + 1} tick={false} axisLine={false} />
        <Tooltip content={<ChartTip render={(r) => tip(r as { nama: string; nilai: number | null })} />} />
        <RRadar dataKey="v" stroke={warna} strokeWidth={2} fill={warna} fillOpacity={0.18} dot={{ r: 3.5, fill: warna, strokeWidth: 0 }} animationDuration={700} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** Half-ring meter for a 1..5 score; empty ring when there is no score yet. */
export function Meter({ nilai, min = 1, max = 5, warna, label, ukuran = 200 }: { nilai: number | null; min?: number; max?: number; warna: string; label: string; ukuran?: number }) {
  const r = 80;
  const panjang = Math.PI * r;
  const isi = nilai == null ? 0 : Math.min(1, Math.max(0, (nilai - min) / (max - min)));
  const [jalan, setJalan] = React.useState(0);
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setJalan(isi));
    return () => cancelAnimationFrame(t);
  }, [isi]);
  return (
    <div className="relative mx-auto" style={{ width: ukuran, height: ukuran * 0.62 }}>
      <svg viewBox="0 0 200 118" className="size-full">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--viz-grid)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={warna}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={panjang}
          strokeDashoffset={panjang * (1 - jalan)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className={cn("font-semibold tabular-nums tracking-[-0.03em]", ukuran < 160 ? "text-xl leading-6" : "text-3xl")}>{nilai == null ? "–" : nilai.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/**
 * Rows x columns of counts as a grid of cells, deeper = more, each column in
 * its own colour. Empty cells are a faint outline. Each cell explains itself
 * on hover.
 */
export function PetaPanas({
  baris,
  kolom,
  nilai,
  tip,
}: {
  baris: { nama: string; info?: React.ReactNode }[];
  kolom: { nama: string; warna: string }[];
  nilai: (b: number, k: number) => number;
  tip: (b: number, k: number) => React.ReactNode;
}) {
  const maks = Math.max(1, ...baris.flatMap((_, b) => kolom.map((_, k) => nilai(b, k))));
  return (
    <div className="grid items-center gap-1" style={{ gridTemplateColumns: `minmax(0,9rem) repeat(${kolom.length}, minmax(0,1fr))` }}>
      <span />
      {kolom.map((k) => (
        <span key={k.nama} className="flex items-center justify-center gap-1.5 pb-1 text-[11px] font-medium text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: k.warna }} />
          {k.nama}
        </span>
      ))}
      {baris.map((r, b) => (
        <React.Fragment key={r.nama}>
          <Tip isi={r.info} className="min-w-0">
            <span className="truncate pr-2 text-xs">{r.nama}</span>
          </Tip>
          {kolom.map((k, ki) => {
            const v = nilai(b, ki);
            return (
              <Tip key={k.nama} isi={tip(b, ki)} className="block">
                <span
                  className={cn(
                    "grid h-7 w-full place-items-center rounded-md text-[11px] tabular-nums transition-transform hover:scale-[1.06]",
                    v ? "font-medium" : "border border-dashed border-border text-transparent",
                  )}
                  style={v ? { background: `color-mix(in oklab, ${k.warna} ${18 + (v / maks) * 82}%, transparent)`, color: v / maks > 0.55 ? "white" : undefined } : undefined}
                >
                  {v || ""}
                </span>
              </Tip>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
