"use client";

/**
 * /dashboard-pemdi/spm: the kabupaten SPM index, the six bidang as cards and
 * every service by year as a grid (Ringkasan), and the tables of a Laporan
 * Penerapan SPM (Laporan) with Excel export and a print layout. The source
 * list closes both tabs.
 */
import * as React from "react";
import Link from "next/link";
import { Panel, Tip } from "@/components/viz";
import { BilahBagian, Pil } from "@/components/viz-bukti";
import { AlatLaporan, Baris, GarisPersen, Judul, KepalaCetak, KepalaDasbor, kepala, Pisah, sel, unduhExcel, urlPenuh, useParamUrl } from "@/components/viz-laporan";
import {
  cariSumberSpm,
  KartuBidang,
  KategoriSpmChip,
  LabelSumberSpm,
  LajuSpm,
  NilaiSpmTip,
  PetaSpm,
  SumberDataSpm,
  SumberSpmChips,
  WARNA_SPM,
} from "@/components/viz-spm";
import { InfoTip } from "@/components/viz";
import type { DataSpm, NilaiSpm } from "@/lib/spm";
import {
  daftarBidang,
  fmtPoin,
  fmtSpm,
  INFO_JUMLAH_KOSONG,
  INFO_KATEGORI_SPM,
  layananKabupaten,
  NAMA_BIDANG_PENDEK,
  ringkasBidang,
  ringkasKab,
  ringkasLayanan,
  RUMUS_LAJU_SPM,
  RUMUS_SPM,
  seriKabSpm,
  TAHUN_PETA,
  TAHUN_SPM,
  warnaSpm,
  type RingkasSpm,
} from "@/lib/spm-tampil";
import { hrefSumber, labelDokumen } from "@/lib/sumber-tampil";
import { cn } from "@/lib/utils";

type Tab = "ringkasan" | "laporan";

export const VERIFIKASI_SPM =
  "Angka disalin dari tabel capaian SPM di RKPD 2027 (Perbup 18/2026, Tabel 2.105–2.111), yang mengutip spm.bangda.kemendagri.go.id, dan RPJMD 2025–2029 untuk 2019–2020. Belum dicocokkan dengan laporan e-SPM. Arahkan kursor ke angka untuk kutipan dan halamannya.";

/** Tuntas / hampir / belum / no data across all kabupaten services for one year. */
export function hitungStatus(data: DataSpm, tahun: number) {
  const per = layananKabupaten(data).map((l) => ({ l, r: ringkasLayanan(data, l.id, tahun) }));
  return {
    per,
    tuntas: per.filter((x) => x.r.kategori === "Tuntas"),
    hampir: per.filter((x) => x.r.kategori === "Hampir tuntas"),
    belum: per.filter((x) => x.r.kategori === "Belum tuntas"),
    kosong: per.filter((x) => x.r.capaian == null),
  };
}

export function SpmHalaman({ data, tabAwal, tahunAwal, deskripsi }: { data: DataSpm; tabAwal: Tab; tahunAwal: number; deskripsi: string }) {
  const [tab, setTab] = React.useState<Tab>(tabAwal);
  const [tahun, setTahun] = React.useState(tahunAwal);
  useParamUrl({ tab: tab === "ringkasan" ? null : tab, tahun: tahun === data.tahunUtama ? null : String(tahun) });
  const st = hitungStatus(data, tahun);
  const bidang = daftarBidang(data);

  return (
    <div className="flex flex-col gap-4">
      <KepalaDasbor
        judul="Capaian SPM"
        info={<p className="line-clamp-[8]">{deskripsi}</p>}
        jejak={[{ href: "/dashboard-pemdi/spm", label: "Capaian SPM" }]}
        warna={WARNA_SPM}
        verifikasi={VERIFIKASI_SPM}
        tahun={tahun}
        tahunPilihan={TAHUN_SPM}
        onTahun={setTahun}
        angka={[
          {
            nilai: `${st.tuntas.length}/${st.per.length}`,
            label: "layanan tuntas",
            info: (
              <>
                <Judul>Jenis layanan dengan capaian 100% pada {tahun}</Judul>
                <p className="text-muted-foreground">
                  {st.hampir.length} hampir tuntas, {st.belum.length} belum tuntas{st.kosong.length ? `, ${st.kosong.length} belum ada data (${st.kosong.map((x) => x.l.judul).join(", ")})` : ""}.
                </p>
              </>
            ),
          },
          { nilai: bidang.length, label: "bidang" },
          { nilai: data.sumber.length, label: "sumber", info: "RKPD 2027, RPJMD 2025–2029, dan Rencana Aksi Daerah SPM; daftarnya di bagian bawah halaman." },
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
          <IndeksKab data={data} tahun={tahun} st={st} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bidang.map((b) => (
              <KartuBidang key={b.id} b={b} data={data} tahun={tahun} />
            ))}
          </div>
          <Panel
            judul="Capaian per jenis layanan"
            info={
              <>
                <p className="font-medium">Capaian setiap jenis layanan kewenangan kabupaten, 2021–2025</p>
                <p className="text-muted-foreground">Baris tebal: indeks bidang. Makin pekat makin mendekati 100%; titik merah: di bawah 90%. Klik sel untuk membuka layanannya.</p>
                <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_JUMLAH_KOSONG}</p>
              </>
            }
          >
            <PetaSpm data={data} tahun={tahun} kolom={TAHUN_PETA} />
          </Panel>
        </>
      ) : (
        <LaporanSpm data={data} tahun={tahun} />
      )}

      <SumberDataSpm data={data} />
    </div>
  );
}

/** The kabupaten index large, its trend, and how the 28 services split by kategori. */
function IndeksKab({ data, tahun, st }: { data: DataSpm; tahun: number; st: ReturnType<typeof hitungStatus> }) {
  const r = ringkasKab(data, tahun);
  const titik = seriKabSpm(data, [...TAHUN_SPM].reverse());
  return (
    <Panel
      judul={`Indeks SPM Kabupaten ${tahun}`}
      info={
        <>
          <p className="font-medium">Indeks capaian penerapan SPM seluruh bidang</p>
          <p className="text-muted-foreground">Dicetak di Tabel 2.105 RKPD 2027 (sumber tabel: Sekretariat SPM Tulang Bawang Barat). {RUMUS_SPM}</p>
          <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_KATEGORI_SPM}</p>
        </>
      }
    >
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <NilaiSpmTip nilai={r.capaian} baris={r.baris} data={data} judul={`Indeks SPM Kabupaten ${tahun}`}>
            <span className="flex items-baseline gap-0.5">
              <span className="text-5xl font-semibold tracking-[-0.04em]">{fmtSpm(r.capaian).replace("%", "")}</span>
              <span className="text-lg font-medium text-muted-foreground">%</span>
            </span>
          </NilaiSpmTip>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <LajuSpm r={r} />
            <span className="text-[11px] text-muted-foreground">vs {tahun - 1} ({fmtSpm(r.lalu)})</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <KategoriSpmChip k={r.kategori} sumberLabel={r.labelSumber} />
            <LabelSumberSpm label={r.labelSumber} />
          </div>
          <SumberSpmChips baris={r.baris} data={data} className="mt-2" />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[11px] text-muted-foreground">Indeks 2021–2025 · target 100%</p>
          <GarisPersen titik={titik} tahun={tahun} warna={WARNA_SPM} tinggi={96} />
          <div className="flex justify-between px-1 text-[10px] tabular-nums text-muted-foreground">
            {titik.map((t) => (
              <span key={t.tahun} className={cn(t.tahun === tahun && "font-semibold text-foreground")}>
                {t.tahun}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <p className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            {st.per.length} jenis layanan menurut kategori {tahun}
            <InfoTip isi={INFO_KATEGORI_SPM} />
          </p>
          <BilahBagian
            bagian={[
              { key: "t", nama: "Tuntas (100%)", nilai: st.tuntas.length, warna: warnaSpm("Tuntas")! },
              { key: "h", nama: "Hampir tuntas (≥90%)", nilai: st.hampir.length, warna: warnaSpm("Hampir tuntas")!, info: st.hampir.map((x) => `${x.l.judul} ${fmtSpm(x.r.capaian)}`).join("; ") },
              { key: "b", nama: "Belum tuntas (<90%)", nilai: st.belum.length, warna: warnaSpm("Belum tuntas")!, info: st.belum.map((x) => `${x.l.judul} ${fmtSpm(x.r.capaian)}`).join("; ") },
              { key: "k", nama: "Belum ada data", nilai: st.kosong.length, warna: "var(--viz-ref)", info: st.kosong.map((x) => x.l.judul).join("; ") },
            ]}
          />
        </div>
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------------- Laporan */

/** Value cell: the figure with its quote on hover, or a muted marker. */
function Sel({ r, data, lalu }: { r: RingkasSpm; data: DataSpm; lalu?: boolean }) {
  const v = lalu ? r.lalu : r.capaian;
  const baris = lalu ? r.barisLalu : r.baris;
  if (v == null)
    return (
      <Tip isi={<><Judul>Belum ada data</Judul><p className="text-muted-foreground">Tidak tercantum di tabel SPM sumber untuk tahun {lalu ? r.tahun - 1 : r.tahun}.</p></>}>
        <span className="cursor-help text-muted-foreground">n/a</span>
      </Tip>
    );
  return <NilaiSpmTip nilai={v} baris={baris} data={data} />;
}

const warnaLaju = (l: number | null) => (l == null || l === 0 ? undefined : l > 0 ? "var(--status-good)" : "var(--status-serious)");
const fmtL = (l: number | null) => (l == null ? "–" : `${l > 0 ? "+" : l < 0 ? "−" : "±"}${Math.abs(l).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

function Cetak({ baris, data }: { baris: NilaiSpm[]; data: DataSpm }) {
  const n = baris[0];
  const s = cariSumberSpm(data, n?.sumber);
  return s && n ? <span className="hidden text-[10px] print:inline">{labelDokumen(s, n.halaman)}</span> : null;
}

export function LaporanSpm({ data, tahun }: { data: DataSpm; tahun: number }) {
  const bidang = daftarBidang(data);
  const kab = ringkasKab(data, tahun);
  const judulCetak = `Capaian Penerapan Standar Pelayanan Minimal Kabupaten Tulang Bawang Barat Tahun ${tahun}`;
  const kolomTahun = TAHUN_PETA;

  const keExcel = async () => {
    const label = (b: NilaiSpm[]) =>
      b
        .map((n) => {
          const s = cariSumberSpm(data, n.sumber);
          return s ? labelDokumen(s, n.halaman) : n.sumber;
        })
        .filter((x, i, a) => a.indexOf(x) === i)
        .join("; ");
    const num = (v: number | null) => (v == null ? "" : Number(v.toFixed(2)));
    let no = 0;
    const capaian = [
      [judulCetak],
      [],
      ["No", "Bidang", "Jenis Layanan", "OPD", `Tahun ${tahun - 1} (%)`, `Tahun ${tahun} (%)`, "Laju (%)", "Kategori", "Sumber", "Jumlah sasaran", "Jumlah terlayani"],
      ...bidang.flatMap((b) =>
        b.layanan.map((l) => {
          const r = ringkasLayanan(data, l.id, tahun);
          return [++no, b.nama, l.judul, l.opd.join(", "), num(r.lalu), num(r.capaian), num(r.laju), r.kategori ?? (r.capaian == null ? "belum ada data" : ""), label([...r.baris, ...r.barisLalu]), "", ""];
        }),
      ),
      [],
      ["Kategori (pita dasbor): " + INFO_KATEGORI_SPM],
      ["Catatan: " + INFO_JUMLAH_KOSONG],
    ];
    const indeks = [
      [`Indeks Capaian SPM per Bidang, Kabupaten Tulang Bawang Barat ${kolomTahun[0]}–${kolomTahun.at(-1)}`],
      [],
      ["No", "Bidang", ...kolomTahun.map((t) => `${t} (%)`), `Laju ${tahun} (%)`, `Kategori ${tahun}`, "Sumber"],
      ...bidang.map((b, i) => {
        const r = ringkasBidang(data, b.id, tahun);
        return [i + 1, b.nama, ...kolomTahun.map((t) => num(ringkasBidang(data, b.id, t).capaian)), num(r.laju), r.kategori ?? "", label(r.baris)];
      }),
      ["", "Indeks SPM Kabupaten", ...kolomTahun.map((t) => num(ringkasKab(data, t).capaian)), num(kab.laju), `${kab.kategori ?? ""}${kab.labelSumber ? ` (sumber: ${kab.labelSumber})` : ""}`, label(kab.baris)],
    ];
    const nilai = [
      ["Bidang", "Jenis layanan", "Tahun", "Jenis", "Nilai (%)", "Sumber", "Halaman PDF", "Lokasi", "Kutipan", "Catatan", "Tautan"],
      ...data.nilai.map((n) => {
        const s = cariSumberSpm(data, n.sumber);
        const l = data.layanan.find((x) => x.id === n.layanan);
        return [n.bidang ?? "kabupaten", l?.judul ?? "", n.tahun, n.jenis, n.nilai, s?.judul ?? n.sumber, n.halaman ?? "", n.lokasi, n.kutipan, n.catatan ?? "", s ? urlPenuh(hrefSumber(s, n.halaman)) : ""];
      }),
    ];
    const sumber = [["Judul", "Penerbit", "Tahun terbit", "Tautan"], ...data.sumber.map((s) => [s.judul, s.penerbit, s.tahunTerbit ?? "", urlPenuh(s.href)])];
    await unduhExcel(`capaian-spm-tubaba-${tahun}.xlsx`, [
      { nama: "Capaian per layanan", baris: capaian, lebar: [4, 28, 52, 36, 12, 12, 10, 14, 50, 14, 14] },
      { nama: "Indeks bidang", baris: indeks, lebar: [4, 30, 10, 10, 10, 10, 10, 12, 16, 50] },
      { nama: "Nilai & kutipan", baris: nilai },
      { nama: "Sumber", baris: sumber, lebar: [80, 40, 12, 70] },
    ]);
  };

  let no = 0;
  return (
    <div className="flex flex-col gap-3">
      <KepalaCetak judul={judulCetak} sub="Sumber: RKPD 2027 (Perbup 18/2026) yang mengutip spm.bangda.kemendagri.go.id, dan RPJMD 2025–2029 (diolah Pemdi-AI); angka belum dicocokkan dengan e-SPM." />
      <AlatLaporan onExcel={keExcel} info="Excel memuat tabel capaian per jenis layanan, indeks per bidang, seluruh nilai beserta kutipan dan halaman sumbernya, dan daftar sumber. Cetak menyiapkan tata letak A4 mendatar." />

      <Panel
        className="break-inside-avoid print:border-0 print:shadow-none"
        judul={`Capaian Penerapan SPM ${tahun}`}
        info={
          <>
            <p className="font-medium">Format Laporan Penerapan SPM / LPPD</p>
            <p className="text-muted-foreground">{RUMUS_SPM}</p>
            <p className="text-muted-foreground">{RUMUS_LAJU_SPM}</p>
            <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{INFO_KATEGORI_SPM}</p>
          </>
        }
        bodyClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[60rem] border-collapse text-[13px]">
          <thead>
            <tr>
              <th rowSpan={2} className={cn(kepala, "w-8")}>No</th>
              <th rowSpan={2} className={kepala}>Bidang</th>
              <th rowSpan={2} className={kepala}>Jenis Layanan</th>
              <th colSpan={2} className={cn(kepala, "border-b-border/60 pb-1 text-center")}>
                <span className="inline-flex items-center gap-0.5">
                  Capaian (%)
                  <InfoTip isi={<><Judul>Capaian = terlayani ÷ sasaran × 100%</Judul><p className="text-muted-foreground">{INFO_JUMLAH_KOSONG}</p></>} className="print:hidden" />
                </span>
              </th>
              <th rowSpan={2} className={cn(kepala, "text-right")}>Laju</th>
              <th rowSpan={2} className={kepala}>Kategori</th>
              <th rowSpan={2} className={kepala}>Sumber</th>
            </tr>
            <tr>
              <th className={cn(kepala, "text-right")}>Tahun {tahun - 1}</th>
              <th className={cn(kepala, "text-right")}>Tahun {tahun}</th>
            </tr>
          </thead>
          <tbody>
            {bidang.map((b) =>
              b.layanan.map((l, i) => {
                const r = ringkasLayanan(data, l.id, tahun);
                no++;
                return (
                  <tr key={l.id}>
                    <td className={cn(sel, "tabular-nums text-muted-foreground")}>{no}</td>
                    {i === 0 ? (
                      <td className={cn(sel, "w-40 font-medium")} rowSpan={b.layanan.length}>
                        <Link href={b.jalur} className="hover:underline">
                          {b.kode}. {NAMA_BIDANG_PENDEK[b.id] ?? b.nama}
                        </Link>
                      </td>
                    ) : null}
                    <td className={sel}>
                      <Link href={l.jalur} className="hover:underline">
                        {l.judul}
                      </Link>
                    </td>
                    <td className={cn(sel, "text-right")}>
                      <Sel r={r} data={data} lalu />
                    </td>
                    <td className={cn(sel, "text-right font-medium")}>
                      <Sel r={r} data={data} />
                    </td>
                    <td className={cn(sel, "text-right font-semibold tabular-nums")} style={{ color: warnaLaju(r.laju) }}>
                      {fmtL(r.laju)}
                    </td>
                    <td className={sel}>{r.capaian == null ? <span className="text-[11px] text-muted-foreground">belum ada data</span> : <KategoriSpmChip k={r.kategori} kecil />}</td>
                    <td className={sel}>
                      <div className="w-60">
                        <SumberSpmChips baris={(r.baris.length ? r.baris : r.barisLalu).slice(0, 1)} data={data} className="print:hidden" />
                        <Cetak baris={r.baris} data={data} />
                      </div>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </Panel>

      <Panel
        className="break-inside-avoid print:border-0 print:shadow-none"
        judul={`Indeks Capaian SPM per Bidang ${kolomTahun[0]}–${kolomTahun.at(-1)}`}
        info={
          <>
            <p className="font-medium">Indeks bidang sebagaimana dicetak sumber</p>
            <p className="text-muted-foreground">Indeks bidang yang dilaporkan dipakai apa adanya; bisa berbeda dari rata-rata kartu layanan (mis. Trantibum, karena satu layanan dipecah menjadi tiga baris). Laju dan kategori untuk tahun {tahun}.</p>
          </>
        }
        bodyClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[56rem] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={cn(kepala, "w-8")}>No</th>
              <th className={kepala}>Bidang</th>
              {kolomTahun.map((t) => (
                <th key={t} className={cn(kepala, "text-right", t === tahun && "text-foreground")}>
                  {t}
                </th>
              ))}
              <th className={cn(kepala, "text-right")}>Laju {tahun}</th>
              <th className={kepala}>Kategori {tahun}</th>
              <th className={kepala}>Sumber</th>
            </tr>
          </thead>
          <tbody>
            {bidang.map((b, i) => {
              const r = ringkasBidang(data, b.id, tahun);
              const beda = r.rataLayanan != null && r.capaian != null && Math.abs(r.rataLayanan - r.capaian) > 0.05;
              return (
                <tr key={b.id}>
                  <td className={cn(sel, "tabular-nums text-muted-foreground")}>{i + 1}</td>
                  <td className={sel}>
                    <Link href={b.jalur} className="font-medium hover:underline">
                      {b.nama}
                    </Link>
                    {beda ? (
                      <Tip isi={<><Judul>Indeks dilaporkan ≠ rata-rata layanan</Judul><Baris k="Indeks dilaporkan" v={fmtSpm(r.capaian)} /><Baris k="Rata-rata kartu layanan" v={fmtSpm(r.rataLayanan)} /><Pisah>Dasbor memakai indeks yang dicetak sumber.</Pisah></>}>
                        <span className="ml-1.5 cursor-help rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">rata-rata {fmtSpm(r.rataLayanan, 1)}</span>
                      </Tip>
                    ) : null}
                  </td>
                  {kolomTahun.map((t) => {
                    const rt = ringkasBidang(data, b.id, t);
                    return (
                      <td key={t} className={cn(sel, "text-right", t === tahun && "bg-muted/50 font-semibold")}>
                        <NilaiSpmTip nilai={rt.capaian} baris={rt.baris} data={data} judul={`Indeks SPM ${b.nama} ${t}`} />
                      </td>
                    );
                  })}
                  <td className={cn(sel, "text-right font-semibold tabular-nums")} style={{ color: warnaLaju(r.laju) }}>
                    <Tip isi={`Selisih ${fmtPoin(r.selisih)}. ${RUMUS_LAJU_SPM}`}>
                      <span className="cursor-help">{fmtL(r.laju)}</span>
                    </Tip>
                  </td>
                  <td className={sel}>
                    <KategoriSpmChip k={r.kategori} kecil />
                  </td>
                  <td className={sel}>
                    <div className="w-60">
                      <SumberSpmChips baris={r.baris} data={data} className="print:hidden" />
                      <Cetak baris={r.baris} data={data} />
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-muted/30">
              <td className={sel} />
              <td className={cn(sel, "font-semibold")}>Indeks SPM Kabupaten</td>
              {kolomTahun.map((t) => {
                const rt = ringkasKab(data, t);
                return (
                  <td key={t} className={cn(sel, "text-right font-semibold", t === tahun && "bg-muted/50")}>
                    <NilaiSpmTip nilai={rt.capaian} baris={rt.baris} data={data} judul={`Indeks SPM Kabupaten ${t}${rt.labelSumber ? ` · ${rt.labelSumber}` : ""}`} />
                  </td>
                );
              })}
              <td className={cn(sel, "text-right font-semibold tabular-nums")} style={{ color: warnaLaju(kab.laju) }}>
                {fmtL(kab.laju)}
              </td>
              <td className={sel}>
                <div className="flex flex-wrap gap-1">
                  <KategoriSpmChip k={kab.kategori} kecil sumberLabel={kab.labelSumber} />
                  <LabelSumberSpm label={kab.labelSumber} />
                </div>
              </td>
              <td className={sel}>
                <div className="w-60">
                  <SumberSpmChips baris={kab.baris} data={data} className="print:hidden" />
                  <Cetak baris={kab.baris} data={data} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {(["Tuntas", "Hampir tuntas", "Belum tuntas"] as const).map((k, i) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: warnaSpm(k) }} />
              {k} <span className="tabular-nums opacity-70">{["100%", "≥90%", "<90%"][i]}</span>
            </span>
          ))}
          <span className="opacity-70">· pita dasbor, bukan dari sumber</span>
        </div>
      </Panel>
    </div>
  );
}
