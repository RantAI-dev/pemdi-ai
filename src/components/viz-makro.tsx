"use client";

/**
 * Pieces of the Kinerja Makro views in the Dashboard Pemdi style: indicator
 * cards, a sparkline, the trend chart, the two report tables, and the source
 * list that closes every page using makro data. Explanations sit in tooltips.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InfoTip, Tip, TipCard } from "@/components/viz";
import { Baris, ChipKategori, ChipSumber, DaftarSumber, Judul, Pisah, SumberRingkasan } from "@/components/viz-laporan";
import type { DataMakro, IndikatorMakro, NilaiMakro, SlugMakro, SumberMakro } from "@/lib/makro";
import { seri } from "@/lib/makro-hitung";
import {
  bagianNilai,
  fmtLaju,
  fmtNilai,
  fmtPersen,
  jumlahPerSumber,
  judulPendek,
  keDasar,
  kelompokSumber,
  labelSumber,
  NAMA_PENDEK,
  PITA_KATEGORI,
  rentangTarget,
  RUMUS_LAJU,
  rumusCapaian,
  satuanDasar,
  warnaKategori,
  type Ringkas,
} from "@/lib/makro-tampil";
import { cn } from "@/lib/utils";

export const WARNA_MAKRO = "var(--viz-makro)";
/** Reference series are neutral so Tubaba stays the one coloured line. */
export const WARNA_WILAYAH = { tubaba: "var(--viz-makro)", lampung: "var(--viz-ink)", nasional: "var(--viz-ref)" } as const;
export const NAMA_WILAYAH = { tubaba: "Tubaba", lampung: "Lampung", nasional: "Nasional" } as const;

export function cariSumber(data: Pick<DataMakro, "sumber">, id: string | undefined): SumberMakro | undefined {
  return id ? data.sumber.find((s) => s.id === id) : undefined;
}

/* ------------------------------------------------------------- Value tips */

/** Where a value comes from: source, page, location, the quoted line, any note. */
export function IsiNilai({ n, s, judul }: { n: NilaiMakro; s?: SumberMakro; judul?: React.ReactNode }) {
  const rentang = n.jenis === "target" ? rentangTarget(n) : null;
  return (
    <>
      {judul ? <Judul>{judul}</Judul> : null}
      <Baris k={n.jenis === "target" ? `Target ${n.tahun}` : `Realisasi ${n.tahun}`} v={fmtNilai(n.nilai, n.satuan, n.indikator)} />
      {rentang ? <Baris k="Rentang RPJMD" v={rentang} /> : null}
      <Pisah>
        {s ? <p className="font-medium text-foreground">{labelSumber(s, n.halaman)}</p> : null}
        <p>{n.lokasi}</p>
        {n.kutipan ? <p className="mt-1 font-mono text-[10.5px] leading-4 text-foreground/80">“{n.kutipan}”</p> : null}
        {n.catatan ? <p className="mt-1">{n.catatan}</p> : null}
        {n.indikator === "gini" && n.wilayah === "tubaba" && n.jenis === "realisasi" ? <p className="mt-1 font-medium text-foreground">Sumber daerah (RPJMD), bukan BPS.</p> : null}
      </Pisah>
    </>
  );
}

/** A value with its provenance on hover. */
export function NilaiTip({ n, data, className, children }: { n?: NilaiMakro; data: Pick<DataMakro, "sumber">; className?: string; children?: React.ReactNode }) {
  if (!n) return <span className={cn("text-muted-foreground", className)}>–</span>;
  return (
    <Tip isi={<IsiNilai n={n} s={cariSumber(data, n.sumber)} />} className={className}>
      <span className="cursor-help whitespace-nowrap tabular-nums">{children ?? fmtNilai(n.nilai, n.satuan, n.indikator)}</span>
    </Tip>
  );
}

/* ------------------------------------------------------------ Small marks */

export function KategoriChip({ r, kecil }: { r: Pick<Ringkas, "kategori" | "capaian">; kecil?: boolean }) {
  return <ChipKategori label={r.kategori} warna={warnaKategori(r.kategori)} kecil={kecil} info={r.kategori ? <><Judul>Kategori capaian: {r.kategori}</Judul><p className="text-muted-foreground">{PITA_KATEGORI}</p></> : null} />;
}

/** Signed laju with an arrow for direction; colour says good or bad for this indicator. */
export function LajuTeks({ r, className }: { r: Ringkas; className?: string }) {
  if (r.laju == null) return <span className={cn("text-xs text-muted-foreground", className)}>laju –</span>;
  const Ikon = r.laju > 0 ? ArrowUpRight : r.laju < 0 ? ArrowDownRight : ArrowRight;
  const warna = r.baik == null ? "var(--viz-ink)" : r.baik ? "var(--status-good)" : "var(--status-serious)";
  return (
    <Tip
      isi={
        <>
          <Judul>Laju kinerja {r.realisasi?.tahun} terhadap {r.lalu?.tahun}</Judul>
          <Baris k={`Tahun ${r.lalu?.tahun}`} v={fmtNilai(r.lalu?.nilai, r.lalu?.satuan ?? "", r.ind.slug)} />
          <Baris k={`Tahun ${r.realisasi?.tahun}`} v={fmtNilai(r.realisasi?.nilai, r.realisasi?.satuan ?? "", r.ind.slug)} />
          <Baris k="Laju" v={fmtLaju(r.laju)} />
          <Pisah>
            <p>{RUMUS_LAJU}</p>
            <p className="mt-1">
              {r.ind.polaritas === "naik" ? "Indikator naik: makin tinggi makin baik." : "Indikator turun: makin rendah makin baik."}{" "}
              {r.baik == null ? "Tidak berubah." : r.baik ? "Bergerak ke arah yang baik." : "Bergerak ke arah yang kurang baik."}
            </p>
          </Pisah>
        </>
      }
      className={className}
    >
      <span className="inline-flex cursor-help items-center gap-0.5 text-xs font-semibold tabular-nums" style={{ color: warna }}>
        <Ikon className="size-3.5" />
        {fmtLaju(r.laju)}
      </span>
    </Tip>
  );
}

/** "BPS Tubaba · Dalam Angka 2026 · hlm. 566" as a link to that page of the file. */
export function SumberChip({ s, halaman, className }: { s?: SumberMakro; halaman: number | null; className?: string }) {
  if (!s) return null;
  return <ChipSumber s={s} halaman={halaman} label={labelSumber(s, halaman)} className={className} />;
}

/* -------------------------------------------------------------- Sparkline */

type Titik = { tahun: number; nilai: number; n: NilaiMakro };

/** Tubaba realisation over the years, the selected year marked. */
export function Garis({ titik, tahun, slug, tinggi = 40 }: { titik: Titik[]; tahun?: number; slug: SlugMakro; tinggi?: number }) {
  if (titik.length < 2) return <div style={{ height: tinggi }} />;
  const rows = titik.map((t) => ({ tahun: t.tahun, v: keDasar(t.n), n: t.n }));
  return (
    <ResponsiveContainer width="100%" height={tinggi}>
      <LineChart data={rows} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <XAxis dataKey="tahun" hide />
        <Tooltip
          cursor={{ stroke: "var(--viz-grid)", strokeWidth: 8 }}
          content={({ active, payload }) => {
            const r = payload?.[0]?.payload as (typeof rows)[number] | undefined;
            return active && r ? (
              <TipCard>
                <Baris k={r.tahun} v={fmtNilai(r.n.nilai, r.n.satuan, slug)} />
              </TipCard>
            ) : null;
          }}
        />
        <Line
          dataKey="v"
          stroke={WARNA_MAKRO}
          strokeWidth={2}
          isAnimationActive={false}
          dot={(p: { cx?: number; cy?: number; payload?: { tahun: number }; index?: number }) =>
            p.payload?.tahun === tahun ? <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={WARNA_MAKRO} stroke="var(--card)" strokeWidth={2} /> : <g key={p.index} />
          }
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ Cards */

/** One indicator: the year's realisation large, laju, capaian vs target, a sparkline, comparisons, source. */
export function KartuMakro({ r, data }: { r: Ringkas; data: DataMakro }) {
  const router = useRouter();
  const { ind } = r;
  const bagian = r.realisasi ? bagianNilai(r.realisasi.nilai, r.realisasi.satuan, ind.slug) : null;
  const titik = seri(data.nilai, ind.slug, "tubaba", "realisasi");
  const sReal = cariSumber(data, r.realisasi?.sumber);
  const rentang = rentangTarget(r.target);
  const buka = () => router.push(ind.jalur);
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={buka}
      onKeyDown={(e) => e.key === "Enter" && buka()}
      className="group relative flex min-w-0 cursor-pointer flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.14)]"
    >
      <div className="flex items-center gap-1.5">
        <Link href={ind.jalur} onClick={(e) => e.stopPropagation()} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
          {ind.nama}
        </Link>
        <span onClick={(e) => e.stopPropagation()}>
          <InfoTip
            isi={
              <>
                <Judul>{ind.namaLppd}</Judul>
                <p className="text-muted-foreground">Nama indikator di LPPD. Satuan: {ind.satuan}.</p>
                <Pisah>
                  <p>{RUMUS_LAJU}</p>
                  <p className="mt-1">{rumusCapaian(ind.polaritas)}</p>
                </Pisah>
              </>
            }
          />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {bagian && r.realisasi ? (
            <NilaiTip n={r.realisasi} data={data}>
              <span className="flex items-baseline gap-1 whitespace-nowrap">
                {bagian.awalan ? <span className="text-lg font-semibold text-muted-foreground">{bagian.awalan}</span> : null}
                <span className="text-4xl font-semibold tracking-[-0.04em]">{bagian.angka}</span>
                {bagian.satuan ? <span className="text-sm font-medium text-muted-foreground">{bagian.satuan}</span> : null}
              </span>
            </NilaiTip>
          ) : (
            <span className="text-4xl font-semibold text-muted-foreground">–</span>
          )}
          <div className="mt-1 flex items-center gap-2">
            <LajuTeks r={r} />
            {r.tertinggal ? (
              <Tip isi={<><Judul>Data terakhir {r.realisasi?.tahun}</Judul><p className="text-muted-foreground">Realisasi {r.tahun} belum tersedia. {ind.slug === "gini" ? "BPS tidak menerbitkan Gini kabupaten; angka daerah dari RPJMD baru sampai 2024." : ""}</p></>}>
                <span className="cursor-help rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">data {r.realisasi?.tahun}</span>
              </Tip>
            ) : null}
          </div>
        </div>
        <div className="w-24 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Garis titik={titik} tahun={r.realisasi?.tahun} slug={ind.slug} />
        </div>
      </div>

      {/* Capaian vs target */}
      <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2">
        {r.capaian != null && r.target ? (
          <div className="flex items-center gap-2">
            <Tip
              isi={
                <>
                  <Judul>Capaian terhadap target RPJMD {r.tahun}</Judul>
                  <Baris k="Target" v={fmtNilai(r.target.nilai, r.target.satuan, ind.slug)} />
                  {rentang ? <Baris k="Rentang RPJMD" v={rentang} /> : null}
                  <Baris k="Realisasi" v={fmtNilai(r.realisasi?.nilai, r.realisasi?.satuan ?? "", ind.slug)} />
                  <Baris k="Capaian" v={fmtPersen(r.capaian)} />
                  <Pisah>
                    <p>{rumusCapaian(ind.polaritas)}</p>
                    {rentang ? <p className="mt-1">Target berupa rentang; dipakai titik tengahnya.</p> : null}
                  </Pisah>
                </>
              }
            >
              <span className="cursor-help text-xl font-semibold tabular-nums tracking-[-0.02em]">{fmtPersen(r.capaian)}</span>
            </Tip>
            <span className="text-[11px] text-muted-foreground">capaian</span>
            <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
              <KategoriChip r={r} />
            </span>
          </div>
        ) : (
          <Tip
            className="block"
            isi={
              r.target && r.capaianIndikatif != null ? (
                <>
                  <Judul>Capaian {r.tahun} belum dapat dihitung</Judul>
                  <p className="text-muted-foreground">Realisasi {r.tahun} belum tersedia. Sebagai gambaran, realisasi {r.realisasi?.tahun} ({fmtNilai(r.realisasi?.nilai, r.realisasi?.satuan ?? "", ind.slug)}) terhadap target {r.tahun} ({fmtNilai(r.target.nilai, r.target.satuan, ind.slug)}) setara {fmtPersen(r.capaianIndikatif)} (indikatif).</p>
                </>
              ) : (
                <>
                  <Judul>Tanpa target {r.tahun}</Judul>
                  <p className="text-muted-foreground">Target RPJMD 2025–2029 dimulai tahun 2025.</p>
                </>
              )
            }
          >
            <span className="flex h-7 cursor-help items-center text-xs text-muted-foreground">{r.target ? `Capaian menunggu realisasi ${r.tahun}` : `Tanpa target RPJMD ${r.tahun}`}</span>
          </Tip>
        )}
        {r.target ? (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>Target</span>
            <NilaiTip n={r.target} data={data} className="font-medium text-foreground" />
            {rentang ? <span className="text-muted-foreground/80">({rentang})</span> : null}
          </div>
        ) : null}
      </div>

      {/* Comparisons */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {(["lampung", "nasional"] as const).map((w) => {
          const n = r[w];
          return (
            <span key={w} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: WARNA_WILAYAH[w] }} />
              {NAMA_WILAYAH[w]}
              <NilaiTip n={n} data={data} className="font-medium text-foreground" />
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-border/60 pt-2.5">
        <SumberChip s={sReal} halaman={r.realisasi?.halaman ?? null} />
        {ind.slug === "gini" ? (
          <Tip isi="BPS tidak menerbitkan Gini Ratio tingkat kabupaten. Angka realisasi Tubaba diambil dari RPJMD 2025–2029 (sumber daerah, non-BPS).">
            <span className="cursor-help whitespace-nowrap text-[10px] font-medium text-[var(--status-warning)]">bukan BPS</span>
          </Tip>
        ) : null}
        <ArrowUpRight className="ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: WARNA_MAKRO }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Trend chart */

type BarisTren = { tahun: number; tubaba?: number; lampung?: number; nasional?: number; target?: number; n: Partial<Record<"tubaba" | "lampung" | "nasional" | "target", NilaiMakro>> };

/** Tubaba vs Lampung vs Nasional over the years, with the RPJMD target dashed. */
export function TrenMakro({ data, ind, komponen = null, tinggi = 280 }: { data: DataMakro; ind: IndikatorMakro; komponen?: string | null; tinggi?: number }) {
  const deret = {
    tubaba: seri(data.nilai, ind.slug, "tubaba", "realisasi", komponen),
    lampung: seri(data.nilai, ind.slug, "lampung", "realisasi", komponen),
    nasional: seri(data.nilai, ind.slug, "nasional", "realisasi", komponen),
    target: seri(data.nilai, ind.slug, "tubaba", "target", komponen),
  };
  // Components printed in different units (ribu vs juta jiwa) are not comparable on one axis: keep Tubaba's.
  const satuanTubaba = satuanDasar((deret.tubaba[0] ?? deret.target[0])?.n.satuan ?? ind.satuan);
  const kunci = (Object.keys(deret) as (keyof typeof deret)[]).filter((k) => deret[k].length && satuanDasar(deret[k][0].n.satuan) === satuanTubaba);
  const tahun = [...new Set(kunci.flatMap((k) => deret[k].map((t) => t.tahun)))].sort((a, b) => a - b);
  const rows: BarisTren[] = tahun.map((th) => {
    const r: BarisTren = { tahun: th, n: {} };
    for (const k of kunci) {
      const t = deret[k].find((x) => x.tahun === th);
      if (t) {
        r[k] = keDasar(t.n);
        r.n[k] = t.n;
      }
    }
    return r;
  });
  const satuan = satuanTubaba;
  const fmt = (v: number) => fmtNilai(v, satuan, ind.slug);
  const fmtSumbu = (v: number) => (satuan === "rupiah" ? `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt` : satuan === "jiwa" ? `${(v / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb` : v.toLocaleString("id-ID", { maximumFractionDigits: ind.slug === "gini" ? 3 : 2 }));
  const akhir = Object.fromEntries(kunci.map((k) => [k, deret[k].at(-1)?.tahun]));
  const label = (k: keyof typeof deret) =>
    function Label(p: { x?: number | string; y?: number | string; index?: number }) {
      const row = rows[p.index ?? -1];
      if (!row || row.tahun !== akhir[k] || p.x == null || p.y == null) return null;
      return (
        <text x={Number(p.x) + 8} y={Number(p.y) + (k === "tubaba" ? 16 : 4)} fontSize={11} fill="var(--viz-ink)" fontWeight={k === "tubaba" ? 600 : 400}>
          {k === "target" ? "Target" : NAMA_WILAYAH[k]}
        </text>
      );
    };
  const garis: { k: keyof typeof deret; warna: string; tebal: number; putus?: string }[] = [
    { k: "nasional", warna: WARNA_WILAYAH.nasional, tebal: 2 },
    { k: "lampung", warna: WARNA_WILAYAH.lampung, tebal: 2 },
    { k: "target", warna: WARNA_MAKRO, tebal: 2, putus: "5 4" },
    { k: "tubaba", warna: WARNA_MAKRO, tebal: 2.5 },
  ];
  const ada = garis.filter((g) => kunci.includes(g.k));
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {[...ada].reverse().map((g) => (
          <span key={g.k} className="flex items-center gap-1.5">
            <svg width="16" height="6" aria-hidden>
              <line x1="0" y1="3" x2="16" y2="3" stroke={g.warna} strokeWidth={2} strokeDasharray={g.putus} />
            </svg>
            {g.k === "target" ? "Target RPJMD" : NAMA_WILAYAH[g.k]}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={tinggi}>
        <LineChart data={rows} margin={{ top: 8, right: 64, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="tahun" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--viz-ink)" }} />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--viz-ink)" }}
            domain={["auto", "auto"]}
            tickFormatter={fmtSumbu}
          />
          <Tooltip
            cursor={{ stroke: "var(--viz-ink)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const r = payload?.[0]?.payload as BarisTren | undefined;
              if (!active || !r) return null;
              return (
                <TipCard className="min-w-56">
                  <Judul>{r.tahun}</Judul>
                  {(["tubaba", "target", "lampung", "nasional"] as const).map((k) => {
                    const n = r.n[k];
                    if (!n) return null;
                    const s = cariSumber(data, n.sumber);
                    const g = garis.find((x) => x.k === k)!;
                    return (
                      <div key={k} className="mt-1">
                        <p className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <svg width="12" height="6" aria-hidden>
                              <line x1="0" y1="3" x2="12" y2="3" stroke={g.warna} strokeWidth={2} strokeDasharray={g.putus} />
                            </svg>
                            {k === "target" ? "Target RPJMD" : NAMA_WILAYAH[k]}
                          </span>
                          <span className="font-medium tabular-nums">{fmt(keDasar(n))}</span>
                        </p>
                        {s ? <p className="pl-[18px] text-[10.5px] leading-4 text-muted-foreground">{labelSumber(s, n.halaman)}</p> : null}
                      </div>
                    );
                  })}
                </TipCard>
              );
            }}
          />
          {ada.map((g) => (
            <Line
              key={g.k}
              dataKey={g.k}
              stroke={g.warna}
              strokeWidth={g.tebal}
              strokeDasharray={g.putus}
              dot={{ r: g.k === "tubaba" ? 3.5 : 2.5, fill: g.warna, stroke: "var(--card)", strokeWidth: 1.5 }}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
              connectNulls
              label={label(g.k)}
              animationDuration={600}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------------------------------------- Sources */

/**
 * Every source document behind the makro numbers, grouped by publisher, each
 * openable. With `slug`, only that indicator's sources, with the pages cited.
 */
export function SumberData({ data, slug, judul = "Sumber data", className }: { data: DataMakro; slug?: SlugMakro; judul?: string; className?: string }) {
  const daftar = data.sumber.filter((s) => !slug || s.indikator.includes(slug) || data.nilai.some((n) => n.indikator === slug && n.sumber === s.id));
  const jumlah = jumlahPerSumber(data.nilai, slug);
  const halaman = (id: string) => [...new Set(data.nilai.filter((n) => n.sumber === id && (!slug || n.indikator === slug) && n.halaman != null).map((n) => n.halaman!))].sort((a, b) => a - b);
  return (
    <DaftarSumber
      className={className}
      grup={kelompokSumber(daftar, jumlah)}
      jumlah={jumlah}
      judul={judul}
      info="Berkas sumber setiap angka makro. Klik Buka untuk membuka berkas (PDF langsung ke halamannya). Sumber tanpa angka terpakai adalah dokumen pendukung. Semua angka belum diverifikasi manual."
      warna={WARNA_MAKRO}
      judulTampil={(s) => (s.jenis === "rpjmd" ? "RPJMD Kabupaten Tulang Bawang Barat 2025–2029" : judulPendek(s))}
      tag={(s) => (slug ? [] : s.indikator.map((i) => NAMA_PENDEK[i]))}
      halaman={slug ? halaman : undefined}
      infoJumlah={(n) => `${n} angka di dasbor ini dikutip dari berkas ini.`}
    />
  );
}

/** Compact source footer for the Beranda: the most-cited few as links, the rest one click away. */
export function SumberRingkas({ data, awal = 4 }: { data: DataMakro; awal?: number }) {
  return (
    <SumberRingkasan
      sumber={data.sumber}
      jumlah={jumlahPerSumber(data.nilai)}
      label={(s) => labelSumber(s)}
      judul="Sumber data makro"
      info="Berkas sumber angka makro, urut menurut banyaknya angka yang dikutip. Klik untuk membuka berkasnya di tab baru."
      warna={WARNA_MAKRO}
      awal={awal}
    />
  );
}
