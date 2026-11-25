"use client";

/**
 * /dashboard-pemdi/prosn/<kelompok>[/<program>] and
 * /dashboard-pemdi/prosn/<kelompok>/<program>/<indikator>: the score rollup
 * of a kelompok or programme, and one indicator's assessment — the criteria
 * with the one met highlighted, the reasoning, every piece of evidence with
 * its quote and page, the legal basis and the OPD.
 */
import * as React from "react";
import Link from "next/link";
import { ExternalLink, FileQuestion, FileText, Upload } from "lucide-react";
import { InfoTip, Panel, Tip } from "@/components/viz";
import { Judul, KepalaDasbor } from "@/components/viz-laporan";
import { RincianPanel, SkorBesar, VERIFIKASI_PROSN } from "@/components/prosn-halaman";
import {
  BarisIndikator,
  BilahPoin,
  cariSumberProsn,
  DaftarUnggah,
  KategoriProsnChip,
  StatusAI,
  SumberDataProsn,
  WARNA_HILANG,
  WARNA_PROSN,
} from "@/components/viz-prosn";
import type { DataProsn, IndikatorProsn } from "@/lib/prosn";
import { fmtPersenProsn, fmtPoinProsn, fmtSkor, INFO_BATAS_BAWAH, kodeIndikator, penilaianDari, perluUnggah, pohon, rincianSkor, RUMUS_PROSN } from "@/lib/prosn-tampil";
import { hrefSumber, labelDokumen } from "@/lib/sumber-tampil";
import { cn } from "@/lib/utils";

const tombolUnggah = "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80";

function OpdChips({ opd }: { opd: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opd.map((o) => (
        <span key={o} className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px]">
          {o}
        </span>
      ))}
    </div>
  );
}

/* ---------------------------------------------------- Kelompok / program */

export function ProsnLingkup({ data, kelompok, program }: { data: DataProsn; kelompok: string; program?: string }) {
  const k = pohon(data).find((x) => x.id === kelompok)!;
  const p = program ? k.program.find((x) => x.id === program) : undefined;
  const saring = { kelompok, program };
  const r = rincianSkor(data, saring);
  const daftarProgram = p ? [p] : k.program;
  const opd = [...new Set(daftarProgram.flatMap((x) => x.indikator.flatMap((i) => i.opd)))];
  const unggah = perluUnggah(data, saring);
  const dalam = (i: IndikatorProsn) => i.kelompok === kelompok && (!program || i.program === program);

  return (
    <div className="flex flex-col gap-4">
      <KepalaDasbor
        judul={p ? `Program ${k.kode}.${p.kode}` : `${k.kode}. ${k.nama}`}
        info={<><p className="text-muted-foreground">{p ? p.nama : `${k.program.length} program, ${r.jumlah} indikator.`}</p><p className="mt-1 border-t border-border pt-1 text-muted-foreground">{RUMUS_PROSN}</p></>}
        sub={p ? `${k.kode}. ${k.nama}` : "Dukungan PROSN · kelompok program"}
        jejak={[
          { href: "/dashboard-pemdi/prosn", label: "Dukungan PROSN" },
          { href: k.jalur, label: `${k.kode}. ${k.nama}` },
          ...(p ? [{ href: p.jalur, label: `${p.kode}. ${p.nama}` }] : []),
        ]}
        warna={WARNA_PROSN}
        verifikasi={VERIFIKASI_PROSN}
        angka={[
          { nilai: `${fmtSkor(r.terbukti)}/${fmtPoinProsn(r.maks)}`, label: "skor", info: INFO_BATAS_BAWAH },
          { nilai: fmtPersenProsn(r.capaian), label: "capaian" },
          { nilai: <KategoriProsnChip k={r.kategori} />, label: "kategori" },
          { nilai: `${r.dinilai}/${r.jumlah}`, label: "dinilai" },
        ]}
      />
      {p ? <p className="-mt-1 px-1 text-sm font-medium">{p.nama}</p> : null}

      <Panel judul="Skor" info={<><p className="text-muted-foreground">{RUMUS_PROSN}</p><p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_BATAS_BAWAH}</p></>} aksi={<StatusAI />}>
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <SkorBesar r={r} ukuran="sedang" />
          <RincianPanel r={r} />
        </div>
      </Panel>

      <div className={cn("flex flex-col gap-3", daftarProgram.length > 1 && "xl:block xl:columns-2 xl:gap-3 xl:[&>*]:mb-3 xl:[&>*]:break-inside-avoid")}>
        {daftarProgram.map((pr) => {
          const rp = rincianSkor(data, { kelompok, program: pr.id });
          return (
            <Panel
              key={pr.id}
              judul={
                p ? (
                  "Indikator"
                ) : (
                  <Link href={pr.jalur} className="hover:underline">
                    {k.kode}.{pr.kode} {pr.nama}
                  </Link>
                )
              }
              info={`${rp.jumlah} indikator · bobot ${fmtPoinProsn(rp.maks)} poin. Kolom kanan: kriteria terpenuhi, nilai / bobot, jumlah kutipan bukti.`}
              aksi={
                <span className="flex items-center gap-2 text-xs">
                  <span className="font-semibold tabular-nums">
                    {fmtSkor(rp.terbukti)}
                    <span className="font-normal text-muted-foreground">/{fmtPoinProsn(rp.maks)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{fmtPersenProsn(rp.capaian, 0)}</span>
                </span>
              }
            >
              <BilahPoin r={rp} tinggi={8} />
              <ul className="-mx-2 mt-2 flex flex-col">
                {pr.indikator.map((i) => (
                  <BarisIndikator key={i.id} ind={i} data={data} />
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>

      <Panel
        judul={
          <span className="flex items-center gap-2">
            Dokumen yang perlu diunggah
            <span className="rounded-full bg-muted px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground">
              {r.nTanpaBukti} indikator · {fmtPoinProsn(r.tanpaBukti)} poin
            </span>
          </span>
        }
        info="Indikator di bagian ini yang belum punya bukti, menurut OPD utamanya, dengan dokumen yang dibutuhkan."
        aksi={
          <Link href="/dokumen" className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium hover:bg-muted" style={{ color: WARNA_PROSN }}>
            Unggah dokumen
          </Link>
        }
      >
        <DaftarUnggah grup={unggah} kolom={unggah.length > 1 ? 2 : 1} />
        <div className="mt-4 border-t border-border/60 pt-2.5">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            OPD terlibat
            <InfoTip isi="Dari pemetaan kerangka PROSN Pemdi-AI, bukan penetapan resmi." />
          </p>
          <OpdChips opd={opd} />
        </div>
      </Panel>

      <SumberDataProsn data={data} saring={dalam} judul={`Sumber bukti · ${p ? `Program ${k.kode}.${p.kode}` : `Kelompok ${k.kode}`}`} />
    </div>
  );
}

/* --------------------------------------------------------------- Indikator */

export function ProsnIndikatorDetail({ data, indikatorId }: { data: DataProsn; indikatorId: string }) {
  const ind = data.indikator.find((i) => i.id === indikatorId)!;
  const p = penilaianDari(data, ind.id);
  const k = pohon(data).find((x) => x.id === ind.kelompok)!;
  const pr = k.program.find((x) => x.id === ind.program)!;
  const terbukti = !!p?.kriteria;
  const capaian = terbukti && ind.bobot ? ((p?.nilai ?? 0) / ind.bobot) * 100 : null;
  const unik = (p?.bukti ?? []).length;
  const adaSumber = (p?.bukti ?? []).some((b) => cariSumberProsn(data, b.sumber));

  return (
    <div className="flex flex-col gap-4">
      <KepalaDasbor
        judul={`Indikator ${kodeIndikator(ind)}`}
        info={<p className="text-muted-foreground">{RUMUS_PROSN}</p>}
        sub={`${k.kode}. ${k.nama} · Program ${pr.kode}. ${pr.nama}`}
        jejak={[
          { href: "/dashboard-pemdi/prosn", label: "Dukungan PROSN" },
          { href: k.jalur, label: `${k.kode}. ${k.nama}` },
          { href: pr.jalur, label: `${pr.kode}. ${pr.nama}` },
          { href: ind.jalur, label: `Indikator ${kodeIndikator(ind)}` },
        ]}
        warna={WARNA_PROSN}
        verifikasi={VERIFIKASI_PROSN}
        angka={[
          { nilai: terbukti ? `${fmtSkor(p?.nilai)}/${fmtSkor(ind.bobot)}` : `–/${fmtSkor(ind.bobot)}`, label: "nilai / bobot" },
          { nilai: capaian == null ? "–" : fmtPersenProsn(capaian, 0), label: "capaian" },
          {
            nilai: terbukti ? <span className="uppercase">{p?.kriteria}</span> : "–",
            label: "kriteria",
            info: terbukti ? ind.kriteria.find((x) => x.kode === p?.kriteria)?.teks : "Belum ada bukti; belum dapat dinilai.",
          },
        ]}
      />

      <Panel judul="Indikator" aksi={<StatusAI p={p} />}>
        <p className="max-w-4xl text-[15px] leading-7">{ind.judul}</p>
        <div className="mt-3 grid gap-4 border-t border-border/60 pt-3 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              OPD penanggung jawab
              <InfoTip isi="Dari pemetaan kerangka PROSN Pemdi-AI, bukan penetapan resmi." />
            </p>
            <OpdChips opd={ind.opd} />
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Dasar hukum</p>
            <p className="text-[12.5px] leading-5 text-muted-foreground">{ind.dasarHukum}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-7" judul="Kriteria penilaian" info="Kriteria a/b/c(/d) menurut tabel indikator kinerja PROSN, dengan nilainya. Kriteria a bernilai bobot penuh. Yang terpenuhi ditandai.">
          <ol className="flex flex-col gap-1.5">
            {ind.kriteria.map((kr) => {
              const pilih = p?.kriteria === kr.kode;
              return (
                <li
                  key={kr.kode}
                  className={cn("grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border px-3 py-2.5", pilih ? "border-transparent" : "border-border/60")}
                  style={pilih ? { background: `color-mix(in oklab, ${WARNA_PROSN} 10%, transparent)`, boxShadow: `inset 0 0 0 1.5px ${WARNA_PROSN}` } : undefined}
                >
                  <span
                    className="grid size-6 place-items-center rounded-full text-xs font-semibold uppercase"
                    style={pilih ? { background: WARNA_PROSN, color: "white" } : { background: WARNA_HILANG }}
                  >
                    {kr.kode}
                  </span>
                  <span className={cn("text-[13px] leading-5", !pilih && "text-muted-foreground")}>{kr.teks}</span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{fmtSkor(kr.nilai)}</span>
                    {pilih ? (
                      <span className="rounded-full px-1.5 text-[10px] font-medium" style={{ background: WARNA_PROSN, color: "white" }}>
                        terpenuhi
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
          {!terbukti ? <p className="mt-2 text-xs text-muted-foreground">Belum ada kriteria yang dapat dipilih karena buktinya belum tersedia.</p> : null}
          {ind.kriteria[0] && ind.kriteria[0].nilai > ind.bobot ? (
            <p className="mt-2 text-[11px] text-muted-foreground">Catatan sumber: nilai kriteria a ({fmtSkor(ind.kriteria[0].nilai)}) lebih besar daripada bobot indikator ({fmtSkor(ind.bobot)}); dibiarkan sesuai tabel sumber.</p>
          ) : null}
        </Panel>

        {terbukti ? (
          <Panel className="lg:col-span-5" judul="Alasan penilaian" info="Ringkasan AI atas bukti yang dibaca. Periksa kutipan di bawah sebelum dipakai.">
            <p className="text-[13px] leading-6">{p?.alasan}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
              <StatusAI p={p} />
              <span>
                {unik} kutipan bukti · tahun penilaian {p?.tahun}
              </span>
            </div>
          </Panel>
        ) : (
          <Panel className="lg:col-span-5" judul="Belum ada bukti" info={INFO_BATAS_BAWAH}>
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-3.5">
              <div className="flex items-start gap-2">
                <FileQuestion className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <Judul>Yang perlu diunggah</Judul>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{p?.alasan ?? "Dokumen yang menunjukkan pemenuhan kriteria a."}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Poin dipertaruhkan: <span className="font-semibold tabular-nums text-foreground">{fmtSkor(ind.bobot)}</span> · OPD: {ind.opd.join(", ")}
              </p>
              <Link href="/dokumen" className={cn(tombolUnggah, "self-start")}>
                <Upload className="size-3.5" /> Unggah dokumen
              </Link>
            </div>
          </Panel>
        )}
      </div>

      <Panel
        judul={terbukti ? "Bukti" : "Bukti yang ditemukan (belum cukup)"}
        info="Setiap kutipan yang dibaca untuk menilai indikator ini. Buka hlm. N membuka berkasnya tepat di halaman itu."
      >
        {p?.bukti.length ? (
          <ul className="grid gap-2 lg:grid-cols-2">
            {p.bukti.map((b, i) => {
              const s = cariSumberProsn(data, b.sumber);
              return (
                <li key={i} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border/60 p-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <Tip isi={s ? <><Judul>{s.judul}</Judul><p className="text-muted-foreground">{s.penerbit}</p></> : b.sumber} className="block min-w-0">
                        <p className="truncate text-[13px] font-medium">{s ? labelDokumen(s) : b.sumber}</p>
                      </Tip>
                      <p className="text-[11px] text-muted-foreground">{b.lokasi}</p>
                    </div>
                    {s ? (
                      <a
                        href={hrefSumber(s, b.halaman)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-medium hover:bg-muted"
                      >
                        {hrefSumber(s, b.halaman).includes("#page=") ? `Buka hlm. ${b.halaman}` : b.halaman != null ? `Buka · hlm. ${b.halaman}` : "Buka"} <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                  {b.kutipan ? <p className="rounded-lg bg-muted/60 px-2.5 py-1.5 font-mono text-[11px] leading-5 text-foreground/80">“{b.kutipan}”</p> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Belum ada kutipan dari dokumen yang tersedia.</p>
        )}
      </Panel>

      {adaSumber ? (
        <SumberDataProsn data={data} saring={(i) => i.id === ind.id} judul={`Sumber bukti · Indikator ${kodeIndikator(ind)}`} />
      ) : (
        <SumberDataProsn data={data} judul="Dokumen yang sudah diperiksa" />
      )}
    </div>
  );
}
