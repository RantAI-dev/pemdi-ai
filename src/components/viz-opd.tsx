"use client";

/**
 * Small pieces shared by /opd and /data, in the Dashboard Pemdi style: page
 * header with a few numbers, a 100% segmented bar and a legend. Explanations
 * stay in tooltips.
 */
import * as React from "react";
import { InfoTip, Tip } from "@/components/viz";
import { cn } from "@/lib/utils";

export const Judul = ({ children }: { children: React.ReactNode }) => <p className="font-medium text-foreground">{children}</p>;
export const Baris = ({ k, v }: { k: React.ReactNode; v: React.ReactNode }) => (
  <p className="flex justify-between gap-4">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium tabular-nums">{v}</span>
  </p>
);

export type Angka = { nilai: React.ReactNode; label: string; info?: React.ReactNode };

/** Title on the left (explanation on hover), the page's key numbers on the right. */
export function Kepala({ judul, info, angka }: { judul: string; info?: React.ReactNode; angka: Angka[] }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-1">
      <div>
        <p className="text-xs text-muted-foreground">Kab. Tulang Bawang Barat</p>
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">{judul}</h1>
          {info ? <InfoTip isi={info} /> : null}
        </div>
      </div>
      <dl className="flex flex-wrap gap-6 sm:gap-8">
        {angka.map((a) => (
          <Tip key={a.label} isi={a.info} className="block">
            <div className={cn("text-right", a.info && "cursor-help")}>
              <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{a.nilai}</dd>
              <dt className="text-[11px] text-muted-foreground">{a.label}</dt>
            </div>
          </Tip>
        ))}
      </dl>
    </header>
  );
}

export function Legenda({ item, className }: { item: { nama: string; warna: string }[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3 text-[11px] text-muted-foreground", className)}>
      {item.map((i) => (
        <span key={i.nama} className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ background: i.warna }} /> {i.nama}
        </span>
      ))}
    </div>
  );
}

export type Potong = { nama: string; nilai: number; warna: string; info?: React.ReactNode };

/** One 100% bar split into parts, each explaining itself on hover, with a counted legend below. */
export function Segmen({ bagian, tinggi = 10 }: { bagian: Potong[]; tinggi?: number }) {
  const total = bagian.reduce((s, b) => s + b.nilai, 0) || 1;
  const ada = bagian.filter((b) => b.nilai > 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full gap-0.5 overflow-hidden rounded-full" style={{ height: tinggi }}>
        {ada.map((b) => (
          <span key={b.nama} className="h-full min-w-1" style={{ flexGrow: b.nilai, flexBasis: 0 }}>
            <Tip isi={b.info ?? `${b.nama}: ${b.nilai}`} className="flex h-full w-full">
              <span className="block h-full w-full" style={{ background: b.warna }} />
            </Tip>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {bagian.map((b) => (
          <span key={b.nama} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: b.warna }} />
            {b.nama}
            <span className="font-medium tabular-nums text-foreground">{b.nilai}</span>
            <span className="tabular-nums">({Math.round((b.nilai / total) * 100)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Inline progress bar for a table cell. */
export function BatangMini({ nilai, warna = "var(--viz-makro)" }: { nilai: number; warna?: string }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--viz-grid)]">
      <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, nilai)) * 100}%`, background: warna }} />
    </span>
  );
}

/** Label, bar and value per row, for a few shares of a whole (0..1). The row explains itself on hover. */
export function DaftarBatang({ baris, className }: { baris: { nama: string; nilai: number; teks: React.ReactNode; info?: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {baris.map((b) => (
        <Tip key={b.nama} isi={b.info} className="grid w-full grid-cols-[9rem_minmax(0,1fr)_3rem] items-center gap-2">
          <span className="truncate text-xs text-muted-foreground">{b.nama}</span>
          <BatangMini nilai={b.nilai} />
          <span className="text-right text-xs font-medium tabular-nums">{b.teks}</span>
        </Tip>
      ))}
    </div>
  );
}

/**
 * Horizontal stacked bars in plain HTML, for long category names: the name
 * truncates on one line instead of wrapping, and the row's tooltip has it in full.
 */
export function BatangTumpuk({
  baris,
  seri,
  lebarLabel = "14rem",
}: {
  baris: { nama: string; nilai: number[]; info?: React.ReactNode }[];
  seri: { nama: string; warna: string }[];
  lebarLabel?: string;
}) {
  const maks = Math.max(1, ...baris.map((b) => b.nilai.reduce((s, v) => s + v, 0)));
  return (
    <div className="flex flex-col gap-1">
      {baris.map((b) => {
        const total = b.nilai.reduce((s, v) => s + v, 0);
        return (
          <Tip key={b.nama} isi={b.info ?? b.nama} className="block w-full rounded-md px-1 py-1 hover:bg-[var(--viz-grid)]">
            <span className="grid w-full items-center gap-2" style={{ gridTemplateColumns: `${lebarLabel} minmax(0,1fr) 2rem` }}>
              <span className="truncate text-right text-[11px] text-[var(--viz-ink)]">{b.nama}</span>
              <span className="flex h-3.5 gap-px">
                {b.nilai.map((v, i) =>
                  v > 0 ? (
                    <span key={seri[i].nama} className="h-full first:rounded-l-[3px] last:rounded-r-[3px]" style={{ width: `${(v / maks) * 100}%`, background: seri[i].warna }} />
                  ) : null,
                )}
              </span>
              <span className="text-right text-[11px] font-medium tabular-nums">{total}</span>
            </span>
          </Tip>
        );
      })}
    </div>
  );
}
