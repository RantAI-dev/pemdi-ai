"use client";

/**
 * /dashboard-pemdi/spm/<bidang> and /dashboard-pemdi/spm/<bidang>/<cabang>/<layanan>:
 * one SPM bidang or one jenis layanan in depth. Trend against the 100% target,
 * the year-by-year table with the source of every value, the responsible OPD,
 * the citations, and the sources.
 */
import * as React from "react";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { InfoTip, Panel, Tip } from "@/components/viz";
import { Baris, Judul, KepalaDasbor, kepala, sel, TrenPersen, useParamUrl } from "@/components/viz-laporan";
import { cariSumberSpm, KartuLayanan, KategoriSpmChip, LajuSpm, NilaiSpmTip, PetaSpm, SumberDataSpm, SumberSpmChips, WARNA_SPM } from "@/components/viz-spm";
import { VERIFIKASI_SPM } from "@/components/spm-halaman";
import type { DataSpm, LayananSpm, NilaiSpm } from "@/lib/spm";
import {
  daftarBidang,
  fmtPoin,
  fmtSpm,
  INFO_JUMLAH_KOSONG,
  INFO_KATEGORI_SPM,
  NAMA_BIDANG_PENDEK,
  namaSubBaris,
  ringkasBidang,
  ringkasKab,
  ringkasLayanan,
  RUMUS_LAJU_SPM,
  RUMUS_SPM,
  seriBidangSpm,
  seriKabSpm,
  seriLayananSpm,
  tahunAda,
  TAHUN_SPM,
  type RingkasSpm,
} from "@/lib/spm-tampil";
import { hrefSumber, labelDokumen } from "@/lib/sumber-tampil";
import { cn } from "@/lib/utils";

export type NodeSpm = { penjelasan: string; dasar: string };

function useTahun(awal: number, utama: number) {
  const [tahun, setTahun] = React.useState(awal);
  useParamUrl({ tahun: tahun === utama ? null : String(tahun) });
  return [tahun, setTahun] as const;
}

const warnaLaju = (l: number | null) => (l == null || l === 0 ? undefined : l > 0 ? "var(--status-good)" : "var(--status-serious)");
const fmtL = (l: number | null) => (l == null ? "–" : `${l > 0 ? "+" : l < 0 ? "−" : "±"}${Math.abs(l).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

/* ------------------------------------------------------------------ Bidang */

export function SpmBidang({ data, bidangId, tahunAwal, node }: { data: DataSpm; bidangId: string; tahunAwal: number; node: NodeSpm }) {
  const b = daftarBidang(data).find((x) => x.id === bidangId)!;
  const [tahun, setTahun] = useTahun(tahunAwal, data.tahunUtama);
  const r = ringkasBidang(data, b.id, tahun);
  const semuaTahun = tahunAda(data.nilai, (n) => n.bidang === b.id);
  const tuntas = b.layanan.filter((l) => ringkasLayanan(data, l.id, tahun).kategori === "Tuntas").length;
  const seriB = seriBidangSpm(data, b.id, semuaTahun);
  const seriK = seriKabSpm(data, semuaTahun);

  return (
    <div className="flex flex-col gap-4">
      <KepalaDasbor
        judul={`SPM ${b.nama}`}
        info={
          <>
            <p className="whitespace-pre-line text-muted-foreground">{node.penjelasan}</p>
            <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{RUMUS_SPM}</p>
          </>
        }
        jejak={[
          { href: "/dashboard-pemdi/spm", label: "Capaian SPM" },
          { href: b.jalur, label: b.nama },
        ]}
        warna={WARNA_SPM}
        verifikasi={VERIFIKASI_SPM}
        tahun={tahun}
        tahunPilihan={TAHUN_SPM}
        onTahun={setTahun}
        angka={[
          { nilai: <NilaiSpmTip nilai={r.capaian} baris={r.baris} data={data} judul={`Indeks SPM ${b.nama} ${tahun}`} />, label: r.dilaporkan ? "indeks bidang" : "rata-rata layanan" },
          { nilai: <LajuSpm r={r} className="[&_span]:text-2xl [&_svg]:size-5" />, label: `laju vs ${tahun - 1}` },
          { nilai: r.kategori ? <KategoriSpmChip k={r.kategori} /> : "–", label: "kategori" },
          { nilai: `${tuntas}/${b.layanan.length}`, label: "layanan tuntas" },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-8" judul="Tren" info="Indeks bidang dibanding indeks SPM kabupaten, dengan target 100% (putus-putus). Belum ada pembanding Provinsi Lampung. Arahkan kursor untuk nilai dan sumbernya.">
          <TrenPersen
            deret={[
              { key: "kab", nama: "Kabupaten", warna: "var(--viz-ink)", titik: seriK },
              { key: "bidang", nama: NAMA_BIDANG_PENDEK[b.id] ?? b.nama, warna: WARNA_SPM, tebal: 2.5, titik: seriB },
            ]}
            tip={(t) => {
              const rb = ringkasBidang(data, b.id, t);
              const rk = ringkasKab(data, t);
              return <TipTahun t={t} data={data} isi={[{ nama: b.nama, r: rb }, { nama: "Kabupaten", r: rk }]} />;
            }}
          />
        </Panel>
        <RingkasPanel r={r} data={data} judul={`Indeks ${tahun}`} opd={b.opd}>
          {r.rataLayanan != null && r.capaian != null && Math.abs(r.rataLayanan - r.capaian) > 0.05 ? (
            <p className="flex justify-between gap-3">
              <Tip isi="Indeks yang dicetak sumber bisa berbeda dari rata-rata kartu layanan (misalnya satu layanan dipecah menjadi beberapa baris). Dasbor memakai indeks sumber.">
                <span className="cursor-help text-muted-foreground underline decoration-dotted underline-offset-2">Rata-rata layanan</span>
              </Tip>
              <span className="font-medium tabular-nums">{fmtSpm(r.rataLayanan)}</span>
            </p>
          ) : null}
        </RingkasPanel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {b.layanan.map((l) => (
          <KartuLayanan key={l.id} l={l} data={data} tahun={tahun} />
        ))}
      </div>

      <Panel judul="Per jenis layanan dan tahun" info={<><p className="text-muted-foreground">Baris tebal: indeks bidang. Klik sel untuk membuka layanannya.</p><p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_JUMLAH_KOSONG}</p></>}>
        <PetaSpm data={data} tahun={tahun} kolom={semuaTahun} bidang={b.id} satuKolom />
      </Panel>

      <TabelTahun
        data={data}
        tahun={tahun}
        daftar={semuaTahun}
        judul="Indeks bidang per tahun"
        ringkas={(t) => ringkasBidang(data, b.id, t)}
      />

      <BuktiSpm data={data} baris={data.nilai.filter((n) => n.bidang === b.id)} opd={b.opd} dasar={node.dasar} />

      <SumberDataSpm data={data} saring={(n) => n.bidang === b.id} judul={`Sumber data · SPM ${b.nama}`} />
    </div>
  );
}

/* ----------------------------------------------------------------- Layanan */

export function SpmLayanan({ data, layanan: l, tahunAwal, node }: { data: DataSpm; layanan: LayananSpm; tahunAwal: number; node: NodeSpm }) {
  const [tahun, setTahun] = useTahun(tahunAwal, data.tahunUtama);
  const r = ringkasLayanan(data, l.id, tahun);
  const semuaTahun = tahunAda(data.nilai, (n) => n.layanan === l.id);
  const ada = semuaTahun.length > 0;
  const bidangTahun = tahunAda(data.nilai, (n) => n.bidang === l.bidang);
  const pecah = data.nilai.some((n) => n.layanan === l.id && namaSubBaris(n));

  return (
    <div className="flex flex-col gap-4">
      <KepalaDasbor
        judul={l.judul}
        info={
          <>
            <p className="text-muted-foreground">{node.penjelasan}</p>
            <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{RUMUS_SPM}</p>
          </>
        }
        sub={`SPM Bidang ${l.bidangNama}`}
        jejak={[
          { href: "/dashboard-pemdi/spm", label: "Capaian SPM" },
          { href: `/dashboard-pemdi/spm/${l.bidang}`, label: l.bidangNama },
          { href: l.jalur, label: l.judul },
        ]}
        warna={WARNA_SPM}
        verifikasi={VERIFIKASI_SPM}
        tahun={tahun}
        tahunPilihan={ada ? TAHUN_SPM : undefined}
        onTahun={setTahun}
        angka={
          ada
            ? [
                { nilai: <NilaiSpmTip nilai={r.capaian} baris={r.baris} data={data} judul={l.judul} />, label: "capaian", info: undefined },
                { nilai: <LajuSpm r={r} className="[&_span]:text-2xl [&_svg]:size-5" />, label: `laju vs ${tahun - 1}` },
                { nilai: r.kategori ? <KategoriSpmChip k={r.kategori} /> : "–", label: "kategori" },
                { nilai: "100%", label: "target" },
              ]
            : [{ nilai: "–", label: "belum ada data" }]
        }
      />

      {!ada ? (
        <Panel judul="Belum ada data" info="Layanan ini kewenangan kabupaten, tetapi tidak tercantum di tabel capaian SPM sumber.">
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-4 text-[13px]">
            <p>
              Tabel 2.109 RKPD 2027 (Perbup 18/2026) hanya memuat dua jenis layanan bidang Perumahan Rakyat; layanan <span className="font-medium">{l.judul}</span> tidak dicantumkan, sehingga capaiannya belum bisa ditampilkan.
            </p>
            <p className="text-muted-foreground">Yang perlu diunggah: Laporan Penerapan SPM bidang ini atau ekspor e-SPM {l.opd.join(", ")} yang memuat jumlah sasaran dan jumlah terlayani.</p>
            <Link href="/dokumen" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80">
              <Upload className="size-3.5" /> Unggah dokumen
            </Link>
          </div>
          <OpdBaris opd={l.opd} dasar={node.dasar} className="mt-3" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-12">
            <Panel className="lg:col-span-8" judul="Tren" info="Capaian layanan dibanding indeks bidangnya, dengan target 100% (putus-putus). Arahkan kursor untuk nilai dan sumbernya.">
              <TrenPersen
                deret={[
                  { key: "bidang", nama: `Bidang ${NAMA_BIDANG_PENDEK[l.bidang] ?? l.bidangNama}`, warna: "var(--viz-ink)", titik: seriBidangSpm(data, l.bidang, bidangTahun.filter((t) => t >= semuaTahun[0])) },
                  { key: "layanan", nama: "Layanan ini", warna: WARNA_SPM, tebal: 2.5, titik: seriLayananSpm(data, l.id, semuaTahun) },
                ]}
                tip={(t) => <TipTahun t={t} data={data} isi={[{ nama: "Layanan ini", r: ringkasLayanan(data, l.id, t) }, { nama: `Bidang ${NAMA_BIDANG_PENDEK[l.bidang] ?? l.bidangNama}`, r: ringkasBidang(data, l.bidang, t) }]} />}
              />
            </Panel>
            <RingkasPanel r={r} data={data} judul={`Capaian ${tahun}`} opd={l.opd} />
          </div>

          {pecah ? <SubBaris data={data} l={l} tahun={tahun} daftar={semuaTahun} /> : null}

          <TabelTahun data={data} tahun={tahun} daftar={semuaTahun} judul="Capaian per tahun" ringkas={(t) => ringkasLayanan(data, l.id, t)} kutipan />

          <BuktiSpm data={data} baris={data.nilai.filter((n) => n.layanan === l.id)} opd={l.opd} dasar={node.dasar} />
        </>
      )}

      {ada ? (
        <SumberDataSpm data={data} saring={(n) => n.layanan === l.id} judul={`Sumber data · ${l.judul}`} />
      ) : (
        <SumberDataSpm data={data} saring={(n) => n.bidang === l.bidang} judul={`Dokumen yang sudah diperiksa · SPM ${l.bidangNama}`} />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Pieces */

function TipTahun({ t, data, isi }: { t: number; data: DataSpm; isi: { nama: string; r: RingkasSpm }[] }) {
  return (
    <>
      <Judul>{t}</Judul>
      {isi.map(({ nama, r }) => {
        const n = r.baris[0];
        const s = cariSumberSpm(data, n?.sumber);
        return (
          <div key={nama} className="mt-1">
            <Baris k={nama} v={fmtSpm(r.capaian)} />
            {s && n ? <p className="text-[10.5px] leading-4 text-muted-foreground">{labelDokumen(s, n.halaman)}</p> : null}
          </div>
        );
      })}
    </>
  );
}

function RingkasPanel({ r, data, judul, opd, children }: { r: RingkasSpm; data: DataSpm; judul: string; opd: string[]; children?: React.ReactNode }) {
  return (
    <Panel className="lg:col-span-4" judul={judul} info={INFO_KATEGORI_SPM}>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">
            <NilaiSpmTip nilai={r.capaian} baris={r.baris} data={data} />
          </span>
          <KategoriSpmChip k={r.kategori} />
        </div>
        <div className="flex flex-col gap-1 text-[13px]">
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Target</span>
            <span className="font-medium tabular-nums">100%</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Tahun {r.tahun - 1}</span>
            <NilaiSpmTip nilai={r.lalu} baris={r.barisLalu} data={data} className="font-medium" />
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Selisih</span>
            <span className="font-medium tabular-nums">{fmtPoin(r.selisih)}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Laju</span>
            <LajuSpm r={r} />
          </p>
          {children}
          {r.capaian != null && r.capaian < 100 ? (
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Kesenjangan ke target</span>
              <span className="font-medium tabular-nums">{(100 - r.capaian).toLocaleString("id-ID", { maximumFractionDigits: 2 })} poin</span>
            </p>
          ) : null}
        </div>
        <div className="border-t border-border/60 pt-2">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Penanggung jawab</p>
          <div className="flex flex-wrap gap-1">
            {opd.map((o) => (
              <span key={o} className="rounded-full border border-border/70 px-2 py-0.5 text-[11px]">
                {o}
              </span>
            ))}
          </div>
        </div>
        <SumberSpmChips baris={[...r.baris, ...r.barisLalu]} data={data} className="border-t border-border/60 pt-2" />
      </div>
    </Panel>
  );
}

function TabelTahun({ data, tahun, daftar, judul, ringkas, kutipan }: { data: DataSpm; tahun: number; daftar: number[]; judul: string; ringkas: (t: number) => RingkasSpm; kutipan?: boolean }) {
  return (
    <Panel
      judul={judul}
      info={
        <>
          <p className="text-muted-foreground">{RUMUS_LAJU_SPM}. Arahkan kursor ke angka untuk kutipan dan lokasinya.</p>
          <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_JUMLAH_KOSONG}</p>
        </>
      }
      bodyClassName="overflow-x-auto"
    >
      <table className="w-full min-w-[48rem] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={kepala}>Tahun</th>
            <th className={cn(kepala, "text-right")}>
              <span className="inline-flex items-center gap-0.5">
                Capaian
                <InfoTip isi={INFO_JUMLAH_KOSONG} />
              </span>
            </th>
            <th className={cn(kepala, "text-right")}>Laju</th>
            <th className={kepala}>Kategori</th>
            <th className={kepala}>Sumber</th>
            {kutipan ? <th className={kepala}>Lokasi di sumber</th> : null}
          </tr>
        </thead>
        <tbody>
          {daftar.map((t) => {
            const r = ringkas(t);
            return (
              <tr key={t} className={cn(t === tahun && "bg-muted/50")}>
                <td className={cn(sel, "font-medium tabular-nums")}>{t}</td>
                <td className={cn(sel, "text-right font-medium")}>
                  <NilaiSpmTip nilai={r.capaian} baris={r.baris} data={data} />
                </td>
                <td className={cn(sel, "text-right font-medium tabular-nums")} style={{ color: warnaLaju(r.laju) }}>
                  {fmtL(r.laju)}
                </td>
                <td className={sel}>
                  <KategoriSpmChip k={r.kategori} kecil />
                </td>
                <td className={sel}>
                  <SumberSpmChips baris={r.baris} data={data} className="max-w-72" />
                </td>
                {kutipan ? (
                  <td className={cn(sel, "max-w-md text-[11px] text-muted-foreground")}>
                    <span className="line-clamp-2">{r.baris[0]?.lokasi ?? "–"}</span>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

/** A service the source splits into several rows (rawan bencana): each row per year. */
function SubBaris({ data, l, tahun, daftar }: { data: DataSpm; l: LayananSpm; tahun: number; daftar: number[] }) {
  const baris = data.nilai.filter((n) => n.layanan === l.id && n.jenis === "capaian");
  const nama = [...new Set(baris.map((n) => namaSubBaris(n)).filter((x): x is string => !!x))];
  return (
    <Panel judul="Rincian di sumber" info="Tabel sumber memecah layanan ini menjadi beberapa baris; capaian layanan adalah rata-ratanya." bodyClassName="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={kepala}>Sub-layanan</th>
            {daftar.map((t) => (
              <th key={t} className={cn(kepala, "text-right", t === tahun && "text-foreground")}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nama.map((nm) => (
            <tr key={nm}>
              <td className={cn(sel, "first-letter:uppercase")}>{nm}</td>
              {daftar.map((t) => {
                const n = baris.find((x) => x.tahun === t && namaSubBaris(x) === nm);
                return (
                  <td key={t} className={cn(sel, "text-right", t === tahun && "bg-muted/50 font-medium")}>
                    {n ? <NilaiSpmTip nilai={n.nilai} baris={[n]} data={data} /> : <span className="text-muted-foreground">–</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className={cn(sel, "font-medium")}>Rata-rata (capaian layanan)</td>
            {daftar.map((t) => {
              const r = ringkasLayanan(data, l.id, t);
              return (
                <td key={t} className={cn(sel, "text-right font-semibold", t === tahun && "bg-muted/50")}>
                  {fmtSpm(r.capaian)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

function OpdBaris({ opd, dasar, className }: { opd: string[]; dasar: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        OPD penanggung jawab
        <InfoTip isi="Dari pemetaan kerangka SPM Pemdi-AI, bukan penetapan resmi." />
      </p>
      <div className="flex flex-wrap gap-1.5">
        {opd.map((o) => (
          <span key={o} className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px]">
            {o}
          </span>
        ))}
        <Tip isi={dasar}>
          <span className="inline-flex h-[22px] cursor-help items-center rounded-full px-2 text-[11px] font-medium" style={{ background: `color-mix(in oklab, ${WARNA_SPM} 12%, transparent)`, color: WARNA_SPM }}>
            {dasar.split(/\s+—\s+/)[0]}
          </span>
        </Tip>
      </div>
    </div>
  );
}

/** Every citation behind this page: which table and page, the years, straight to the page of the file. */
function BuktiSpm({ data, baris, opd, dasar }: { data: DataSpm; baris: NilaiSpm[]; opd: string[]; dasar: string }) {
  // One entry per source table and page; the rows quoted from it are listed in the tooltip.
  const tabel = (n: NilaiSpm) => n.lokasi.split(/\s+—\s+/)[0];
  const grup = new Map<string, NilaiSpm[]>();
  for (const n of baris) {
    const k = `${n.sumber}|${n.halaman}|${tabel(n)}`;
    grup.set(k, [...(grup.get(k) ?? []), n]);
  }
  const kutipan = [...grup.values()].sort((a, b) => Math.max(...b.map((x) => x.tahun)) - Math.max(...a.map((x) => x.tahun)) || (a[0].halaman ?? 0) - (b[0].halaman ?? 0));
  return (
    <Panel judul="Bukti" info="Setiap tabel sumber yang menjadi dasar angka di halaman ini, langsung ke halaman PDF-nya. Tabel SPM di RKPD 2027 menyebut sumbernya spm.bangda.kemendagri.go.id." bodyClassName="px-2">
      <ul className="grid lg:grid-cols-2">
        {kutipan.map((ns) => {
          const n = ns[0];
          const s = cariSumberSpm(data, n.sumber);
          if (!s) return null;
          const tahun = [...new Set(ns.map((x) => x.tahun))].sort();
          const rinci = [...new Set(ns.map((x) => x.lokasi.split(/\s+—\s+/)[1]).filter(Boolean))];
          return (
            <li key={`${n.sumber}${n.halaman}${tabel(n)}`}>
              <Tip
                className="block"
                isi={
                  <>
                    <Judul>{labelDokumen(s, n.halaman)}</Judul>
                    <p className="text-muted-foreground">{tabel(n)}</p>
                    {n.kutipan && rinci.length <= 1 ? <p className="mt-1 font-mono text-[10.5px] leading-4 text-foreground/80">“{n.kutipan}”</p> : null}
                    {rinci.length > 1 ? (
                      <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                        {rinci.slice(0, 8).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                        {rinci.length > 8 ? <li>+{rinci.length - 8} baris lainnya</li> : null}
                      </ul>
                    ) : null}
                  </>
                }
              >
                <a href={hrefSumber(s, n.halaman)} target="_blank" rel="noreferrer" className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{tabel(n).replace(/,\s*hlm\..*$/, "")}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {labelDokumen(s, n.halaman)} · {ns.length} angka{rinci.length > 1 ? ` · ${rinci.length} baris` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{tahun.length > 1 ? `${tahun[0]}–${tahun.at(-1)}` : tahun[0]}</span>
                </a>
              </Tip>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 border-t border-border/60 px-2 pt-2.5">
        <OpdBaris opd={opd} dasar={dasar} />
        <p className="mt-2.5 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">{INFO_JUMLAH_KOSONG}</p>
      </div>
    </Panel>
  );
}
