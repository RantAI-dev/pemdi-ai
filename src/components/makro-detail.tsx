"use client";

/**
 * /dashboard-pemdi/makro/<indikator>: one macro indicator in depth. Trend
 * against Lampung, Nasional and the RPJMD target; the year-by-year table;
 * its components; the citations behind every number; and its sources.
 */
import * as React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { KepalaMakro } from "@/components/makro-halaman";
import { InfoTip, Panel, Tip } from "@/components/viz";
import { cariSumber, Garis, IsiNilai, KategoriChip, LajuTeks, NAMA_WILAYAH, NilaiTip, SumberChip, SumberData, TrenMakro, WARNA_MAKRO, WARNA_WILAYAH } from "@/components/viz-makro";
import type { DataMakro, NilaiMakro, SlugMakro } from "@/lib/makro";
import { capaian, kategori, laju, lajuBaik, seri } from "@/lib/makro-hitung";
import { fmtLaju, fmtNilai, fmtPersen, hrefHalaman, judulPendek, labelSumber, rentangTarget, ringkas, rumusCapaian, RUMUS_LAJU, warnaKategori, type Ringkas } from "@/lib/makro-tampil";
import { cn } from "@/lib/utils";

export type NodeKerangka = { judul: string; penjelasan: string; opd: string[]; dasar: string };

const sel = "border-b border-border/60 px-2.5 py-2 align-top";
const kepala = "border-b border-border px-2.5 py-2 text-left text-[11px] font-medium text-muted-foreground";

export function MakroDetail({ data, slug, tahunAwal, node }: { data: DataMakro; slug: SlugMakro; tahunAwal: number; node: NodeKerangka | null }) {
  const ind = data.indikator.find((i) => i.slug === slug)!;
  const [tahun, setTahun] = React.useState(tahunAwal);
  React.useEffect(() => {
    const u = new URL(window.location.href);
    if (tahun === data.tahunUtama) u.searchParams.delete("tahun");
    else u.searchParams.set("tahun", String(tahun));
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u);
  }, [tahun, data.tahunUtama]);
  const r = ringkas(data, ind, tahun);

  return (
    <div className="flex flex-col gap-4">
      <KepalaMakro
        judul={ind.nama}
        info={
          <>
            <p className="font-medium">{ind.namaLppd}</p>
            {node?.penjelasan ? <p className="mt-1 whitespace-pre-line text-muted-foreground">{node.penjelasan}</p> : null}
            <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{RUMUS_LAJU}</p>
            <p className="text-muted-foreground">{rumusCapaian(ind.polaritas)}</p>
          </>
        }
        jejak={[
          { href: "/dashboard-pemdi/makro", label: "Kinerja Makro" },
          { href: ind.jalur, label: ind.nama },
        ]}
        tahun={tahun}
        onTahun={setTahun}
        angka={[
          {
            nilai: r.realisasi ? <NilaiTip n={r.realisasi} data={data} /> : "–",
            label: r.tertinggal ? `realisasi ${r.realisasi?.tahun}` : "realisasi",
          },
          { nilai: <LajuTeks r={r} className="text-2xl [&_span]:text-2xl [&_svg]:size-5" />, label: `laju vs ${r.lalu?.tahun ?? tahun - 1}` },
          {
            nilai: fmtPersen(r.capaian),
            label: "capaian",
            info: r.capaian != null ? `${rumusCapaian(ind.polaritas)}. Target ${fmtNilai(r.target?.nilai, r.target?.satuan ?? "", slug)}.` : r.target ? `Realisasi ${tahun} belum tersedia.` : `Tanpa target RPJMD ${tahun}.`,
          },
          { nilai: r.kategori ? <KategoriChip r={r} /> : "–", label: "kategori" },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-8" judul="Tren" info="Realisasi Tubaba dibanding Provinsi Lampung dan Nasional, dengan target RPJMD 2025–2029 (putus-putus). Arahkan kursor untuk nilai dan sumbernya.">
          <TrenMakro data={data} ind={ind} />
        </Panel>
        <RingkasPanel r={r} data={data} />
      </div>

      <TabelTahun data={data} slug={slug} tahun={tahun} />

      {ind.komponen.length ? <KomponenPanel data={data} slug={slug} tahun={tahun} /> : null}

      <BuktiPanel data={data} slug={slug} node={node} />

      <SumberData data={data} slug={slug} judul={`Sumber data · ${ind.nama}`} />
    </div>
  );
}

function RingkasPanel({ r, data }: { r: Ringkas; data: DataMakro }) {
  const rentang = rentangTarget(r.target);
  return (
    <Panel className="lg:col-span-4" judul={`Capaian ${r.tahun}`} info={rumusCapaian(r.ind.polaritas)}>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          {r.capaian != null ? (
            <>
              <span className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">{fmtPersen(r.capaian)}</span>
              <KategoriChip r={r} />
            </>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">{r.target ? `Menunggu realisasi ${r.tahun}` : `Tanpa target ${r.tahun}`}</span>
          )}
        </div>
        {r.capaian == null ? (
          <p className="text-xs text-muted-foreground">
            {r.target ? `Realisasi ${r.tahun} belum tersedia${r.capaianIndikatif != null ? `; realisasi ${r.realisasi?.tahun} terhadap target ${r.tahun} setara ${fmtPersen(r.capaianIndikatif)} (indikatif)` : ""}.` : `Target RPJMD dimulai 2025.`}
          </p>
        ) : null}
        <div className="flex flex-col gap-1 text-[13px]">
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Target {r.tahun}</span>
            <span className="font-medium">
              <NilaiTip n={r.target} data={data} />
              {rentang ? <span className="ml-1 text-[11px] font-normal text-muted-foreground">({rentang})</span> : null}
            </span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Realisasi {r.realisasi?.tahun ?? r.tahun}</span>
            <NilaiTip n={r.realisasi} data={data} className="font-medium" />
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Realisasi {r.lalu?.tahun ?? r.tahun - 1}</span>
            <NilaiTip n={r.lalu} data={data} className="font-medium" />
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Laju</span>
            <LajuTeks r={r} />
          </p>
        </div>
        <div className="flex flex-col gap-1 border-t border-border/60 pt-2 text-[13px]">
          {(["lampung", "nasional"] as const).map((w) => (
            <p key={w} className="flex justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: WARNA_WILAYAH[w] }} />
                {NAMA_WILAYAH[w]} {r[w]?.tahun ?? ""}
              </span>
              <NilaiTip n={r[w]} data={data} className="font-medium" />
            </p>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 border-t border-border/60 pt-2">
          <SumberChip s={cariSumber(data, r.realisasi?.sumber)} halaman={r.realisasi?.halaman ?? null} />
          <SumberChip s={cariSumber(data, r.target?.sumber)} halaman={r.target?.halaman ?? null} />
          {r.ind.slug === "gini" ? (
            <Tip isi="BPS tidak menerbitkan Gini Ratio tingkat kabupaten. Realisasi Tubaba 2020–2024 diambil dari RPJMD 2025–2029; pembanding Lampung dan Nasional dari BPS.">
              <span className="inline-flex h-5 cursor-help items-center rounded-full px-2 text-[10.5px] font-medium" style={{ background: "color-mix(in oklab, var(--status-warning) 14%, transparent)" }}>
                Sumber daerah (RPJMD), bukan BPS
              </span>
            </Tip>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

/** Year by year: target, realisation, laju against the year before, capaian, kategori. */
function TabelTahun({ data, slug, tahun, komponen = null }: { data: DataMakro; slug: SlugMakro; tahun: number; komponen?: string | null }) {
  const ind = data.indikator.find((i) => i.slug === slug)!;
  const real = seri(data.nilai, slug, "tubaba", "realisasi", komponen);
  const targ = seri(data.nilai, slug, "tubaba", "target", komponen);
  const daftar = [...new Set([...real, ...targ].map((t) => t.tahun))].sort((a, b) => a - b);
  return (
    <Panel judul="Per tahun" info={`${RUMUS_LAJU}. ${rumusCapaian(ind.polaritas)}. Arahkan kursor ke angka untuk kutipan dan lokasinya.`} bodyClassName="overflow-x-auto">
      <table className="w-full min-w-[48rem] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={kepala}>Tahun</th>
            <th className={cn(kepala, "text-right")}>Target</th>
            <th className={cn(kepala, "text-right")}>Realisasi</th>
            <th className={cn(kepala, "text-right")}>Laju</th>
            <th className={cn(kepala, "text-right")}>Capaian</th>
            <th className={kepala}>Kategori</th>
            <th className={kepala}>Sumber</th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((th) => {
            const n = real.find((x) => x.tahun === th)?.n;
            const t = targ.find((x) => x.tahun === th)?.n;
            const l0 = real.find((x) => x.tahun === th - 1)?.n;
            const l = n && l0 ? laju(n.nilai, l0.nilai) : null;
            const baik = l == null ? null : lajuBaik(l, ind.polaritas);
            const cap = n && t ? capaian(n.nilai, t.nilai, ind.polaritas) : null;
            const sN = cariSumber(data, n?.sumber);
            const sT = cariSumber(data, t?.sumber);
            return (
              <tr key={th} className={cn(th === tahun && "bg-muted/50")}>
                <td className={cn(sel, "font-medium tabular-nums")}>{th}</td>
                <td className={cn(sel, "text-right")}>
                  <NilaiTip n={t} data={data} />
                </td>
                <td className={cn(sel, "text-right font-medium")}>
                  <NilaiTip n={n} data={data} />
                </td>
                <td className={cn(sel, "text-right font-medium tabular-nums")} style={{ color: baik == null ? undefined : baik ? "var(--status-good)" : "var(--status-serious)" }}>
                  {fmtLaju(l)}
                </td>
                <td className={cn(sel, "text-right font-medium tabular-nums")}>{fmtPersen(cap)}</td>
                <td className={sel}>
                  <KategoriChip r={{ capaian: cap, kategori: cap == null ? null : kategori(cap) }} kecil />
                </td>
                <td className={sel}>
                  <div className="flex max-w-96 flex-wrap gap-1">
                    {n ? <SumberChip s={sN} halaman={n.halaman} /> : null}
                    {t && (!n || t.sumber !== n.sumber || t.halaman !== n.halaman) ? <SumberChip s={sT} halaman={t.halaman} /> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

/** The parts the indicator is built from (IPM dimensions, poverty count and line, ADHK). */
function KomponenPanel({ data, slug, tahun }: { data: DataMakro; slug: SlugMakro; tahun: number }) {
  const ind = data.indikator.find((i) => i.slug === slug)!;
  return (
    <Panel judul="Komponen" info="Angka pembentuk atau pelengkap indikator. Arahkan kursor ke angka untuk kutipan dan sumbernya.">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {ind.komponen.map((k) => {
          const real = seri(data.nilai, slug, "tubaba", "realisasi", k.kode).filter((x) => x.tahun <= tahun);
          const n = real.at(-1)?.n;
          const l0 = n ? real.find((x) => x.tahun === n.tahun - 1)?.n : undefined;
          const t = data.nilai.find((x) => x.indikator === slug && x.komponen === k.kode && x.wilayah === "tubaba" && x.jenis === "target" && x.tahun === tahun);
          const l = n && l0 ? laju(n.nilai, l0.nilai) : null;
          // Component polarity follows the indicator except the poverty line, which simply rises with prices.
          const pol = k.kode === "garis_kemiskinan" ? null : slug === "kemiskinan" ? "turun" : "naik";
          const baik = l == null || pol == null ? null : lajuBaik(l, pol);
          const cap = n && t && n.tahun === tahun && pol ? capaian(n.nilai, t.nilai, pol) : null;
          const lampung = n ? data.nilai.find((x) => x.indikator === slug && x.komponen === k.kode && x.wilayah === "lampung" && x.jenis === "realisasi" && x.tahun === n.tahun) : undefined;
          return (
            <div key={k.kode} className="flex min-w-0 flex-col rounded-xl border border-border/70 p-3">
              <p className="truncate text-[13px] font-medium" title={k.nama}>
                {k.nama}
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xl font-semibold tracking-[-0.02em]">
                    <NilaiTip n={n} data={data} />
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    {n && n.tahun !== tahun ? <span>data {n.tahun}</span> : null}
                    {l != null ? (
                      <span className="font-semibold tabular-nums" style={{ color: baik == null ? "var(--viz-ink)" : baik ? "var(--status-good)" : "var(--status-serious)" }}>
                        {fmtLaju(l)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="w-20 shrink-0">
                  <Garis titik={real} tahun={n?.tahun} slug={slug} tinggi={32} />
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-0.5 border-t border-border/60 pt-2 text-[11px]">
                {t ? (
                  <p className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Target {tahun}</span>
                    <span>
                      <NilaiTip n={t} data={data} className="font-medium" />
                      {cap != null ? <span className="ml-1.5 font-semibold tabular-nums" style={{ color: warnaKategori(kategori(cap)) }}>{fmtPersen(cap)}</span> : null}
                    </span>
                  </p>
                ) : null}
                <p className="flex justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-1.5 rounded-full" style={{ background: WARNA_WILAYAH.lampung }} />
                    Lampung
                  </span>
                  <NilaiTip n={lampung} data={data} className="font-medium" />
                </p>
              </div>
              {n ? (
                <div className="mt-2">
                  <SumberChip s={cariSumber(data, n.sumber)} halaman={n.halaman} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** Every citation behind this indicator: which page, which table, the quoted line, which years. */
function BuktiPanel({ data, slug, node }: { data: DataMakro; slug: SlugMakro; node: NodeKerangka | null }) {
  const grup = new Map<string, NilaiMakro[]>();
  for (const n of data.nilai.filter((x) => x.indikator === slug)) {
    const k = `${n.sumber}|${n.halaman}|${n.lokasi}`;
    grup.set(k, [...(grup.get(k) ?? []), n]);
  }
  const kutipan = [...grup.values()].sort((a, b) => b.length - a.length);
  const dokumen = data.sumber.filter((s) => s.jenis === "dokumen" && s.indikator.includes(slug));
  return (
    <Panel judul="Bukti" info="Setiap kutipan yang menjadi dasar angka di halaman ini, langsung ke halaman berkasnya. Di bawahnya, dokumen di aplikasi yang memuat indikator ini." bodyClassName="px-2">
      <ul className="grid lg:grid-cols-2">
        {kutipan.map((ns) => {
          const n = ns[0];
          const s = cariSumber(data, n.sumber);
          if (!s) return null;
          const tahun = [...new Set(ns.map((x) => x.tahun))].sort();
          const wilayah = [...new Set(ns.map((x) => (x.jenis === "target" ? "Target" : NAMA_WILAYAH[x.wilayah])))];
          const komponen = [...new Set(ns.map((x) => x.komponen).filter(Boolean))];
          return (
            <li key={`${n.sumber}${n.halaman}${n.lokasi}`}>
              <Tip isi={<IsiNilai n={n} s={s} judul={labelSumber(s, n.halaman)} />} className="block">
                <a href={hrefHalaman(s, n.halaman)} target="_blank" rel="noreferrer" className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{n.lokasi}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {labelSumber(s, n.halaman)} · {wilayah.join(", ")}
                      {komponen.length ? ` · ${komponen.length} komponen` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{tahun.length > 1 ? `${tahun[0]}–${tahun.at(-1)}` : tahun[0]}</span>
                </a>
              </Tip>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 grid gap-4 border-t border-border/60 px-2 pt-2.5 lg:grid-cols-2">
        {dokumen.length ? (
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Dokumen di aplikasi</p>
            <div className="flex flex-wrap gap-1.5">
              {dokumen.map((d) => (
                <Tip key={d.id} isi={<><p className="font-medium">{d.judul}</p><p className="text-muted-foreground">{d.penerbit}</p></>} className="max-w-full">
                  <Link href={`/dokumen?dok=${d.dokId ?? d.id}`} className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-border/70 px-2 text-[11px] hover:bg-muted">
                    <FileText className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{judulPendek(d)}</span>
                  </Link>
                </Tip>
              ))}
            </div>
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            OPD terlibat
            <InfoTip isi="Dari pemetaan kebutuhan data Pemdi-AI, bukan penetapan resmi." />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {node?.opd.length ? (
              node.opd.map((o) => (
                <span key={o} className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px]">
                  {o}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Belum dipetakan.</span>
            )}
            {node?.dasar ? (
              <Tip isi={node.dasar}>
                <span className="inline-flex h-[22px] cursor-help items-center rounded-full px-2 text-[11px] font-medium" style={{ background: `color-mix(in oklab, ${WARNA_MAKRO} 12%, transparent)`, color: WARNA_MAKRO }}>
                  {node.dasar.split(/\s+—\s+/)[0]}
                </span>
              </Tip>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}

