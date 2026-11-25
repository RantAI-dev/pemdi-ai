"use client";

/**
 * Shared pieces of the evidence pages (Kebutuhan, Dokumen, Penilaian), in the
 * Dashboard Pemdi style: quiet header, one stacked bar for a whole split into
 * states, a funnel of counts, pill filters. Explanations sit in tooltips.
 */
import * as React from "react";
import { ChevronDown, Search } from "lucide-react";
import { InfoTip, Tip } from "@/components/viz";
import { cn, fmtInt } from "@/lib/utils";

/* ------------------------------------------------------------------ Header */

/** Title with its (i), and a few numbers on the right. */
export function KepalaHalaman({ judul, info, angka, aksi }: { judul: string; info?: React.ReactNode; angka?: [React.ReactNode, string][]; aksi?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-1">
      <div>
        <p className="text-xs text-muted-foreground">Kab. Tulang Bawang Barat</p>
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">{judul}</h1>
          {info ? <InfoTip isi={info} /> : null}
        </div>
      </div>
      <div className="flex items-end gap-6 sm:gap-8">
        {angka?.length ? (
          <dl className="flex gap-6 sm:gap-8">
            {angka.map(([n, l]) => (
              <div key={l} className="text-right">
                <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{n}</dd>
                <dt className="text-[11px] text-muted-foreground">{l}</dt>
              </div>
            ))}
          </dl>
        ) : null}
        {aksi}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------ Status split */

export type Bagian = { key: string; nama: string; nilai: number; warna: string; info?: React.ReactNode };

/**
 * One horizontal bar split into parts, 2px gaps between them, and a legend
 * with counts underneath. Clicking a part or its legend entry selects it.
 */
export function BilahBagian({ bagian, pilih, onPilih, tinggi = 18 }: { bagian: Bagian[]; pilih?: string | null; onPilih?: (key: string | null) => void; tinggi?: number }) {
  const total = bagian.reduce((s, b) => s + b.nilai, 0) || 1;
  const klik = (k: string) => onPilih?.(pilih === k ? null : k);
  return (
    <div>
      <div className="flex w-full gap-0.5" style={{ height: tinggi }}>
        {bagian
          .filter((b) => b.nilai > 0)
          .map((b, i, arr) => (
            <div key={b.key} className="h-full min-w-1" style={{ flex: `${b.nilai} 1 0` }}>
            <Tip
              className="block h-full w-full"
              isi={
                <>
                  <p className="font-medium">{b.nama}</p>
                  <p className="text-muted-foreground">
                    {fmtInt(b.nilai)} dari {fmtInt(total)} · {Math.round((b.nilai / total) * 100)}%
                  </p>
                  {b.info ? <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{b.info}</p> : null}
                </>
              }
            >
              <button
                type="button"
                aria-label={`${b.nama}: ${b.nilai}`}
                onClick={() => klik(b.key)}
                className={cn("block h-full w-full transition-opacity", i === 0 && "rounded-l-[4px]", i === arr.length - 1 && "rounded-r-[4px]", pilih && pilih !== b.key && "opacity-30")}
                style={{ background: b.warna }}
              />
            </Tip>
            </div>
          ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {bagian.map((b) => (
          <li key={b.key}>
            <button
              type="button"
              onClick={() => klik(b.key)}
              className={cn("flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs hover:bg-muted/60", pilih && pilih !== b.key && "opacity-50", pilih === b.key && "bg-muted")}
            >
              <span className="size-2 shrink-0 rounded-sm" style={{ background: b.warna }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{b.nama}</span>
              <span className="font-semibold tabular-nums">{fmtInt(b.nilai)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ Funnel */

export type Tahap = {
  nama: string;
  nilai: number;
  info?: React.ReactNode;
  /** Bar length when the count is not a subset of the first stage (e.g. findings: share of documents with any). */
  rasio?: number;
  cabang?: { nama: string; nilai: number; warna?: string }[];
};

/**
 * Pipeline stages left to right, each a bar whose length is its share of the
 * first stage, with the count above and the branch-offs (OCR, gagal…) as
 * small figures below.
 */
export function Corong({ tahap, warna = "var(--viz-pemdi)" }: { tahap: Tahap[]; warna?: string }) {
  const awal = Math.max(1, tahap[0]?.nilai ?? 1);
  return (
    <ol className="grid gap-3" style={{ gridTemplateColumns: `repeat(${tahap.length}, minmax(0,1fr))` }}>
      {tahap.map((t, i) => {
        const r = Math.min(1, t.rasio ?? t.nilai / awal);
        return (
        <li key={t.nama} className="min-w-0">
          <Tip isi={t.info} className="block">
            <div className="w-full">
              <p className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{fmtInt(t.nilai)}</span>
                {i > 0 && t.rasio == null ? <span className="text-[11px] tabular-nums text-muted-foreground">{Math.round(r * 100)}%</span> : null}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{t.nama}</p>
              <div className="mt-2 h-2 w-full rounded-[4px] bg-[var(--viz-grid)]">
                <div className="h-full rounded-[4px] transition-[width] duration-700" style={{ width: `${Math.max(t.nilai ? 2 : 0, r * 100)}%`, background: warna, opacity: 0.45 + (0.55 * (i + 1)) / tahap.length }} />
              </div>
            </div>
          </Tip>
          {t.cabang?.length ? (
            <p className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
              {t.cabang.map((c) => (
                <span key={c.nama} className="inline-flex items-center gap-1">
                  {c.warna ? <span className="size-1.5 rounded-full" style={{ background: c.warna }} /> : null}
                  <span className="font-medium tabular-nums text-foreground">{fmtInt(c.nilai)}</span> {c.nama}
                </span>
              ))}
            </p>
          ) : null}
        </li>
        );
      })}
    </ol>
  );
}

/* ----------------------------------------------------------------- Filters */

export const kelasField = "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring";

/** A row of pill toggles with counts. */
export function Pil<K extends string>({ opsi, nilai, onUbah }: { opsi: { key: K; label: string; n?: number }[]; nilai: K; onUbah: (k: K) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {opsi.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onUbah(o.key)}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors",
            nilai === o.key ? "border-foreground/15 bg-muted font-medium text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/60",
          )}
        >
          {o.label}
          {o.n != null ? <span className="tabular-nums opacity-60">{o.n}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Cari({ nilai, onUbah, placeholder = "Cari", className }: { nilai: string; onUbah: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={cn("relative min-w-40", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
      <input value={nilai} onChange={(e) => onUbah(e.target.value)} placeholder={placeholder} className={cn(kelasField, "w-full bg-muted/40 pl-8")} />
    </label>
  );
}

/** A compact select with a label inside the first option. */
export function Pilihan({ nilai, onUbah, semua, opsi, className }: { nilai: string; onUbah: (v: string) => void; semua: string; opsi: { value: string; label: string }[]; className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        className={cn(kelasField, "w-full appearance-none truncate pr-7 text-xs", nilai ? "border-foreground/20 font-medium" : "text-muted-foreground")}
      >
        <option value="">{semua}</option>
        {opsi.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2 size-4 text-muted-foreground" />
    </span>
  );
}

/* ------------------------------------------------------------------ Status */

export const WARNA_STATUS = {
  terpenuhi: "var(--status-good)",
  sebagian: "var(--status-warning)",
  perlu_dicek: "var(--status-none)",
  belum_ada: "var(--status-serious)",
} as const;

/** A state chip: dot + label, never colour alone. */
export function Chip({ warna, children, className }: { warna?: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-medium", className)}
      style={{ background: warna ? `color-mix(in oklab, ${warna} 14%, transparent)` : "var(--muted)" }}
    >
      {warna ? <span className="size-1.5 rounded-full" style={{ background: warna }} /> : null}
      {children}
    </span>
  );
}
