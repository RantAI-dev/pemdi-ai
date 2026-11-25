"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { BatangH, Panel, Tip } from "@/components/viz";
import { Badge } from "@/components/ui";
import { Baris, BatangMini, DaftarBatang, Judul, Kepala, Legenda, Segmen } from "@/components/viz-opd";
import { cn, fmtInt, fmtPct } from "@/lib/utils";
import { TEMA, type BarisOpd, type DataOpd } from "./susun";

const BIRU = "var(--viz-makro)";
const RINGKAS = 12;
const STATUS = ["Diverifikasi", "Terkirim", "Draft"];
const nada = (s: string): "good" | "warning" | "neutral" => (s === "Diverifikasi" ? "good" : s === "Draft" ? "warning" : "neutral");
const warnaStatus = (s: string) => (s === "Diverifikasi" ? "var(--status-good)" : s === "Draft" ? "var(--status-warning)" : "var(--viz-ref)");
const rasio = (o: { pertanyaan: number; terjawab: number }) => (o.pertanyaan ? o.terjawab / o.pertanyaan : 0);

type Kunci = "opd" | "jawab" | "berkas" | "status";
const URUT: Record<Kunci, (a: BarisOpd, b: BarisOpd) => number> = {
  opd: (a, b) => a.opd.localeCompare(b.opd),
  jawab: (a, b) => rasio(a) - rasio(b) || a.terjawab - b.terjawab,
  berkas: (a, b) => a.dokumen - b.dokumen,
  status: (a, b) => STATUS.indexOf(b.status) - STATUS.indexOf(a.status),
};

export function OpdTampilan({ data }: { data: DataOpd }) {
  const { opd, tema, jenis } = data;
  const pertanyaan = opd.reduce((s, o) => s + o.pertanyaan, 0);
  const terjawab = opd.reduce((s, o) => s + o.terjawab, 0);
  const berkas = opd.reduce((s, o) => s + o.dokumen, 0);
  const lengkap = opd.filter((o) => o.pertanyaan && o.terjawab === o.pertanyaan).length;
  const kosong = opd.filter((o) => o.terjawab === 0).length;
  const adaBerkas = opd.filter((o) => o.dokumen > 0).length;
  const perStatus = STATUS.map((s) => ({ s, n: opd.filter((o) => o.status === s).length }));
  const statusLain = opd.length - perStatus.reduce((s, x) => s + x.n, 0);

  return (
    <div className="flex flex-col gap-4">
      <Kepala
        judul="Kesiapan OPD"
        info="Kelengkapan jawaban survei kebutuhan Pemdi dan berkas pendukung dari tiap perangkat daerah."
        angka={[
          { nilai: fmtInt(opd.length), label: "OPD mengisi", info: perStatus.map((x) => `${x.n} ${x.s.toLowerCase()}`).join(" · ") },
          { nilai: fmtPct(pertanyaan ? terjawab / pertanyaan : null), label: "pertanyaan terjawab", info: `${fmtInt(terjawab)} dari ${fmtInt(pertanyaan)} pertanyaan` },
          { nilai: fmtInt(berkas), label: "berkas pendukung", info: `${opd.length - adaBerkas} OPD belum menyerahkan berkas` },
          { nilai: fmtInt(lengkap), label: "jawaban lengkap", info: "OPD yang menjawab semua pertanyaan pada formnya" },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel judul="Status pengisian" info={`Sebaran ${opd.length} OPD menurut status form, kelengkapan jawaban, dan berkas pendukung. Arahkan kursor ke tiap bagian.`}>
          <div className="flex flex-col gap-4 pt-1">
            {(
              [
                [
                  "Status form",
                  [
                    ...perStatus.map((x) => ({ nama: x.s, nilai: x.n, warna: warnaStatus(x.s), info: `${x.n} OPD berstatus ${x.s.toLowerCase()}` })),
                    ...(statusLain ? [{ nama: "Lainnya", nilai: statusLain, warna: "var(--viz-grid)" }] : []),
                  ],
                ],
                [
                  "Jawaban",
                  [
                    { nama: "Lengkap", nilai: lengkap, warna: BIRU, info: `${lengkap} OPD menjawab semua pertanyaan` },
                    {
                      nama: "Sebagian",
                      nilai: opd.length - lengkap - kosong,
                      warna: "color-mix(in oklab, var(--viz-makro) 45%, transparent)",
                      info: "Sebagian pertanyaan belum dijawab",
                    },
                    { nama: "Kosong", nilai: kosong, warna: "var(--viz-ref)", info: "Belum ada pertanyaan yang dijawab" },
                  ],
                ],
                [
                  "Berkas",
                  [
                    { nama: "Ada berkas", nilai: adaBerkas, warna: BIRU, info: `${adaBerkas} OPD menyerahkan setidaknya satu berkas` },
                    { nama: "Belum ada", nilai: opd.length - adaBerkas, warna: "var(--viz-ref)", info: `${opd.length - adaBerkas} OPD belum menyerahkan berkas` },
                  ],
                ],
              ] as const
            ).map(([judul, bagian]) => (
              <div key={judul}>
                <p className="mb-1.5 text-xs font-medium">{judul}</p>
                <Segmen bagian={[...bagian]} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel judul="Kelengkapan per tema" info="Persentase pertanyaan terjawab pada tiap tema, gabungan semua OPD. Tema khusus/sektoral hanya ada pada form OPD tertentu.">
          <DaftarBatang
            className="gap-5 pt-2"
            baris={tema.map((t) => ({
              nama: t.label,
              nilai: t.n ? t.ya / t.n : 0,
              teks: fmtPct(t.n ? t.ya / t.n : null),
              info: (
                <>
                  <Judul>{t.label}</Judul>
                  <div className="mt-1 min-w-44">
                    <Baris k="Pertanyaan terjawab" v={`${fmtInt(t.ya)} dari ${fmtInt(t.n)}`} />
                    <Baris k="OPD dengan tema ini" v={fmtInt(t.opd)} />
                  </div>
                </>
              ),
            }))}
          />
        </Panel>

        <Panel judul="Jenis berkas" info="Terbaca: teksnya bisa diambil, lewat lapisan teks atau OCR. Berkas tanpa teks tidak dapat diproses AI.">
          <Legenda
            className="mb-1"
            item={[
              { nama: "Teks terbaca", warna: BIRU },
              { nama: "Tanpa teks", warna: "var(--viz-ref)" },
            ]}
          />
          <BatangH
            data={jenis}
            seri={[
              { key: "terbaca", nama: "Teks terbaca", warna: BIRU },
              { key: "tanpa", nama: "Tanpa teks", warna: "var(--viz-ref)" },
            ]}
            lebarLabel={48}
            tinggiBaris={Math.max(18, Math.min(30, 200 / Math.max(1, jenis.length)))}
            tip={(r) => (
              <>
                <Judul>.{r.nama}</Judul>
                <div className="mt-1 min-w-40">
                  <Baris k="Berkas" v={fmtInt(r.n)} />
                  <Baris k="Teks terbaca" v={fmtInt(r.terbaca)} />
                  <Baris k="Tanpa teks" v={fmtInt(r.tanpa)} />
                </div>
              </>
            )}
          />
        </Panel>
      </div>

      <TabelOpd opd={opd} />
    </div>
  );
}

function TabelOpd({ opd }: { opd: BarisOpd[] }) {
  const [urut, setUrut] = React.useState<{ k: Kunci; turun: boolean }>({ k: "jawab", turun: true });
  const [semua, setSemua] = React.useState(false);
  const rows = [...opd].sort((a, b) => (urut.turun ? -1 : 1) * URUT[urut.k](a, b) || a.opd.localeCompare(b.opd));
  const tampil = semua ? rows : rows.slice(0, RINGKAS);
  const klik = (k: Kunci) => setUrut((u) => ({ k, turun: u.k === k ? !u.turun : k !== "opd" }));

  const kolom = (k: Kunci, isi: React.ReactNode, className?: string) => (
    <th className={cn("px-2 py-2 font-medium", className)}>
      <button type="button" onClick={() => klik(k)} className={cn("inline-flex items-center gap-1 hover:text-foreground", urut.k === k && "text-foreground")}>
        {isi}
        {urut.k === k ? urut.turun ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" /> : null}
      </button>
    </th>
  );

  return (
    <Panel
      judul="Daftar OPD"
      info="Satu baris per OPD. Kolom tema: persentase pertanyaan terjawab pada tema itu; kotak bergaris berarti tema tidak ada pada form OPD tersebut. Klik judul kolom untuk mengurutkan."
      aksi={
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          0%
          <span className="h-2 w-20 rounded-full" style={{ background: `linear-gradient(to right, color-mix(in oklab, ${BIRU} 10%, transparent), ${BIRU})` }} />
          100%
        </div>
      }
      bodyClassName="px-2 pb-2"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <colgroup>
            <col className="w-8" />
            <col />
            <col className="w-44" />
            {TEMA.map((t) => (
              <col key={t.label} className="w-[4.5rem]" />
            ))}
            <col className="w-16" />
            <col className="w-28" />
          </colgroup>
          <thead className="text-left text-[11px] text-muted-foreground">
            <tr className="border-b border-border/70">
              <th className="px-2 py-2 text-right font-medium">#</th>
              {kolom("opd", "OPD")}
              {kolom("jawab", "Terjawab")}
              {TEMA.map((t) => (
                <th key={t.label} className="px-1 py-2 text-center font-medium">
                  <Tip isi={t.label} className="justify-center">
                    <span className="cursor-help">{t.pendek}</span>
                  </Tip>
                </th>
              ))}
              {kolom("berkas", "Berkas", "text-right")}
              {kolom("status", "Status")}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={TEMA.length + 5} className="px-2 py-8 text-center text-xs text-muted-foreground">
                  Belum ada data survei OPD.
                </td>
              </tr>
            ) : null}
            {tampil.map((o, i) => {
              const r = rasio(o);
              return (
                <tr key={o.opd} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                  <td className="px-2 py-1.5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="min-w-0 px-2 py-1.5">
                    <Tip isi={o.opd} className="flex min-w-0">
                      <span className="truncate text-[13px]">{o.opd}</span>
                    </Tip>
                  </td>
                  <td className="px-2 py-1.5">
                    <Tip isi={`${o.terjawab} dari ${o.pertanyaan} pertanyaan terjawab`} className="flex w-full items-center gap-2">
                      <BatangMini nilai={r} />
                      <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums">{fmtPct(o.pertanyaan ? r : null)}</span>
                    </Tip>
                  </td>
                  {o.tema.map((s, ti) => (
                    <td key={ti} className="px-1 py-1">
                      <Tip
                        className="block"
                        isi={
                          <>
                            <Judul>{o.opd}</Judul>
                            <p className="mt-0.5 text-muted-foreground">
                              {TEMA[ti].label}: {s ? `${s.ya} dari ${s.n} pertanyaan terjawab` : "tidak ada pada form ini"}
                            </p>
                          </>
                        }
                      >
                        <Sel s={s} />
                      </Tip>
                    </td>
                  ))}
                  <td className={cn("px-2 py-1.5 text-right text-xs font-medium tabular-nums", !o.dokumen && "text-muted-foreground")}>{o.dokumen ? fmtInt(o.dokumen) : "–"}</td>
                  <td className="px-2 py-1.5">
                    <Badge tone={nada(o.status)}>{o.status || "–"}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > RINGKAS ? (
        <button
          type="button"
          onClick={() => setSemua((v) => !v)}
          className="mx-auto mt-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {semua ? "Ringkas" : `Lihat semua ${rows.length} OPD`}
          <ChevronDown className={cn("size-3.5 transition-transform", semua && "rotate-180")} />
        </button>
      ) : null}
    </Panel>
  );
}

/** One theme cell: deeper blue = more answered; dashed = theme not on this form. */
function Sel({ s }: { s: { n: number; ya: number } | null }) {
  if (!s) return <span className="block h-6 w-full rounded-md border border-dashed border-border" />;
  const p = s.n ? s.ya / s.n : 0;
  return (
    <span
      className="grid h-6 w-full place-items-center rounded-md text-[11px] font-medium tabular-nums transition-transform hover:scale-[1.06]"
      style={{ background: `color-mix(in oklab, ${BIRU} ${10 + p * 90}%, transparent)`, color: p > 0.55 ? "white" : undefined }}
    >
      {Math.round(p * 100)}
    </span>
  );
}
