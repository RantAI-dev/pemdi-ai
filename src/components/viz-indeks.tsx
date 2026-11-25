"use client";

/**
 * Small pieces of the Indeks Pemdi views that sit on top of viz.tsx: the
 * provisional-score badge, the predicate scale strip, and a 1..5 score track.
 */
import type * as React from "react";
import { PREDIKAT, predikat } from "@/data/pemdi";
import { Tip } from "@/components/viz";
import { cn, fmtDec } from "@/lib/utils";

/** Muted "sementara · 19/20" pill; the tooltip says why. */
export function Sementara({ terisi, jumlah, className }: { terisi: number; jumlah: number; className?: string }) {
  return (
    <Tip
      className={className}
      isi={
        <>
          <p className="font-medium text-foreground">Nilai sementara</p>
          <p className="text-muted-foreground">
            Rata-rata berbobot dari {terisi} dari {jumlah} indikator yang sudah dinilai, bobotnya disesuaikan. Menjadi nilai resmi setelah semua indikator dinilai.
          </p>
        </>
      }
    >
      <span className="inline-flex h-5 cursor-help items-center whitespace-nowrap rounded-full bg-muted px-2 text-[10px] font-medium tabular-nums text-muted-foreground">
        sementara · {terisi}/{jumlah}
      </span>
    </Tip>
  );
}

/** Where each predicate starts on the 1..5 track, as a share of its width. */
const posisi = (v: number) => ((v - 1) / 4) * 100;

/** The five predicate bands of Tabel 4 as one strip, the current band filled; names on hover. */
export function SkalaPredikat({ nilai, warna }: { nilai: number | null; warna: string }) {
  const kini = nilai == null ? null : predikat(nilai).level;
  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: PREDIKAT.map((p) => `${posisi(p.max) - posisi(p.min)}fr`).join(" ") }}>
      {PREDIKAT.map((p) => (
        <Tip
          key={p.level}
          className="block min-w-0"
          isi={
            <>
              <p className="font-medium text-foreground">{p.nama}</p>
              <p className="text-muted-foreground">
                {p.label} · {fmtDec(p.min)}
                {p.level < 5 ? `–${fmtDec(p.max)}` : "–5,00"}
              </p>
            </>
          }
        >
          <span className="flex w-full flex-col gap-1">
            <span className="h-1.5 w-full rounded-full" style={{ background: warna, opacity: kini === p.level ? 1 : 0.18 }} />
            <span className={cn("truncate text-center text-[10px]", kini === p.level ? "font-medium text-foreground" : "text-muted-foreground")}>{p.nama}</span>
          </span>
        </Tip>
      ))}
    </div>
  );
}

/** A 1..5 score as a thin track with the predicate boundaries marked. */
export function Lintasan({ nilai, warna, className }: { nilai: number | null; warna: string; className?: string }) {
  return (
    <span className={cn("relative block h-2 overflow-hidden rounded-full bg-foreground/[0.07]", className)} role="img" aria-label={nilai == null ? "belum dinilai" : `${fmtDec(nilai)} dari 5`}>
      {nilai != null ? <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(2, posisi(nilai))}%`, background: warna }} /> : null}
      {PREDIKAT.slice(1).map((p) => (
        <span key={p.level} className="absolute inset-y-0 w-px bg-card" style={{ left: `${posisi(p.min)}%` }} />
      ))}
    </span>
  );
}

export type BarisBatang = { kunci: string | number; nama: string; nilai: number | null; teks?: React.ReactNode; tip?: React.ReactNode; aktif?: boolean };

/**
 * Rows of name, bar and value, the value always visible. On a 1..5 scale
 * (`skala`) the bar starts at 1 and carries the predicate boundaries;
 * otherwise it is relative to the largest row.
 */
export function DaftarBatang({
  data,
  warna,
  skala,
  lebarNama = "11rem",
  onPilih,
}: {
  data: BarisBatang[];
  warna: string;
  skala?: boolean;
  lebarNama?: string;
  onPilih?: (b: BarisBatang) => void;
}) {
  const maks = Math.max(1e-9, ...data.map((d) => d.nilai ?? 0));
  return (
    <ul className="flex flex-col">
      {data.map((d) => {
        const isi = (
          <span className="grid w-full items-center gap-3 py-[5px] text-left" style={{ gridTemplateColumns: `${lebarNama} minmax(0,1fr) 3rem` }}>
            <span className={cn("truncate text-xs", d.aktif ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{d.nama}</span>
            {skala ? (
              <Lintasan nilai={d.nilai} warna={warna} className="h-2.5" />
            ) : (
              <span className="block h-2.5 overflow-hidden rounded-full bg-foreground/[0.05]">
                <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: d.nilai ? `${Math.max(1.5, (d.nilai / maks) * 100)}%` : 0, background: warna, opacity: d.aktif === false ? 0.35 : 1 }} />
              </span>
            )}
            <span className="text-right text-[13px] font-semibold tabular-nums">{d.teks ?? (d.nilai == null ? "–" : fmtDec(d.nilai))}</span>
          </span>
        );
        const baris = onPilih ? (
          <button type="button" onClick={() => onPilih(d)} className="group -mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 transition-colors hover:bg-muted/50">
            {isi}
          </button>
        ) : (
          <span className="group block">{isi}</span>
        );
        return (
          <li key={d.kunci}>
            {d.tip ? (
              <Tip isi={d.tip} className="block">
                {baris}
              </Tip>
            ) : (
              baris
            )}
          </li>
        );
      })}
    </ul>
  );
}
