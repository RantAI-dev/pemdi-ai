"use client";

/**
 * /dashboard-pemdi/prosn: the PROSN support score as a lower bound (earned /
 * not earned / no evidence yet), kelompok cards with their programmes, and
 * the documents to upload (Ringkasan); the evaluation table with Excel export
 * and a print layout (Laporan). The source list closes both tabs.
 */
import * as React from "react";
import Link from "next/link";
import { Panel, Tip } from "@/components/viz";
import { Pil } from "@/components/viz-bukti";
import { AlatLaporan, Baris, Judul, KepalaCetak, KepalaDasbor, kepala, Pisah, sel, unduhExcel, urlPenuh, useParamUrl } from "@/components/viz-laporan";
import {
  BilahPoin,
  ChipBukti,
  cariSumberProsn,
  DaftarUnggah,
  HurufKelompok,
  KartuKelompok,
  KategoriProsnChip,
  KriteriaChip,
  LegendaPoin,
  StatusAI,
  SumberDataProsn,
  WARNA_PROSN,
} from "@/components/viz-prosn";
import type { DataProsn } from "@/lib/prosn";
import { PITA_KATEGORI_PROSN } from "@/lib/prosn-hitung";
import {
  fmtPersenProsn,
  fmtPoinProsn,
  fmtSkor,
  INFO_BATAS_BAWAH,
  INFO_STATUS,
  judulBiasa,
  kodeIndikator,
  penilaianDari,
  perluUnggah,
  pohon,
  rincianSkor,
  RUMUS_PROSN,
  type RincianSkor,
} from "@/lib/prosn-tampil";
import { hrefSumber, labelDokumen } from "@/lib/sumber-tampil";
import { cn } from "@/lib/utils";

type Tab = "ringkasan" | "laporan";
export type KelompokKosong = { id: string; kode: string; judul: string; penjelasan: string };

export const VERIFIKASI_PROSN =
  "Setiap indikator dinilai AI dari dokumen yang tersedia (RKPD, APBD, LAKIP, LKPD, perbup/kepbup, dokumen OPD); setiap bukti menyebut halaman dan kutipannya. Belum diverifikasi oleh penilai manusia.";

/** Skor large with "/100", capaian, kategori, and the lower-bound pill. */
export function SkorBesar({ r, ukuran = "besar" }: { r: RincianSkor; ukuran?: "besar" | "sedang" }) {
  return (
    <div className="min-w-0">
      <Tip
        isi={
          <>
            <Judul>Skor terbukti</Judul>
            <Baris k="Skor" v={`${fmtSkor(r.terbukti)} / ${fmtPoinProsn(r.maks)}`} />
            <Baris k="Capaian" v={fmtPersenProsn(r.capaian)} />
            <Pisah>{RUMUS_PROSN}</Pisah>
          </>
        }
      >
        <span className="flex cursor-help items-baseline gap-1">
          <span className={cn("font-semibold tabular-nums tracking-[-0.04em]", ukuran === "besar" ? "text-5xl" : "text-4xl")}>{fmtSkor(r.terbukti)}</span>
          <span className="text-lg font-medium text-muted-foreground">/{fmtPoinProsn(r.maks)}</span>
        </span>
      </Tip>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className="text-xl font-semibold tabular-nums tracking-[-0.02em]">{fmtPersenProsn(r.capaian)}</span>
        <span className="text-[11px] text-muted-foreground">capaian</span>
        <KategoriProsnChip k={r.kategori} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Tip isi={<><Judul>Batas bawah</Judul><p className="text-muted-foreground">{INFO_BATAS_BAWAH}</p></>}>
          <span className="inline-flex h-5 cursor-help items-center whitespace-nowrap rounded-full px-2 text-[10.5px] font-medium" style={{ background: "color-mix(in oklab, var(--status-warning) 14%, transparent)" }}>
            batas bawah · +{fmtPoinProsn(r.tanpaBukti)} belum ada bukti
          </span>
        </Tip>
      </div>
    </div>
  );
}

/** The split in figures and as one bar on a 0..maks scale, potensi marked. */
export function RincianPanel({ r }: { r: RincianSkor }) {
  const angka: { label: string; nilai: number; info: string; isi?: string }[] = [
    { label: "terbukti", nilai: r.terbukti, info: `Poin dari ${r.dinilai} indikator yang dinilai dengan bukti.` },
    { label: "dinilai, tidak diperoleh", nilai: r.hilang, info: "Bobot indikator yang dinilai tetapi kriterianya b/c." },
    { label: "belum ada bukti", nilai: r.tanpaBukti, info: `${r.nTanpaBukti} indikator belum punya dokumen bukti; dihitung 0 sampai dokumen diunggah.` },
    { label: "potensi maks", nilai: r.potensi, info: "Skor tertinggi yang masih mungkin bila semua indikator tanpa bukti ternyata terpenuhi penuh (terbukti + belum ada bukti)." },
  ];
  return (
    <div className="min-w-0">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {angka.map((a) => (
          <Tip key={a.label} isi={a.info} className="block">
            <div className="cursor-help">
              <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{fmtSkor(a.nilai)}</dd>
              <dt className="truncate text-[11px] text-muted-foreground">{a.label}</dt>
            </div>
          </Tip>
        ))}
      </dl>
      <div className="relative mt-4">
        <BilahPoin r={r} tinggi={22} />
        <span className="absolute -top-1.5" style={{ left: `${Math.min(100, (r.potensi / r.maks) * 100)}%` }}>
          <Tip isi={`Potensi maks ${fmtSkor(r.potensi)} poin: terbukti + belum ada bukti`}>
            <span aria-hidden className="-ml-px block h-[34px] w-0.5 cursor-help rounded-full bg-foreground/70" />
          </Tip>
        </span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>0</span>
        <span>{fmtPoinProsn(r.maks / 2)}</span>
        <span>{fmtPoinProsn(r.maks)}</span>
      </div>
      <LegendaPoin r={r} className="mt-1.5" />
    </div>
  );
}

export function ProsnHalaman({ data, tabAwal, deskripsi, kosong = [] }: { data: DataProsn; tabAwal: Tab; deskripsi: string; kosong?: KelompokKosong[] }) {
  const [tab, setTab] = React.useState<Tab>(tabAwal);
  useParamUrl({ tab: tab === "ringkasan" ? null : tab });
  const r = rincianSkor(data);
  const kelompok = pohon(data);
  const unggah = perluUnggah(data);

  return (
    <div className="flex flex-col gap-4">
      <KepalaDasbor
        judul="Dukungan PROSN"
        info={<p className="line-clamp-[8]">{deskripsi}</p>}
        jejak={[{ href: "/dashboard-pemdi/prosn", label: "Dukungan PROSN" }]}
        warna={WARNA_PROSN}
        verifikasi={VERIFIKASI_PROSN}
        sub={`Kab. Tulang Bawang Barat · penilaian ${data.tahunUtama}`}
        angka={[
          { nilai: `${r.dinilai}/${r.jumlah}`, label: "indikator dinilai", info: `${r.nTanpaBukti} indikator belum punya bukti (${fmtSkor(r.tanpaBukti)} poin).` },
          { nilai: kelompok.length, label: "kelompok" },
          { nilai: data.sumber.length, label: "sumber", info: "Dokumen perencanaan, anggaran, laporan kinerja, regulasi, dokumen OPD, BPS, dan berita resmi; daftarnya di bagian bawah halaman." },
        ]}
      />

      <div className="flex items-center gap-1 px-1 print:hidden">
        <Pil<Tab>
          opsi={[
            { key: "ringkasan", label: "Ringkasan" },
            { key: "laporan", label: "Laporan" },
          ]}
          nilai={tab}
          onUbah={setTab}
        />
      </div>

      {tab === "ringkasan" ? (
        <>
          <Panel
            judul={`Skor Dukungan PROSN ${data.tahunUtama}`}
            info={
              <>
                <p className="text-muted-foreground">{RUMUS_PROSN}</p>
                <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_BATAS_BAWAH}</p>
              </>
            }
            aksi={<StatusAI />}
          >
            <div className="grid items-center gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
              <SkorBesar r={r} />
              <RincianPanel r={r} />
            </div>
          </Panel>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {kelompok.map((k) => (
              <KartuKelompok key={k.id} k={k} data={data} />
            ))}
            {kosong.map((k) => (
              <Link key={k.id} href={`/dashboard-pemdi/prosn/${k.id}`} className="flex min-w-0 flex-col rounded-2xl border border-dashed border-border p-4 text-muted-foreground hover:bg-muted/40">
                <span className="flex items-center gap-1.5">
                  <HurufKelompok kode={k.kode} />
                  <Tip isi={judulBiasa(k.judul)} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{judulBiasa(k.judul)}</span>
                  </Tip>
                </span>
                <span className="mt-3 text-xs leading-5">Kelompok ini tercantum di sumber tanpa program, indikator, atau bobot, sehingga belum dinilai.</span>
              </Link>
            ))}
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
            info="Indikator yang belum punya bukti, dikelompokkan menurut OPD utamanya; urut dari poin terbesar. Keterangan di tiap baris menyebut dokumen yang dibutuhkan. Mengunggahnya di halaman Dokumen menaikkan skor bila kriterianya terpenuhi."
            aksi={
              <Link href="/dokumen" className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium hover:bg-muted" style={{ color: WARNA_PROSN }}>
                Unggah dokumen
              </Link>
            }
          >
            <DaftarUnggah grup={unggah} />
          </Panel>
        </>
      ) : (
        <LaporanProsn data={data} />
      )}

      <SumberDataProsn data={data} />
    </div>
  );
}

/* ----------------------------------------------------------------- Laporan */

export function LaporanProsn({ data }: { data: DataProsn }) {
  const kelompok = pohon(data);
  const total = rincianSkor(data);
  const judulCetak = `Evaluasi Dukungan Pemerintah Daerah terhadap Prioritas Nasional (PROSN) Kabupaten Tulang Bawang Barat Tahun ${data.tahunUtama}`;

  const keExcel = async () => {
    const lbl = (sumber: string, halaman: number | null) => {
      const s = cariSumberProsn(data, sumber);
      return s ? labelDokumen(s, halaman) : sumber;
    };
    const penilaian = [
      [judulCetak],
      [],
      ["No", "Kelompok", "Program", "Kode", "Indikator", "Bobot", "Kriteria terpenuhi", "Teks kriteria", "Nilai", "Alasan", "Bukti", "OPD", "Dasar hukum", "Penilai", "Status"],
      ...data.indikator.map((i, n) => {
        const p = penilaianDari(data, i.id);
        const kr = i.kriteria.find((k) => k.kode === p?.kriteria);
        return [
          n + 1,
          `${i.kelompokKode}. ${i.kelompokNama}`,
          `${i.programKode}. ${i.programNama}`,
          kodeIndikator(i),
          i.judul,
          i.bobot,
          p?.kriteria ?? "belum ada bukti",
          kr?.teks ?? "",
          p?.kriteria ? (p.nilai ?? 0) : "",
          p?.alasan ?? "",
          (p?.bukti ?? []).map((b) => lbl(b.sumber, b.halaman)).filter((x, j, a) => a.indexOf(x) === j).join("; "),
          i.opd.join(", "),
          i.dasarHukum,
          p?.penilai ?? "",
          p?.terverifikasi ? "terverifikasi" : "belum diverifikasi",
        ];
      }),
    ];
    const rekap = [
      [`Rekap Skor Dukungan PROSN per Kelompok, ${data.tahunUtama}`],
      [],
      ["Kelompok", "Program", "Bobot maks", "Skor terbukti", "Capaian (%)", "Kategori", "Dinilai", "Indikator", "Dinilai tidak diperoleh", "Belum ada bukti (poin)", "Potensi maks"],
      ...kelompok.flatMap((k) => {
        const rk = rincianSkor(data, { kelompok: k.id });
        return [
          [`${k.kode}. ${k.nama}`, "", rk.maks, rk.terbukti, rk.capaian, rk.kategori, rk.dinilai, rk.jumlah, rk.hilang, rk.tanpaBukti, rk.potensi],
          ...k.program.map((p) => {
            const rp = rincianSkor(data, { kelompok: k.id, program: p.id });
            return ["", `${p.kode}. ${p.nama}`, rp.maks, rp.terbukti, rp.capaian, rp.kategori, rp.dinilai, rp.jumlah, rp.hilang, rp.tanpaBukti, rp.potensi];
          }),
        ];
      }),
      ["TOTAL", "", total.maks, total.terbukti, total.capaian, total.kategori, total.dinilai, total.jumlah, total.hilang, total.tanpaBukti, total.potensi],
      [],
      ["Kategori: " + PITA_KATEGORI_PROSN],
      ["Catatan: " + INFO_BATAS_BAWAH],
    ];
    const bukti = [
      ["Kode", "Indikator", "Kriteria", "Sumber", "Halaman PDF", "Lokasi", "Kutipan", "Tautan"],
      ...data.penilaian.flatMap((p) => {
        const i = data.indikator.find((x) => x.id === p.indikator);
        return p.bukti.map((b) => {
          const s = cariSumberProsn(data, b.sumber);
          return [i ? kodeIndikator(i) : p.indikator, i?.judul ?? "", p.kriteria ?? "belum ada bukti", s?.judul ?? b.sumber, b.halaman ?? "", b.lokasi, b.kutipan, s ? urlPenuh(hrefSumber(s, b.halaman)) : ""];
        });
      }),
    ];
    const sumber = [["Judul", "Penerbit", "Tahun terbit", "Tautan"], ...data.sumber.map((s) => [s.judul, s.penerbit, s.tahunTerbit ?? "", urlPenuh(s.href)])];
    await unduhExcel(`dukungan-prosn-tubaba-${data.tahunUtama}.xlsx`, [
      { nama: "Penilaian", baris: penilaian, lebar: [4, 28, 36, 7, 70, 7, 10, 50, 7, 70, 50, 40, 50, 8, 16] },
      { nama: "Rekap kelompok", baris: rekap, lebar: [32, 50, 10, 12, 12, 14, 8, 10, 14, 14, 12] },
      { nama: "Bukti & kutipan", baris: bukti, lebar: [7, 60, 8, 60, 10, 50, 70, 60] },
      { nama: "Sumber", baris: sumber, lebar: [80, 40, 12, 70] },
    ]);
  };

  let no = 0;
  return (
    <div className="flex flex-col gap-3">
      <KepalaCetak judul={judulCetak} sub={`Skor ${fmtSkor(total.terbukti)}/100 (batas bawah; ${total.nTanpaBukti} indikator belum ada bukti, ${fmtSkor(total.tanpaBukti)} poin). Dinilai AI dari dokumen Pemkab, belum diverifikasi.`} />
      <AlatLaporan onExcel={keExcel} info="Excel memuat tabel penilaian 65 indikator, rekap per kelompok dan program, seluruh bukti beserta halaman dan kutipannya, dan daftar sumber. Cetak menyiapkan tata letak A4 mendatar." />

      <Panel
        className="break-inside-avoid print:border-0 print:shadow-none"
        judul={`Tabel Evaluasi Dukungan PROSN ${data.tahunUtama}`}
        info={
          <>
            <p className="font-medium">Format tabel indikator kinerja PROSN</p>
            <p className="text-muted-foreground">{RUMUS_PROSN}</p>
            <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_STATUS}</p>
          </>
        }
        bodyClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[64rem] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={cn(kepala, "w-8")}>No</th>
              <th className={kepala}>Kelompok / Program / Indikator</th>
              <th className={cn(kepala, "text-right")}>Bobot</th>
              <th className={cn(kepala, "text-center")}>Kriteria terpenuhi</th>
              <th className={cn(kepala, "text-right")}>Nilai</th>
              <th className={kepala}>Bukti</th>
              <th className={kepala}>Status</th>
            </tr>
          </thead>
          <tbody>
            {kelompok.map((k) => {
              const rk = rincianSkor(data, { kelompok: k.id });
              return (
                <React.Fragment key={k.id}>
                  <tr className="bg-muted/40">
                    <td className={cn(sel, "font-semibold")}>{k.kode}</td>
                    <td className={cn(sel, "font-semibold")}>
                      <Link href={k.jalur} className="hover:underline">
                        {k.nama}
                      </Link>
                    </td>
                    <td className={cn(sel, "text-right font-semibold tabular-nums")}>{fmtSkor(rk.maks)}</td>
                    <td className={cn(sel, "text-center text-[11px] text-muted-foreground")}>
                      {rk.dinilai}/{rk.jumlah} dinilai
                    </td>
                    <td className={cn(sel, "text-right font-semibold tabular-nums")}>{fmtSkor(rk.terbukti)}</td>
                    <td className={sel} colSpan={2}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold tabular-nums">{fmtPersenProsn(rk.capaian)}</span>
                        <KategoriProsnChip k={rk.kategori} kecil />
                      </div>
                    </td>
                  </tr>
                  {k.program.map((p) => {
                    const rp = rincianSkor(data, { kelompok: k.id, program: p.id });
                    return (
                      <React.Fragment key={p.id}>
                        <tr>
                          <td className={cn(sel, "text-[11px] font-medium text-muted-foreground")}>
                            {k.kode}.{p.kode}
                          </td>
                          <td className={cn(sel, "font-medium")}>
                            <Link href={p.jalur} className="hover:underline">
                              Program {p.nama}
                            </Link>
                          </td>
                          <td className={cn(sel, "text-right tabular-nums text-muted-foreground")}>{fmtSkor(rp.maks)}</td>
                          <td className={sel} />
                          <td className={cn(sel, "text-right font-medium tabular-nums")}>{fmtSkor(rp.terbukti)}</td>
                          <td className={sel} colSpan={2} />
                        </tr>
                        {p.indikator.map((i) => {
                          const pn = penilaianDari(data, i.id);
                          no++;
                          return (
                            <tr key={i.id}>
                              <td className={cn(sel, "tabular-nums text-muted-foreground")}>{no}</td>
                              <td className={cn(sel, "pl-6")}>
                                <Tip isi={<><Judul>{kodeIndikator(i)} {i.judul}</Judul>{pn ? <p className="mt-1 text-muted-foreground">{pn.alasan}</p> : null}</>} className="block">
                                  <Link href={i.jalur} className="line-clamp-2 hover:underline print:line-clamp-none">
                                    <span className="tabular-nums text-muted-foreground">{kodeIndikator(i)}</span> {i.judul}
                                  </Link>
                                </Tip>
                              </td>
                              <td className={cn(sel, "text-right tabular-nums")}>{fmtSkor(i.bobot)}</td>
                              <td className={cn(sel, "text-center")}>
                                <KriteriaChip p={pn} ind={i} />
                              </td>
                              <td className={cn(sel, "text-right font-medium tabular-nums")}>{pn?.kriteria ? fmtSkor(pn.nilai) : <span className="text-muted-foreground">–</span>}</td>
                              <td className={sel}>
                                <div className="flex w-64 flex-wrap gap-1 print:hidden">
                                  {(pn?.bukti ?? [])
                                    .filter((b, j, a) => a.findIndex((x) => x.sumber === b.sumber && x.halaman === b.halaman) === j)
                                    .slice(0, 3)
                                    .map((b) => (
                                      <ChipBukti key={`${b.sumber}${b.halaman}`} b={b} data={data} className="max-w-full" />
                                    ))}
                                  {(pn?.bukti.length ?? 0) > 3 ? (
                                    <Link href={i.jalur} className="inline-flex h-5 items-center rounded-full px-1.5 text-[10.5px] font-medium hover:bg-muted" style={{ color: WARNA_PROSN }}>
                                      +{(pn?.bukti.length ?? 0) - 3}
                                    </Link>
                                  ) : null}
                                  {!pn?.bukti.length ? <span className="text-[11px] text-muted-foreground">–</span> : null}
                                </div>
                                <span className="hidden text-[10px] print:inline">
                                  {(pn?.bukti ?? [])
                                    .map((b) => {
                                      const s = cariSumberProsn(data, b.sumber);
                                      return s ? labelDokumen(s, b.halaman) : b.sumber;
                                    })
                                    .filter((x, j, a) => a.indexOf(x) === j)
                                    .join("; ")}
                                </span>
                              </td>
                              <td className={sel}>
                                <StatusAI p={pn} />
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
            <tr className="bg-muted/40">
              <td className={sel} />
              <td className={cn(sel, "font-semibold")}>TOTAL</td>
              <td className={cn(sel, "text-right font-semibold tabular-nums")}>{fmtSkor(total.maks)}</td>
              <td className={cn(sel, "text-center text-[11px] text-muted-foreground")}>
                {total.dinilai}/{total.jumlah} dinilai
              </td>
              <td className={cn(sel, "text-right font-semibold tabular-nums")}>{fmtSkor(total.terbukti)}</td>
              <td className={sel} colSpan={2}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold tabular-nums">{fmtPersenProsn(total.capaian)}</span>
                  <KategoriProsnChip k={total.kategori} kecil />
                  <span className="text-[11px] text-muted-foreground">batas bawah · +{fmtPoinProsn(total.tanpaBukti)} poin belum ada bukti</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
