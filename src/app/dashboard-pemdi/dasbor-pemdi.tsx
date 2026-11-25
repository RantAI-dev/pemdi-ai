"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BriefcaseBusiness, Flag, Gauge as GaugeIcon, GraduationCap, HandCoins, Scale, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { BatangH, InfoTip, Laba, Meter, Panel, PetaPanas, Tip } from "@/components/viz";
import { Sementara } from "@/components/viz-indeks";
import { nilaiTampil } from "@/lib/nilai-tampil";
import type { DasborPemdiData } from "@/lib/dasbor-pemdi";
import type { DataMakro } from "@/lib/makro";
import { fmtLaju, fmtNilai, fmtPersen, ringkas, warnaKategori } from "@/lib/makro-tampil";
import { SumberRingkas } from "@/components/viz-makro";
import { SumberRingkasSpm } from "@/components/viz-spm";
import { ISI_TANPA_BUKTI, SumberRingkasProsn, WARNA_HILANG } from "@/components/viz-prosn";
import type { DataSpm } from "@/lib/spm";
import type { DataProsn } from "@/lib/prosn";
import { daftarBidang, fmtSpm, INFO_KATEGORI_SPM, NAMA_BIDANG_PENDEK, ringkasBidang, ringkasKab, warnaSpm } from "@/lib/spm-tampil";
import { fmtPoinProsn, fmtSkor, INFO_BATAS_BAWAH, pohon, rincianSkor } from "@/lib/prosn-tampil";
import { labelDokumen } from "@/lib/sumber-tampil";
import { fmtDec, fmtInt, fmtPct } from "@/lib/utils";

const IKON = { makro: TrendingUp, spm: ShieldCheck, prosn: Flag, pemdi: GaugeIcon } as const;
/** One fixed colour per framework, the same on every card and chart of this page. */
const WARNA: Record<string, string> = { makro: "var(--viz-makro)", spm: "var(--viz-spm)", prosn: "var(--viz-prosn)", pemdi: "var(--viz-pemdi)" };
const PENDEK: Record<string, string> = { makro: "Makro", spm: "SPM", prosn: "PROSN", pemdi: "Pemdi" };
const NAMA_KARTU: Record<string, string> = { makro: "Kinerja Makro", spm: "Capaian SPM", prosn: "Dukungan PROSN", pemdi: "Indeks Pemdi" };
const NAMA_TILE: Record<string, string> = {
  pertumbuhan_ekonomi: "Pertumbuhan Ekonomi",
  tpt: "Pengangguran (TPT)",
  kemiskinan: "Angka Kemiskinan",
  ipm: "IPM",
  gini: "Gini Ratio",
  pdrb_per_kapita: "PDRB per Kapita",
};
/** Short kelompok names for the bar labels; the full name is in the tooltip. */
const PROSN_PENDEK: Record<string, string> = { A: "Kemiskinan", B: "Ketahanan Pangan", C: "Kesehatan", D: "Pendidikan", E: "Ekonomi" };
const IKON_MAKRO = [TrendingUp, BriefcaseBusiness, HandCoins, GraduationCap, Scale, Wallet];

const href = (slug: string, ...jalur: string[]) => ["/dashboard-pemdi", slug, ...jalur].join("/");
const tanpaKurung = (s: string) => s.replace(/\s*\(.*\)$/, "");

const Judul = ({ children }: { children: React.ReactNode }) => <p className="font-medium text-foreground">{children}</p>;
const Baris = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <p className="flex justify-between gap-4">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium tabular-nums">{v}</span>
  </p>
);
const Telusur = ({ href: h, warna }: { href: string; warna: string }) => (
  <Link href={h} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium hover:bg-muted" style={{ color: warna }}>
    Telusuri <ArrowUpRight className="size-3.5" />
  </Link>
);

export function DasborPemdi({ data, makro, spm, prosn }: { data: DasborPemdiData; makro: DataMakro; spm: DataSpm; prosn: DataProsn | null }) {
  const router = useRouter();
  const kabSpm = ringkasKab(spm, spm.tahunUtama);
  // Null while PROSN is hidden (src/lib/fitur.ts).
  const skorProsn = prosn ? rincianSkor(prosn) : null;
  const bidangSpm = daftarBidang(spm).map((b) => {
    const r = ringkasBidang(spm, b.id, spm.tahunUtama);
    return {
      id: b.id,
      nama: `${NAMA_BIDANG_PENDEK[b.id] ?? b.nama} · ${fmtSpm(r.capaian, 1)}`,
      judul: b.nama,
      b,
      r,
      capaian: r.capaian ?? 0,
      sisa: Math.max(0, 100 - (r.capaian ?? 0)),
    };
  });
  const kelompokProsn = (prosn ? pohon(prosn) : []).map((k) => {
    const r = rincianSkor(prosn!, { kelompok: k.id });
    const pct = (v: number) => (r.maks ? (v / r.maks) * 100 : 0);
    return {
      id: k.id,
      nama: `${k.kode}. ${PROSN_PENDEK[k.kode] ?? k.nama} · ${fmtPersen(r.capaian, 1)}`,
      judul: `${k.kode}. ${k.nama}`,
      k,
      r,
      terbukti: pct(r.terbukti),
      hilang: pct(r.hilang),
      tanpa: pct(r.tanpaBukti),
    };
  });
  // Until every indicator is scored the index is provisional: shown, but marked as such.
  const indeks = nilaiTampil(data.pemdi.indeks, data.pemdi.indeksSementara);
  const namaPredikat = data.pemdi.predikat ?? data.pemdi.predikatSementara;
  const lencana = indeks.tentatif ? <Sementara terisi={data.pemdi.terisi} jumlah={data.pemdi.jumlah} /> : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header: title and three numbers, nothing else */}
      <header className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <p className="text-xs text-muted-foreground">Kab. Tulang Bawang Barat</p>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">Dashboard Pemdi</h1>
            <InfoTip isi="Empat kerangka kinerja daerah dalam satu layar. Klik kartu, batang, atau ikon mana pun untuk menelusuri tingkat demi tingkat." />
          </div>
        </div>
        <dl className="flex gap-6 sm:gap-8">
          {(
            [
              [data.kerangka.length, "kerangka"],
              [data.totalIndikator, "indikator"],
              [data.jumlahOpd, "OPD terlibat"],
            ] as const
          ).map(([n, l]) => (
            <div key={l} className="text-right">
              <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{fmtInt(n)}</dd>
              <dt className="text-[11px] text-muted-foreground">{l}</dt>
            </div>
          ))}
        </dl>
      </header>

      {/* One card per framework */}
      <div className={cn("grid gap-3 sm:grid-cols-2", data.kerangka.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        {data.kerangka.map((k) => {
          const Ikon = IKON[k.slug as keyof typeof IKON] ?? GaugeIcon;
          const warna = WARNA[k.slug];
          const pemdi = k.slug === "pemdi" && indeks.nilai != null;
          return (
            <Link
              key={k.slug}
              href={href(k.slug)}
              className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.14)]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-25"
                style={{ background: warna }}
              />
              <div className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${warna} 14%, transparent)`, color: warna }}>
                  <Ikon className="size-4" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{NAMA_KARTU[k.slug] ?? k.judul}</p>
                <span onClick={(e) => e.preventDefault()}>
                  <InfoTip
                    isi={
                      <>
                        <Judul>{k.judul}</Judul>
                        <p className="text-muted-foreground">{k.dasar.replace(/\s+—\s+sumber:.*$/, "")}</p>
                        <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{k.deskripsi.split(/(?<=\.)\s/)[0]}</p>
                      </>
                    }
                  />
                </span>
              </div>
              <div className="mt-4 flex min-w-0 items-baseline gap-1.5">
                {k.slug === "spm" && kabSpm.capaian != null ? (
                  <>
                    <p className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">{fmtSpm(kabSpm.capaian)}</p>
                    <p className="truncate text-xs text-muted-foreground">indeks {spm.tahunUtama}</p>
                  </>
                ) : k.slug === "prosn" && skorProsn ? (
                  <>
                    <p className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">
                      {fmtPoinProsn(skorProsn.terbukti)}
                      <span className="text-lg font-medium text-muted-foreground">/{fmtPoinProsn(skorProsn.maks)}</span>
                    </p>
                    <span className="ml-auto self-center" onClick={(e) => e.preventDefault()}>
                      <Tip
                        isi={
                          <>
                            <Judul>Batas bawah</Judul>
                            <p className="text-muted-foreground">{INFO_BATAS_BAWAH}</p>
                          </>
                        }
                      >
                        <span className="inline-flex h-5 cursor-help items-center whitespace-nowrap rounded-full bg-muted px-2 text-[10px] font-medium tabular-nums text-muted-foreground">
                          +{fmtPoinProsn(skorProsn.tanpaBukti)} belum ada bukti
                        </span>
                      </Tip>
                    </span>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">{pemdi ? fmtDec(indeks.nilai) : fmtInt(k.indikator)}</p>
                    <p className="text-xs text-muted-foreground">{pemdi ? namaPredikat : k.satuan}</p>
                    {pemdi && lencana ? (
                      <span className="ml-auto self-center" onClick={(e) => e.preventDefault()}>
                        {lencana}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
              <div className="mt-4 flex items-end gap-1 pr-5">
                {k.tingkat.map((t, i) => (
                  <Tip key={t.nama} isi={`Tingkat ${i + 1}: ${fmtInt(t.jumlah)} ${t.nama}`} className="min-w-0 flex-1">
                    <span className="flex w-full min-w-0 flex-col gap-1">
                      <span className="h-1.5 w-full rounded-full" style={{ background: warna, opacity: 0.3 + (0.7 * (i + 1)) / k.tingkat.length }} />
                      <span className="text-xs font-semibold tabular-nums">{fmtInt(t.jumlah)}</span>
                    </span>
                  </Tip>
                ))}
              </div>
              <ArrowUpRight className="absolute bottom-4 right-3 size-4 opacity-0 transition-all group-hover:opacity-100" style={{ color: warna }} />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* SPM */}
        <Panel
          className="lg:col-span-7"
          judul={`Capaian SPM ${spm.tahunUtama}`}
          info={`Indeks capaian SPM per bidang ${spm.tahunUtama} terhadap target 100% (abu-abu: sisa menuju target). Angka dari tabel SPM RKPD 2027 (spm.bangda.kemendagri.go.id), belum dicocokkan dengan e-SPM. Klik batang untuk menelusuri.`}
          aksi={<Telusur href={href("spm")} warna={WARNA.spm} />}
        >
          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: WARNA.spm }} /> Capaian Kab.
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-[var(--viz-ref)]" /> Sisa menuju target 100%
            </span>
            <Tip
              isi={
                <>
                  <Judul>Indeks SPM Kabupaten {spm.tahunUtama}</Judul>
                  <Baris k="Indeks" v={fmtSpm(kabSpm.capaian)} />
                  <Baris k="Kategori" v={kabSpm.kategori ?? "–"} />
                  {kabSpm.labelSumber ? <Baris k="Menurut sumber" v={kabSpm.labelSumber} /> : null}
                  <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_KATEGORI_SPM}</p>
                </>
              }
              className="ml-auto"
            >
              <span className="cursor-help">
                Kabupaten <span className="font-semibold tabular-nums text-foreground">{fmtSpm(kabSpm.capaian)}</span>
              </span>
            </Tip>
          </div>
          <BatangH
            data={bidangSpm}
            seri={[
              { key: "capaian", nama: "Capaian", warna: WARNA.spm },
              { key: "sisa", nama: "Sisa menuju 100%", warna: "var(--viz-ref)" },
            ]}
            domain={[0, 100]}
            lebarLabel={230}
            tinggiBaris={44}
            onPilih={(r) => router.push(r.b.jalur)}
            tip={(row) => {
              const n = row.r.baris[0];
              const s = n ? spm.sumber.find((x) => x.id === n.sumber) : undefined;
              return (
                <>
                  <Judul>SPM {row.judul}</Judul>
                  <div className="mt-1 min-w-48">
                    <Baris k={`Indeks ${spm.tahunUtama}`} v={fmtSpm(row.r.capaian)} />
                    <Baris k={`Tahun ${spm.tahunUtama - 1}`} v={fmtSpm(row.r.lalu)} />
                    <Baris k="Laju" v={fmtLaju(row.r.laju)} />
                    <Baris
                      k="Kategori"
                      v={
                        <span className="inline-flex items-center gap-1">
                          <span className="size-1.5 rounded-full" style={{ background: warnaSpm(row.r.kategori) }} />
                          {row.r.kategori ?? "–"}
                        </span>
                      }
                    />
                    <Baris k="Layanan <100%" v={`${row.r.dibawah.length}/${row.b.layanan.length}`} />
                  </div>
                  {s && n ? <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{labelDokumen(s, n.halaman)}</p> : null}
                </>
              );
            }}
          />
          <SumberRingkasSpm data={spm} />
        </Panel>

        {/* Indeks Pemdi */}
        <Panel
          className="lg:col-span-5"
          judul="Indeks Pemdi"
          info={`Permen PANRB 8/2026, skala 1–5. ${data.pemdi.terisi} dari ${data.pemdi.jumlah} indikator sudah dinilai.`}
          aksi={<Telusur href={href("pemdi")} warna={WARNA.pemdi} />}
        >
          <div className="grid items-center sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div>
              <Meter nilai={indeks.nilai} warna={WARNA.pemdi} label={namaPredikat ?? "belum dinilai"} ukuran={180} />
              {lencana ? <div className="mt-1.5 flex justify-center">{lencana}</div> : null}
            </div>
            <Laba
              data={data.pemdi.aspek.map((a) => ({
                nama: a.nama
                  .replace(/ Layanan Digital Pemerintah$/, "")
                  .replace(/ Pemdi$/, "")
                  .replace(/ dan Manajemen$/, ""),
                nilai: a.indeks ?? (a as { sementara?: number | null }).sementara ?? null,
              }))}
              warna={WARNA.pemdi}
              tinggi={250}
              tip={(r) => {
                const a = data.pemdi.aspek.find((x) => x.nama.startsWith(r.nama));
                return (
                  <>
                    <Judul>{a?.nama ?? r.nama}</Judul>
                    <div className="mt-1 min-w-40">
                      <Baris k="Indeks" v={r.nilai == null ? "belum dinilai" : fmtDec(r.nilai)} />
                      {a ? <Baris k="Bobot" v={fmtPct(a.bobot)} /> : null}
                    </div>
                  </>
                );
              }}
            />
          </div>
        </Panel>

        {/* PROSN (hidden while TAMPIL_PROSN is off) */}
        {prosn && skorProsn ? (
          <Panel
            className="lg:col-span-7"
            judul={`Dukungan PROSN ${prosn.tahunUtama}`}
            info={`Capaian tiap kelompok program terhadap bobotnya (100% = bobot kelompok). Arsir: indikator yang belum punya bukti, dihitung 0 sampai dokumennya diunggah. Dinilai AI, belum diverifikasi. Klik batang untuk melihat programnya.`}
            aksi={<Telusur href={href("prosn")} warna={WARNA.prosn} />}
          >
            <svg width="0" height="0" className="absolute" aria-hidden>
              <defs>
                <pattern id="pola-tanpa-bukti" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="5" height="5" fill="var(--card)" />
                  <line x1="0" y1="0" x2="0" y2="5" stroke="var(--viz-ink)" strokeOpacity={0.45} strokeWidth={2} />
                </pattern>
              </defs>
            </svg>
            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: WARNA.prosn }} /> Terbukti
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: WARNA_HILANG }} /> Dinilai, tidak diperoleh
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm ring-1 ring-inset ring-[color-mix(in_oklab,var(--viz-ink)_35%,transparent)]" style={{ background: ISI_TANPA_BUKTI }} /> Belum ada
                bukti
              </span>
              <Tip
                isi={
                  <>
                    <Judul>Skor total (batas bawah)</Judul>
                    <Baris k="Terbukti" v={`${fmtSkor(skorProsn.terbukti)} / 100`} />
                    <Baris k="Belum ada bukti" v={`${fmtSkor(skorProsn.tanpaBukti)} poin`} />
                    <Baris k="Potensi maks" v={fmtSkor(skorProsn.potensi)} />
                    <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_BATAS_BAWAH}</p>
                  </>
                }
                className="ml-auto"
              >
                <span className="cursor-help">
                  Total <span className="font-semibold tabular-nums text-foreground">{fmtPoinProsn(skorProsn.terbukti)}/100</span>
                </span>
              </Tip>
            </div>
            <BatangH
              data={kelompokProsn}
              seri={[
                { key: "terbukti", nama: "Terbukti", warna: WARNA.prosn },
                { key: "hilang", nama: "Dinilai, tidak diperoleh", warna: WARNA_HILANG },
                { key: "tanpa", nama: "Belum ada bukti", warna: "url(#pola-tanpa-bukti)" },
              ]}
              domain={[0, 100]}
              lebarLabel={230}
              tinggiBaris={44}
              onPilih={(r) => router.push(r.k.jalur)}
              tip={(row) => (
                <>
                  <Judul>{row.judul}</Judul>
                  <div className="mt-1 min-w-52">
                    <Baris k="Skor terbukti" v={`${fmtSkor(row.r.terbukti)} / ${fmtPoinProsn(row.r.maks)}`} />
                    <Baris k="Capaian" v={fmtPersen(row.r.capaian, 2)} />
                    <Baris k="Kategori" v={row.r.kategori} />
                    <Baris k="Belum ada bukti" v={`${fmtSkor(row.r.tanpaBukti)} poin (${row.r.nTanpaBukti} indikator)`} />
                    <Baris k="Dinilai" v={`${row.r.dinilai}/${row.r.jumlah}`} />
                  </div>
                </>
              )}
            />
            <SumberRingkasProsn data={prosn} />
          </Panel>
        ) : null}

        {/* Makro: takes the whole row when PROSN is hidden */}
        <Panel
          className={prosn ? "lg:col-span-5" : "lg:col-span-12"}
          judul={`Kinerja Makro ${makro.tahunUtama}`}
          info={`Enam indikator makro LPPD: realisasi ${makro.tahunUtama} dan capaiannya terhadap target RPJMD 2025–2029. Angka dari BPS dan RPJMD, belum diverifikasi manual. Klik kotak untuk menelusuri.`}
          aksi={<Telusur href={href("makro")} warna={WARNA.makro} />}
        >
          <div className={cn("grid auto-rows-fr grid-cols-2 gap-2", !prosn && "lg:grid-cols-3")}>
            {data.makro.map((m, i) => {
              const Ikon = IKON_MAKRO[i % IKON_MAKRO.length];
              const ind = makro.indikator.find((x) => x.jalur === href("makro", m.id));
              const r = ind ? ringkas(makro, ind, makro.tahunUtama) : null;
              return (
                <Tip
                  key={m.id}
                  className="block"
                  isi={
                    <>
                      <Judul>{ind?.namaLppd ?? m.judul}</Judul>
                      <p className="mt-1 text-muted-foreground">{m.ringkas}</p>
                      {r ? (
                        <div className="mt-1.5 min-w-48 border-t border-border pt-1.5">
                          <Baris k={`Realisasi ${r.realisasi?.tahun ?? ""}`} v={fmtNilai(r.realisasi?.nilai, r.realisasi?.satuan ?? "", r.ind.slug)} />
                          <Baris k={`Target ${makro.tahunUtama}`} v={fmtNilai(r.target?.nilai, r.target?.satuan ?? "", r.ind.slug)} />
                          <Baris k="Laju" v={fmtLaju(r.laju)} />
                          <Baris k="Capaian" v={r.capaian != null ? `${fmtPersen(r.capaian)} · ${r.kategori}` : `menunggu realisasi ${makro.tahunUtama}`} />
                        </div>
                      ) : null}
                    </>
                  }
                >
                  <Link
                    href={href("makro", m.id)}
                    className="group flex h-full w-full min-w-0 flex-col gap-1.5 rounded-xl border border-border/70 p-2.5 transition-colors hover:border-transparent hover:bg-muted/60"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="grid size-6 shrink-0 place-items-center rounded-md"
                        style={{ background: `color-mix(in oklab, ${WARNA.makro} 12%, transparent)`, color: WARNA.makro }}
                      >
                        <Ikon className="size-3.5" />
                      </span>
                      <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{r ? NAMA_TILE[r.ind.slug] : tanpaKurung(m.judul)}</span>
                    </span>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-lg font-semibold tabular-nums tracking-[-0.02em]">
                        {r?.realisasi ? fmtNilai(r.realisasi.nilai, r.realisasi.satuan, r.ind.slug) : "–"}
                      </span>
                      {r?.capaian != null ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums">
                          <span className="size-1.5 rounded-full" style={{ background: warnaKategori(r.kategori) }} />
                          {fmtPersen(r.capaian, 0)}
                        </span>
                      ) : r?.tertinggal ? (
                        <span className="shrink-0 text-[10px] text-muted-foreground">data {r.realisasi?.tahun}</span>
                      ) : null}
                    </span>
                  </Link>
                </Tip>
              );
            })}
          </div>
          <SumberRingkas data={makro} />
        </Panel>
      </div>

      {/* OPD x framework */}
      <Panel judul="Keterlibatan OPD" info={`Jumlah indikator tiap kerangka yang melibatkan OPD. 15 teratas dari ${data.jumlahOpd} OPD.`}>
        <PetaPanas
          baris={data.opd.map((o) => ({ nama: o.singkat, info: o.singkat !== o.nama ? o.nama : undefined }))}
          kolom={data.kerangka.map((k) => ({ nama: PENDEK[k.slug] ?? k.slug, warna: WARNA[k.slug] }))}
          nilai={(b, k) => data.opd[b].per[data.kerangka[k].slug] ?? 0}
          tip={(b, k) => {
            const o = data.opd[b];
            const kr = data.kerangka[k];
            const n = o.per[kr.slug] ?? 0;
            return (
              <>
                <Judul>{o.nama}</Judul>
                <p className="mt-0.5 text-muted-foreground">
                  {n ? `Terlibat di ${n} dari ${kr.indikator} ${kr.satuan} ${PENDEK[kr.slug]}` : `Tidak terlibat di ${PENDEK[kr.slug]}`}
                </p>
              </>
            );
          }}
        />
      </Panel>
    </div>
  );
}
