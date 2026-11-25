"use client";

/**
 * Pieces of the Dukungan PROSN views, on top of viz-laporan: the score split
 * bar (earned / not earned / no evidence yet), kategori and status chips,
 * evidence chips, kelompok cards, the indicator rows, the "documents to
 * upload" list, and the source list closing every PROSN page.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileQuestion } from "lucide-react";
import { InfoTip, Tip } from "@/components/viz";
import { Baris, ChipKategori, ChipSumber, DaftarSumber, Judul, Pisah, SumberRingkasan } from "@/components/viz-laporan";
import type { SumberMakro } from "@/lib/makro";
import type { BuktiProsn, DataProsn, IndikatorProsn, PenilaianProsn } from "@/lib/prosn";
import { PITA_KATEGORI_PROSN, type KategoriProsn } from "@/lib/prosn-hitung";
import {
  fmtPersenProsn,
  fmtPoinProsn,
  fmtSkor,
  INFO_BATAS_BAWAH,
  INFO_STATUS,
  jumlahPerSumberProsn,
  kodeIndikator,
  penilaianDari,
  rincianSkor,
  RUMUS_PROSN,
  warnaProsn,
  type GrupUnggah,
  type KelompokProsn,
  type RincianSkor,
} from "@/lib/prosn-tampil";
import { grupDokumen, hrefSumber, judulDokumen, labelDokumen } from "@/lib/sumber-tampil";
import { cn } from "@/lib/utils";

export const WARNA_PROSN = "var(--viz-prosn)";
/** Assessed but not earned: the same hue, faint. No evidence: hatched neutral, because it is unknown, not lost. */
export const WARNA_HILANG = `color-mix(in oklab, ${WARNA_PROSN} 26%, transparent)`;
export const ISI_TANPA_BUKTI = "repeating-linear-gradient(135deg, color-mix(in oklab, var(--viz-ink) 42%, transparent) 0 2px, transparent 2px 5px)";

export const cariSumberProsn = (data: Pick<DataProsn, "sumber">, id?: string): SumberMakro | undefined => (id ? data.sumber.find((s) => s.id === id) : undefined);

/* -------------------------------------------------------------- Split bar */

type Potong = { key: string; nama: string; nilai: number; isi: string; info: React.ReactNode };

export function potongan(r: RincianSkor): Potong[] {
  return [
    { key: "terbukti", nama: "Terbukti", nilai: r.terbukti, isi: WARNA_PROSN, info: `Poin yang diperoleh dari ${r.dinilai} indikator yang sudah dinilai dengan bukti.` },
    { key: "hilang", nama: "Dinilai, tidak diperoleh", nilai: r.hilang, isi: WARNA_HILANG, info: "Bobot indikator yang sudah dinilai tetapi kriterianya b/c (sebagian atau tidak terpenuhi)." },
    { key: "tanpa", nama: "Belum ada bukti", nilai: r.tanpaBukti, isi: ISI_TANPA_BUKTI, info: `${r.nTanpaBukti} indikator belum punya dokumen bukti. Dihitung 0 sampai dokumennya diunggah; bukan berarti tidak dilaksanakan.` },
  ];
}

/** Earned / assessed but not earned / no evidence yet, as one bar on the 0..maks scale, 2px gaps. */
export function BilahPoin({ r, tinggi = 14, legenda }: { r: RincianSkor; tinggi?: number; legenda?: boolean }) {
  const bagian = potongan(r);
  const ada = bagian.filter((b) => b.nilai > 0);
  return (
    <div>
      <div className="flex w-full gap-0.5" style={{ height: tinggi }} role="img" aria-label={`${fmtSkor(r.terbukti)} dari ${fmtPoinProsn(r.maks)} poin terbukti`}>
        {ada.map((b, i) => (
          <div key={b.key} className="h-full min-w-1" style={{ flex: `${b.nilai} 1 0` }}>
            <Tip
              className="block h-full w-full"
              isi={
                <>
                  <Judul>{b.nama}</Judul>
                  <Baris k="Poin" v={`${fmtSkor(b.nilai)} dari ${fmtPoinProsn(r.maks)}`} />
                  <p className="mt-1 text-muted-foreground">{b.info}</p>
                </>
              }
            >
              <span
                className={cn("block h-full w-full", i === 0 && "rounded-l-[4px]", i === ada.length - 1 && "rounded-r-[4px]", b.key === "tanpa" && "ring-1 ring-inset ring-[color-mix(in_oklab,var(--viz-ink)_35%,transparent)]")}
                style={{ background: b.isi }}
              />
            </Tip>
          </div>
        ))}
      </div>
      {legenda ? <LegendaPoin r={r} /> : null}
    </div>
  );
}

export function LegendaPoin({ r, className }: { r?: RincianSkor; className?: string }) {
  const bagian = r ? potongan(r) : potongan({ terbukti: 0, hilang: 0, tanpaBukti: 0 } as RincianSkor);
  return (
    <ul className={cn("mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground", className)}>
      {bagian.map((b) => (
        <li key={b.key} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-3.5 rounded-[3px]", b.key === "tanpa" && "ring-1 ring-inset ring-[color-mix(in_oklab,var(--viz-ink)_35%,transparent)]")} style={{ background: b.isi }} />
          {b.nama}
          {r ? <span className="font-semibold tabular-nums text-foreground">{fmtSkor(b.nilai)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ Small marks */

export function KategoriProsnChip({ k, kecil }: { k: KategoriProsn | null | undefined; kecil?: boolean }) {
  return (
    <ChipKategori
      label={k}
      warna={warnaProsn(k)}
      kecil={kecil}
      info={
        k ? (
          <>
            <Judul>Kategori capaian: {k}</Judul>
            <p className="text-muted-foreground">{PITA_KATEGORI_PROSN}</p>
            <p className="mt-1 text-muted-foreground">Tabel PROSN tidak mencantumkan pita kategori; dipakai pita evaluasi Permendagri 86/2017.</p>
          </>
        ) : null
      }
    />
  );
}

export function StatusAI({ p }: { p?: PenilaianProsn }) {
  return (
    <Tip isi={<><Judul>{p?.terverifikasi ? "Terverifikasi" : "Belum diverifikasi"}</Judul><p className="text-muted-foreground">{INFO_STATUS}</p></>}>
      <span className="inline-flex h-5 cursor-help items-center whitespace-nowrap rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground">
        {p?.penilai ?? "AI"} · {p?.terverifikasi ? "terverifikasi" : "belum diverifikasi"}
      </span>
    </Tip>
  );
}

/** The criterion met: "a" in the PROSN hue, b/c/d faint, none dashed. */
export function KriteriaChip({ p, ind }: { p?: PenilaianProsn; ind: IndikatorProsn }) {
  const k = p?.kriteria ?? null;
  const kr = ind.kriteria.find((x) => x.kode === k);
  if (!k)
    return (
      <Tip isi={<><Judul>Belum ada bukti</Judul><p className="text-muted-foreground">{p?.alasan ?? "Belum dinilai."}</p></>}>
        <span className="inline-flex h-5 cursor-help items-center whitespace-nowrap rounded-full border border-dashed border-border px-2 text-[10.5px] text-muted-foreground">belum ada bukti</span>
      </Tip>
    );
  return (
    <Tip isi={<><Judul>Kriteria {k} · nilai {fmtSkor(kr?.nilai ?? p?.nilai)}</Judul><p className="text-muted-foreground">{kr?.teks}</p></>}>
      <span
        className="inline-grid size-5 cursor-help place-items-center rounded-full text-[11px] font-semibold uppercase"
        style={k === "a" ? { background: WARNA_PROSN, color: "white" } : { background: WARNA_HILANG, color: "var(--foreground)" }}
      >
        {k}
      </span>
    </Tip>
  );
}

/** One piece of evidence as a chip to its page; the quote on hover. */
export function ChipBukti({ b, data, className }: { b: BuktiProsn; data: Pick<DataProsn, "sumber">; className?: string }) {
  const s = cariSumberProsn(data, b.sumber);
  if (!s) return null;
  return <ChipSumber s={s} halaman={b.halaman} label={labelDokumen(s, b.halaman)} className={className} href={hrefSumber} />;
}

/* ------------------------------------------------------------------ Cards */

const kartu =
  "group relative flex min-w-0 cursor-pointer flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.14)]";

export function HurufKelompok({ kode, kecil }: { kode: string; kecil?: boolean }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-md font-semibold", kecil ? "size-5 text-[10px]" : "size-6 text-xs")} style={{ background: `color-mix(in oklab, ${WARNA_PROSN} 14%, transparent)`, color: WARNA_PROSN }}>
      {kode}
    </span>
  );
}

/** One kelompok: capaian large, skor/maks, kategori, the split bar, then each programme with its own bar. */
export function KartuKelompok({ k, data }: { k: KelompokProsn; data: DataProsn }) {
  const router = useRouter();
  const r = rincianSkor(data, { kelompok: k.id });
  const buka = () => router.push(k.jalur);
  return (
    <div role="link" tabIndex={0} onClick={buka} onKeyDown={(e) => e.key === "Enter" && buka()} className={kartu}>
      <div className="flex items-center gap-1.5">
        <HurufKelompok kode={k.kode} />
        <Link href={k.jalur} onClick={(e) => e.stopPropagation()} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
          {k.nama}
        </Link>
        <span onClick={(e) => e.stopPropagation()}>
          <InfoTip isi={<><Judul>Kelompok {k.kode}. {k.nama}</Judul><p className="text-muted-foreground">{k.program.length} program, {r.jumlah} indikator, bobot {fmtPoinProsn(r.maks)} dari 100 poin.</p><Pisah>{RUMUS_PROSN}</Pisah></>} />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <Tip isi={<><Judul>Capaian kelompok {k.kode}</Judul><Baris k="Skor terbukti" v={`${fmtSkor(r.terbukti)} / ${fmtPoinProsn(r.maks)}`} /><Baris k="Capaian" v={fmtPersenProsn(r.capaian)} /><Baris k="Potensi maks" v={fmtSkor(r.potensi)} /><Pisah>{INFO_BATAS_BAWAH}</Pisah></>}>
            <span className="flex cursor-help items-baseline gap-0.5">
              <span className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">{fmtPersenProsn(r.capaian).replace("%", "")}</span>
              <span className="text-sm font-medium text-muted-foreground">%</span>
            </span>
          </Tip>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{fmtSkor(r.terbukti)}</span> / {fmtPoinProsn(r.maks)} poin
          </p>
        </div>
        <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
          <KategoriProsnChip k={r.kategori} />
          <Tip isi={`${r.dinilai} dari ${r.jumlah} indikator sudah dinilai dengan bukti; ${r.nTanpaBukti} belum ada bukti (${fmtSkor(r.tanpaBukti)} poin).`}>
            <span className="cursor-help text-[11px] tabular-nums text-muted-foreground">
              {r.dinilai}/{r.jumlah} dinilai
            </span>
          </Tip>
        </div>
      </div>
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <BilahPoin r={r} />
      </div>
      <ul className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-2.5" onClick={(e) => e.stopPropagation()}>
        {k.program.map((p) => {
          const rp = rincianSkor(data, { kelompok: k.id, program: p.id });
          return (
            <li key={p.id}>
              <Link href={p.jalur} className="group/p block rounded-lg px-1 py-0.5 hover:bg-muted/60">
                <span className="flex items-baseline gap-2">
                  <Tip isi={<><Judul>Program {k.kode}.{p.kode} {p.nama}</Judul><Baris k="Skor" v={`${fmtSkor(rp.terbukti)} / ${fmtPoinProsn(rp.maks)}`} /><Baris k="Dinilai" v={`${rp.dinilai}/${rp.jumlah}`} /></>} className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-muted-foreground group-hover/p:text-foreground">
                      {p.kode}. {p.nama}
                    </span>
                  </Tip>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums">{fmtPersenProsn(rp.capaian, 0)}</span>
                </span>
                <span className="mt-1 block">
                  <BilahPoin r={rp} tinggi={5} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <ArrowUpRight className="absolute right-3 top-4 size-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: WARNA_PROSN }} />
    </div>
  );
}

/* --------------------------------------------------------- Indicator rows */

/** An indicator as one row: code, text, criterion met, score/bobot, evidence count. */
export function BarisIndikator({ ind, data }: { ind: IndikatorProsn; data: DataProsn }) {
  const p = penilaianDari(data, ind.id);
  const n = p?.nilai;
  return (
    <li>
      <Link href={ind.jalur} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
        <span className="pt-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{kodeIndikator(ind)}</span>
        <Tip isi={<><Judul>{ind.judul}</Judul>{p ? <p className="mt-1 text-muted-foreground">{p.alasan}</p> : null}</>} className="min-w-0">
          <span className="line-clamp-2 text-[13px] leading-5">{ind.judul}</span>
        </Tip>
        <span className="flex items-center gap-2">
          <KriteriaChip p={p} ind={ind} />
          <span className="w-20 text-right text-xs tabular-nums">
            <span className="font-semibold">{p?.kriteria ? fmtSkor(n) : "–"}</span>
            <span className="text-muted-foreground"> / {fmtSkor(ind.bobot)}</span>
          </span>
          <Tip isi={p?.bukti.length ? `${p.bukti.length} kutipan bukti` : "Tanpa kutipan bukti"}>
            <span className={cn("w-7 cursor-help text-right text-[11px] tabular-nums", p?.bukti.length ? "text-foreground" : "text-muted-foreground/60")}>{p?.bukti.length ?? 0}</span>
          </Tip>
        </span>
      </Link>
    </li>
  );
}

/* ------------------------------------------------------ Documents to upload */

/** Indicators without evidence by lead OPD: what to upload and the points at stake. */
export function DaftarUnggah({ grup, kolom = 2 }: { grup: GrupUnggah[]; kolom?: 1 | 2 }) {
  if (!grup.length) return <p className="text-xs text-muted-foreground">Semua indikator di bagian ini sudah punya bukti.</p>;
  return (
    <div className={cn("grid gap-x-6 gap-y-4", kolom === 2 && "xl:grid-cols-2")}>
      {grup.map((g) => (
        <section key={g.opd} className="min-w-0 break-inside-avoid">
          <h3 className="mb-1 flex items-baseline gap-2 border-b border-border/60 pb-1">
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{g.opd}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {g.indikator.length} indikator · <span className="font-semibold tabular-nums text-foreground">+{fmtPoinProsn(g.bobot)}</span> poin
            </span>
          </h3>
          <ul className="flex flex-col">
            {g.indikator.map(({ ind, p }) => (
              <li key={ind.id}>
                <Link href={ind.jalur} className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-2 rounded-lg px-1.5 py-1.5 hover:bg-muted/60">
                  <FileQuestion className="mt-0.5 size-3.5 text-muted-foreground" />
                  <span className="min-w-0">
                    <Tip isi={<><Judul>{kodeIndikator(ind)} {ind.judul}</Judul>{ind.opd.length > 1 ? <p className="mt-1 text-muted-foreground">Bersama: {ind.opd.slice(1).join(", ")}</p> : null}</>} className="block min-w-0">
                      <span className="block truncate text-[12.5px] font-medium">
                        <span className="tabular-nums text-muted-foreground">{kodeIndikator(ind)}</span> {ind.judul}
                      </span>
                    </Tip>
                    {p?.alasan ? (
                      <Tip isi={<><Judul>Yang dibutuhkan</Judul><p className="text-muted-foreground">{p.alasan}</p></>} className="block min-w-0">
                        <span className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">{p.alasan}</span>
                      </Tip>
                    ) : null}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10.5px] font-medium tabular-nums">{fmtPoinProsn(ind.bobot)} poin</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Sources */

/** Every PROSN source document; with `saring`, only those cited for the indicators kept, with their pages. */
export function SumberDataProsn({ data, saring, judul = "Sumber bukti PROSN", className }: { data: DataProsn; saring?: (i: IndikatorProsn) => boolean; judul?: string; className?: string }) {
  const jumlah = jumlahPerSumberProsn(data, saring);
  const daftar = saring ? data.sumber.filter((s) => jumlah.has(s.id)) : data.sumber;
  const ok = new Set(data.indikator.filter((i) => !saring || saring(i)).map((i) => i.id));
  const halaman = (id: string) =>
    [...new Set(data.penilaian.filter((p) => ok.has(p.indikator)).flatMap((p) => p.bukti.filter((b) => b.sumber === id && b.halaman != null).map((b) => b.halaman!)))].sort((a, b) => a - b);
  return (
    <DaftarSumber
      className={className}
      grup={grupDokumen(daftar, jumlah)}
      jumlah={jumlah}
      judul={judul}
      info="Dokumen yang dibaca untuk menilai indikator PROSN. Klik nomor halaman untuk membuka PDF di halaman yang dikutip. Dokumen tanpa kutipan sudah diperiksa tetapi tidak menjadi bukti."
      warna={WARNA_PROSN}
      judulTampil={(s) => judulDokumen(s)}
      halaman={halaman}
      href={hrefSumber}
      satuan="bukti"
      infoJumlah={(n) => `${n} kutipan bukti di halaman ini diambil dari berkas ini.`}
    />
  );
}

export function SumberRingkasProsn({ data }: { data: DataProsn }) {
  return (
    <SumberRingkasan
      sumber={data.sumber}
      jumlah={jumlahPerSumberProsn(data)}
      label={(s) => judulDokumen(s)}
      judul="Sumber bukti PROSN"
      info="Dokumen bukti penilaian PROSN, urut menurut banyaknya kutipan. Klik untuk membuka berkasnya di tab baru."
      warna={WARNA_PROSN}
      satuan="bukti"
    />
  );
}
