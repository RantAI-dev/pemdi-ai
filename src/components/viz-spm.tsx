"use client";

/**
 * Pieces of the Capaian SPM views, on top of viz-laporan: value tooltips with
 * the quoted source line, kategori chip, laju, bidang and service cards, the
 * services x years grid, and the source list closing every SPM page.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { InfoTip, Tip } from "@/components/viz";
import { Baris, ChipKategori, ChipSumber, DaftarSumber, GarisPersen, Judul, Pisah, SumberRingkasan } from "@/components/viz-laporan";
import type { SumberMakro } from "@/lib/makro";
import type { DataSpm, LayananSpm, NilaiSpm } from "@/lib/spm";
import { capaianLayanan, kategoriSpm, type KategoriSpm } from "@/lib/spm-hitung";
import {
  barisIndeksBidang,
  barisLayanan,
  daftarBidang,
  fmtPoin,
  fmtSpm,
  INFO_KATEGORI_SPM,
  jumlahPerSumberSpm,
  NAMA_BIDANG_PENDEK,
  namaSubBaris,
  ringkasBidang,
  ringkasLayanan,
  RUMUS_LAJU_SPM,
  RUMUS_SPM,
  seriBidangSpm,
  tahunAda,
  warnaSpm,
  type BidangSpm,
  type RingkasSpm,
} from "@/lib/spm-tampil";
import { grupDokumen, hrefSumber, judulDokumen, labelDokumen, labelRingkas } from "@/lib/sumber-tampil";
import { cn } from "@/lib/utils";

export const WARNA_SPM = "var(--viz-spm)";

export const cariSumberSpm = (data: Pick<DataSpm, "sumber">, id?: string): SumberMakro | undefined => (id ? data.sumber.find((s) => s.id === id) : undefined);

/* ------------------------------------------------------------- Value tips */

/** Where a figure comes from: each source row behind it, its page, table, quoted line and note. */
export function IsiNilaiSpm({ baris, data, judul, label }: { baris: NilaiSpm[]; data: Pick<DataSpm, "sumber">; judul?: React.ReactNode; label?: string }) {
  if (!baris.length) return judul ? <Judul>{judul}</Judul> : null;
  const n = baris[0];
  const s = cariSumberSpm(data, n.sumber);
  const rata = baris.length > 1 ? baris.reduce((a, b) => a + b.nilai, 0) / baris.length : n.nilai;
  return (
    <>
      {judul ? <Judul>{judul}</Judul> : null}
      <Baris k={label ?? `${n.jenis === "indeks" ? "Indeks" : "Capaian"} ${n.tahun}`} v={fmtSpm(rata)} />
      {baris.length > 1 ? (
        <div className="mt-1 flex flex-col gap-0.5">
          {baris.map((b, i) => (
            <Baris key={i} k={<span className="text-[10.5px]">{namaSubBaris(b) ?? `baris ${i + 1}`}</span>} v={<span className="text-[10.5px]">{fmtSpm(b.nilai)}</span>} />
          ))}
          <p className="text-[10.5px] text-muted-foreground">Sumber memecah layanan ini menjadi {baris.length} baris; dipakai rata-ratanya.</p>
        </div>
      ) : null}
      <Pisah>
        {s ? <p className="font-medium text-foreground">{labelDokumen(s, n.halaman)}</p> : null}
        <p>{n.lokasi}</p>
        {n.kutipan ? <p className="mt-1 font-mono text-[10.5px] leading-4 text-foreground/80">“{n.kutipan}”</p> : null}
        {n.catatan && baris.length === 1 ? <p className="mt-1">{n.catatan}</p> : null}
      </Pisah>
    </>
  );
}

/** A percentage with its provenance on hover. */
export function NilaiSpmTip({ nilai, baris, data, className, children, judul }: { nilai: number | null; baris: NilaiSpm[]; data: Pick<DataSpm, "sumber">; className?: string; children?: React.ReactNode; judul?: React.ReactNode }) {
  if (nilai == null) return <span className={cn("text-muted-foreground", className)}>–</span>;
  const isi = (
    <span className={cn("whitespace-nowrap tabular-nums", baris.length && "cursor-help")}>{children ?? fmtSpm(nilai)}</span>
  );
  return baris.length ? (
    <Tip isi={<IsiNilaiSpm baris={baris} data={data} judul={judul} />} className={className}>
      {isi}
    </Tip>
  ) : (
    <Tip isi={<><Judul>Dihitung</Judul><p className="text-muted-foreground">Rata-rata capaian jenis layanan; sumber tidak mencetak indeks untuk tahun ini.</p></>} className={className}>
      {isi}
    </Tip>
  );
}

/* ------------------------------------------------------------ Small marks */

export function KategoriSpmChip({ k, kecil, sumberLabel }: { k: KategoriSpm | null | undefined; kecil?: boolean; sumberLabel?: string | null }) {
  return (
    <ChipKategori
      label={k}
      warna={warnaSpm(k)}
      kecil={kecil}
      info={
        k ? (
          <>
            <Judul>Kategori: {k}</Judul>
            <p className="text-muted-foreground">{INFO_KATEGORI_SPM}</p>
            {sumberLabel ? <p className="mt-1 text-muted-foreground">Label menurut sumber: {sumberLabel}.</p> : null}
          </>
        ) : null
      }
    />
  );
}

/** The source's own label ("Tuntas Utama"), set apart from the app's kategori. */
export function LabelSumberSpm({ label }: { label: string | null | undefined }) {
  if (!label) return null;
  return (
    <Tip isi={<><Judul>Kategori menurut sumber: {label}</Judul><p className="text-muted-foreground">Dicetak di Tabel 2.105 RKPD 2027 (Perbup 18/2026). Sumber tidak mencantumkan ambang angka Tuntas Pratama/Madya/Utama.</p></>}>
      <span className="inline-flex h-5 cursor-help items-center whitespace-nowrap rounded-full border border-border px-2 text-[10.5px] font-medium text-muted-foreground">sumber: {label}</span>
    </Tip>
  );
}

/** Signed laju with an arrow; colour says better or worse (higher capaian is better). */
export function LajuSpm({ r, className }: { r: Pick<RingkasSpm, "laju" | "selisih" | "capaian" | "lalu" | "tahun">; className?: string }) {
  if (r.laju == null) return <span className={cn("text-xs text-muted-foreground", className)}>laju –</span>;
  const Ikon = r.laju > 0 ? ArrowUpRight : r.laju < 0 ? ArrowDownRight : ArrowRight;
  const warna = r.laju === 0 ? "var(--viz-ink)" : r.laju > 0 ? "var(--status-good)" : "var(--status-serious)";
  const teks = `${r.laju > 0 ? "+" : r.laju < 0 ? "−" : "±"}${Math.abs(r.laju).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  return (
    <Tip
      className={className}
      isi={
        <>
          <Judul>Laju {r.tahun} terhadap {r.tahun - 1}</Judul>
          <Baris k={`Tahun ${r.tahun - 1}`} v={fmtSpm(r.lalu)} />
          <Baris k={`Tahun ${r.tahun}`} v={fmtSpm(r.capaian)} />
          <Baris k="Selisih" v={fmtPoin(r.selisih)} />
          <Baris k="Laju" v={teks} />
          <Pisah>{RUMUS_LAJU_SPM}</Pisah>
        </>
      }
    >
      <span className="inline-flex cursor-help items-center gap-0.5 text-xs font-semibold tabular-nums" style={{ color: warna }}>
        <Ikon className="size-3.5" />
        {teks}
      </span>
    </Tip>
  );
}

export function SumberSpmChip({ n, data, className, ringkas }: { n?: NilaiSpm; data: Pick<DataSpm, "sumber">; className?: string; ringkas?: boolean }) {
  const s = cariSumberSpm(data, n?.sumber);
  if (!s || !n) return null;
  return <ChipSumber s={s} halaman={n.halaman} label={ringkas ? labelRingkas(s, n.halaman) : labelDokumen(s, n.halaman)} className={className} href={hrefSumber} />;
}

/** One chip per distinct source page behind a set of rows. */
export function SumberSpmChips({ baris, data, className, ringkas }: { baris: NilaiSpm[]; data: Pick<DataSpm, "sumber">; className?: string; ringkas?: boolean }) {
  const unik = baris.filter((n, i, a) => a.findIndex((m) => m.sumber === n.sumber && m.halaman === n.halaman) === i);
  return (
    <div className={cn("flex min-w-0 flex-wrap gap-1", className)}>
      {unik.map((n) => (
        <SumberSpmChip key={`${n.sumber}${n.halaman}`} n={n} data={data} ringkas={ringkas} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Cards */

const kartu =
  "group relative flex min-w-0 cursor-pointer flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.14)]";

/** One bidang: its index large, laju, sparkline, kategori, the services below 100% and a dot per service. */
export function KartuBidang({ b, data, tahun }: { b: BidangSpm; data: DataSpm; tahun: number }) {
  const router = useRouter();
  const r = ringkasBidang(data, b.id, tahun);
  const titik = seriBidangSpm(data, b.id, tahunAda(data.nilai, (n) => n.bidang === b.id));
  const buka = () => router.push(b.jalur);
  return (
    <div role="link" tabIndex={0} onClick={buka} onKeyDown={(e) => e.key === "Enter" && buka()} className={kartu}>
      <div className="flex items-center gap-1.5">
        <span className="grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-semibold" style={{ background: `color-mix(in oklab, ${WARNA_SPM} 14%, transparent)`, color: WARNA_SPM }}>
          {b.kode}
        </span>
        <Link href={b.jalur} onClick={(e) => e.stopPropagation()} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
          {NAMA_BIDANG_PENDEK[b.id] ?? b.nama}
        </Link>
        <span onClick={(e) => e.stopPropagation()}>
          <InfoTip
            isi={
              <>
                <Judul>SPM Bidang {b.nama}</Judul>
                <p className="text-muted-foreground">{b.layanan.length} jenis layanan kewenangan kabupaten. {r.dilaporkan ? "Angka besar: indeks bidang yang dicetak sumber." : "Angka besar: rata-rata capaian jenis layanan."}</p>
                <Pisah>
                  <p>{RUMUS_SPM}</p>
                  <p className="mt-1">OPD: {b.opd.join(", ")}</p>
                </Pisah>
              </>
            }
          />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <NilaiSpmTip nilai={r.capaian} baris={r.baris} data={data} judul={`Indeks SPM ${b.nama} ${tahun}`}>
            {r.capaian == null ? (
              "–"
            ) : (
              <span className="flex items-baseline gap-0.5">
                <span className="text-4xl font-semibold tracking-[-0.04em]">{fmtSpm(r.capaian).replace("%", "")}</span>
                <span className="text-sm font-medium text-muted-foreground">%</span>
              </span>
            )}
          </NilaiSpmTip>
          <div className="mt-1 flex items-center gap-2">
            <LajuSpm r={r} />
          </div>
        </div>
        <div className="w-28 shrink-0" onClick={(e) => e.stopPropagation()}>
          <GarisPersen titik={titik} tahun={tahun} warna={WARNA_SPM} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
        <span onClick={(e) => e.stopPropagation()}>
          <KategoriSpmChip k={r.kategori} />
        </span>
        <Tip
          className="ml-auto"
          isi={
            r.dibawah.length || r.tanpaData.length ? (
              <>
                <Judul>Jenis layanan di bawah 100% ({tahun})</Judul>
                {r.dibawah.map((l) => (
                  <Baris key={l.id} k={l.judul} v={fmtSpm(capaianLayanan(data.nilai, l.id, tahun).capaian)} />
                ))}
                {r.tanpaData.map((l) => (
                  <Baris key={l.id} k={l.judul} v="belum ada data" />
                ))}
              </>
            ) : (
              `Semua ${b.layanan.length} jenis layanan mencapai 100% pada ${tahun}.`
            )
          }
        >
          <span className="cursor-help text-[11px] text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{r.dibawah.length}</span>/{b.layanan.length} layanan &lt;100%
          </span>
        </Tip>
      </div>

      <div className="mt-3 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
        {b.layanan.map((l) => {
          const c = capaianLayanan(data.nilai, l.id, tahun).capaian;
          const k = c == null ? null : kategoriSpm(c);
          return (
            <Tip key={l.id} isi={<><Judul>{l.judul}</Judul><Baris k={`Capaian ${tahun}`} v={c == null ? "belum ada data" : fmtSpm(c)} />{k ? <p className="text-muted-foreground">{k}</p> : null}</>}>
              <Link
                href={l.jalur}
                aria-label={l.judul}
                className={cn("block size-3.5 rounded-[4px] transition-transform hover:scale-125", c == null && "border border-dashed border-border")}
                style={c == null ? undefined : { background: warnaSpm(k) }}
              />
            </Tip>
          );
        })}
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-border/60 pt-2.5">
        <SumberSpmChips baris={r.baris} data={data} />
        <ArrowUpRight className="ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: WARNA_SPM }} />
      </div>
    </div>
  );
}

/** One service: capaian large, laju, sparkline, kategori, source. */
export function KartuLayanan({ l, data, tahun }: { l: LayananSpm; data: DataSpm; tahun: number }) {
  const router = useRouter();
  const r = ringkasLayanan(data, l.id, tahun);
  const kini = r.capaian;
  const baris = r.baris;
  const tahunL = tahunAda(data.nilai, (n) => n.layanan === l.id);
  const titik = tahunL.map((t) => ({ tahun: t, nilai: capaianLayanan(data.nilai, l.id, t).capaian ?? null }));
  const k = r.kategori;
  const buka = () => router.push(l.jalur);
  return (
    <div role="link" tabIndex={0} onClick={buka} onKeyDown={(e) => e.key === "Enter" && buka()} className={cn(kartu, "p-3.5")}>
      <Tip isi={l.judul} className="block min-w-0">
        <Link href={l.jalur} onClick={(e) => e.stopPropagation()} className="line-clamp-2 min-h-10 text-[13px] font-semibold leading-5 hover:underline">
          {l.judul}
        </Link>
      </Tip>
      {kini == null ? (
        <div className="mt-2 flex flex-1 flex-col justify-center rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          <Tip isi={<><Judul>Belum ada data</Judul><p className="text-muted-foreground">Tabel SPM di RKPD 2027 tidak mencantumkan layanan ini. {INFO_JUMLAH_KOSONG_PENDEK}</p></>}>
            <span className="cursor-help font-medium">belum ada data</span>
          </Tip>
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <NilaiSpmTip nilai={kini} baris={baris} data={data} judul={l.judul}>
                <span className="text-2xl font-semibold tracking-[-0.03em]">{fmtSpm(kini)}</span>
              </NilaiSpmTip>
              <div className="mt-0.5">
                <LajuSpm r={r} />
              </div>
            </div>
            <div className="w-20 shrink-0" onClick={(e) => e.stopPropagation()}>
              <GarisPersen titik={titik} tahun={tahun} warna={WARNA_SPM} tinggi={32} />
            </div>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 border-t border-border/60 pt-2" onClick={(e) => e.stopPropagation()}>
            <KategoriSpmChip k={k} kecil />
            <SumberSpmChips baris={baris.slice(0, 1)} data={data} className="ml-auto justify-end" ringkas />
          </div>
        </>
      )}
    </div>
  );
}

const INFO_JUMLAH_KOSONG_PENDEK = "Unggah Laporan Penerapan SPM / ekspor e-SPM dari OPD untuk melengkapinya.";

/* ------------------------------------------------------ Services x years */

/** Fill of a cell on the single SPM hue: lighter = lower capaian, deepest at 100%. */
const isiSel = (v: number) => Math.round(14 + Math.max(0, Math.min(1, (v - 50) / 50)) ** 1.4 * 74);

/** Split bidang into two columns of about equal height, order kept. */
function belah(bidang: BidangSpm[]): [BidangSpm[], BidangSpm[]] {
  const tinggi = bidang.map((b) => b.layanan.length + 1);
  const total = tinggi.reduce((a, b) => a + b, 0);
  let acc = 0;
  let terbaik = 0;
  let selisih = Infinity;
  for (let i = 0; i < bidang.length; i++) {
    acc += tinggi[i];
    const d = Math.abs(total - 2 * acc);
    if (d < selisih) {
      selisih = d;
      terbaik = i + 1;
    }
  }
  return [bidang.slice(0, terbaik), bidang.slice(terbaik)];
}

/**
 * Every kabupaten service by year as a grid of cells, grouped by bidang with
 * the bidang index on its header row. Cells under 90% carry a dot. Click a
 * cell or name to open the service.
 */
export function PetaSpm({ data, tahun, kolom, bidang: pilihBidang, satuKolom }: { data: DataSpm; tahun: number; kolom: number[]; bidang?: string; satuKolom?: boolean }) {
  const router = useRouter();
  const semua = daftarBidang(data).filter((b) => !pilihBidang || b.id === pilihBidang);
  const kelompok = satuKolom || semua.length < 2 ? [semua] : belah(semua);
  const sel = (v: number | null, baris: NilaiSpm[], judul: string, href: string | null, th: number, tebal?: boolean) => (
    <Tip
      key={th}
      className="block"
      isi={v == null ? <><Judul>{judul}</Judul><p className="text-muted-foreground">{th}: belum ada data</p></> : <IsiNilaiSpm baris={baris} data={data} judul={judul} />}
    >
      <button
        type="button"
        disabled={!href}
        onClick={() => href && router.push(href)}
        className={cn(
          "relative grid h-7 w-full place-items-center rounded-md text-[11px] tabular-nums transition-transform enabled:hover:scale-[1.06]",
          v == null ? "border border-dashed border-border text-muted-foreground/60" : tebal ? "font-semibold" : "font-medium",
          th === tahun && "ring-1 ring-foreground/25 ring-offset-1 ring-offset-card",
        )}
        style={v == null ? undefined : { backgroundColor: `color-mix(in oklab, ${WARNA_SPM} ${isiSel(v)}%, transparent)`, color: isiSel(v) > 60 ? "white" : undefined }}
      >
        {v == null ? "–" : v >= 100 ? "100" : v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
        {v != null && v < 90 ? <span className="absolute right-1 top-1 size-1.5 rounded-full ring-1 ring-card" style={{ background: "var(--status-serious)" }} /> : null}
      </button>
    </Tip>
  );
  return (
    <div>
      <div className={cn("grid gap-x-6 gap-y-4", kelompok.length > 1 && "xl:grid-cols-2")}>
        {kelompok.map((grup, gi) => (
          <div
            key={gi}
            className="grid items-center gap-1"
            style={{ gridTemplateColumns: kelompok.length > 1 ? `minmax(0,1fr) repeat(${kolom.length}, minmax(2.75rem,3.5rem))` : `minmax(0,24rem) repeat(${kolom.length}, minmax(2.75rem,1fr))` }}
          >
            <span />
            {kolom.map((t) => (
              <span key={t} className={cn("pb-1 text-center text-[11px] tabular-nums text-muted-foreground", t === tahun && "font-semibold text-foreground")}>
                {t}
              </span>
            ))}
            {grup.map((b) => (
              <React.Fragment key={b.id}>
                <Link href={b.jalur} className="mt-1.5 truncate pr-2 text-xs font-semibold hover:underline">
                  {b.kode}. {NAMA_BIDANG_PENDEK[b.id] ?? b.nama}
                </Link>
                {kolom.map((t) => {
                  const i = barisIndeksBidang(data.nilai, b.id, t);
                  const r = ringkasBidang(data, b.id, t);
                  return <div key={t} className="mt-1.5">{sel(r.capaian, i ? [i] : [], `Indeks SPM ${b.nama} ${t}`, b.jalur, t, true)}</div>;
                })}
                {b.layanan.map((l) => (
                  <React.Fragment key={l.id}>
                    <Tip isi={l.judul} className="min-w-0">
                      <Link href={l.jalur} className="block truncate pl-3 pr-2 text-xs text-muted-foreground hover:text-foreground hover:underline">
                        {l.judul}
                      </Link>
                    </Tip>
                    {kolom.map((t) => {
                      const baris = barisLayanan(data.nilai, l.id, t);
                      return sel(capaianLayanan(data.nilai, l.id, t).capaian ?? null, baris, `${l.judul} · ${t}`, l.jalur, t);
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {[60, 80, 90, 95, 100].map((v) => (
            <span key={v} className="h-2.5 w-4 rounded-[3px]" style={{ backgroundColor: `color-mix(in oklab, ${WARNA_SPM} ${isiSel(v)}%, transparent)` }} />
          ))}
          rendah → 100%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: "var(--status-serious)" }} /> di bawah 90% (belum tuntas)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-[3px] border border-dashed border-border" /> belum ada data
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Sources */

/** Every SPM source document; with `saring`, only those behind the rows kept, with their pages. */
export function SumberDataSpm({ data, saring, judul = "Sumber data SPM", className }: { data: DataSpm; saring?: (n: NilaiSpm) => boolean; judul?: string; className?: string }) {
  const f = saring ?? (() => true);
  const jumlah = jumlahPerSumberSpm(data.nilai, f);
  const daftar = saring ? data.sumber.filter((s) => jumlah.has(s.id)) : data.sumber;
  const halaman = (id: string) => [...new Set(data.nilai.filter((n) => n.sumber === id && f(n) && n.halaman != null).map((n) => n.halaman!))].sort((a, b) => a - b);
  return (
    <DaftarSumber
      className={className}
      grup={grupDokumen(daftar, jumlah)}
      jumlah={jumlah}
      judul={judul}
      info="Berkas sumber setiap angka capaian SPM: tabel SPM di RKPD 2027 (mengutip spm.bangda.kemendagri.go.id) dan RPJMD untuk 2019–2020. Klik nomor halaman untuk membuka PDF di halaman itu. Sumber tanpa angka terpakai adalah dokumen pendukung."
      warna={WARNA_SPM}
      judulTampil={(s) => (s.jenis === "rpjmd" ? "RPJMD Kabupaten Tulang Bawang Barat 2025–2029" : judulDokumen(s))}
      halaman={halaman}
      href={hrefSumber}
      infoJumlah={(n) => `${n} angka capaian/indeks di halaman ini dikutip dari berkas ini.`}
    />
  );
}

export function SumberRingkasSpm({ data }: { data: DataSpm }) {
  return (
    <SumberRingkasan
      sumber={data.sumber}
      jumlah={jumlahPerSumberSpm(data.nilai)}
      label={(s) => judulDokumen(s)}
      judul="Sumber data SPM"
      info="Berkas sumber angka capaian SPM, urut menurut banyaknya angka yang dikutip. Klik untuk membuka berkasnya di tab baru."
      warna={WARNA_SPM}
      awal={3}
    />
  );
}
