"use client";

/**
 * /dashboard-pemdi/makro: the six macro indicators as cards (Ringkasan) and
 * as the two tables a Pemda reports (Laporan: LPPD and Evaluasi RPJMD), with
 * Excel export and a print layout. The source list closes both tabs.
 */
import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Panel, Tip } from "@/components/viz";
import { Pil } from "@/components/viz-bukti";
import { AlatLaporan, KepalaCetak, KepalaDasbor, kepala, sel, tombolLaporan, unduhExcel, urlPenuh, useParamUrl, type AngkaKepala } from "@/components/viz-laporan";
import { cariSumber, KartuMakro, KategoriChip, NilaiTip, SumberChip, SumberData, WARNA_MAKRO } from "@/components/viz-makro";
import type { DataMakro, IndikatorMakro, NilaiMakro } from "@/lib/makro";
import { capaian, kategori, laju, lajuBaik, type Kategori } from "@/lib/makro-hitung";
import { fmtLaju, fmtNilai, fmtPersen, hrefHalaman, labelSumber, PITA_KATEGORI, ringkas, rumusCapaian, RUMUS_LAJU, TAHUN_PILIHAN, warnaKategori } from "@/lib/makro-tampil";
import { cn } from "@/lib/utils";

type Tab = "ringkasan" | "laporan";
const tombol = tombolLaporan;

export function KepalaMakro({
  judul,
  info,
  angka,
  tahun,
  onTahun,
  jejak,
}: {
  judul: React.ReactNode;
  info?: React.ReactNode;
  angka: AngkaKepala[];
  tahun: number;
  onTahun: (t: number) => void;
  jejak?: { href: string; label: string }[];
}) {
  return (
    <KepalaDasbor
      judul={judul}
      info={info}
      angka={angka}
      tahun={tahun}
      tahunPilihan={TAHUN_PILIHAN}
      onTahun={onTahun}
      jejak={jejak}
      warna={WARNA_MAKRO}
      verifikasi="Semua angka diekstrak otomatis dari publikasi BPS dan dokumen RPJMD, dan belum diverifikasi manual. Arahkan kursor ke angka untuk melihat kutipan dan halamannya."
    />
  );
}

export function MakroHalaman({ data, tabAwal, tahunAwal, deskripsi }: { data: DataMakro; tabAwal: Tab; tahunAwal: number; deskripsi: string }) {
  const [tab, setTab] = React.useState<Tab>(tabAwal);
  const [tahun, setTahun] = React.useState(tahunAwal);
  useParamUrl({ tab: tab === "ringkasan" ? null : tab, tahun: tahun === data.tahunUtama ? null : String(tahun) });
  const semua = data.indikator.map((ind) => ringkas(data, ind, tahun));
  const dinilai = semua.filter((r) => r.capaian != null);
  const capai = dinilai.filter((r) => (r.capaian ?? 0) >= 100).length;
  const tanpa = semua.filter((r) => r.capaian == null).map((r) => r.ind.nama);

  return (
    <div className="flex flex-col gap-4">
      <KepalaMakro
        judul="Kinerja Makro"
        info={<p className="line-clamp-[8]">{deskripsi}</p>}
        jejak={[{ href: "/dashboard-pemdi/makro", label: "Kinerja Makro" }]}
        tahun={tahun}
        onTahun={setTahun}
        angka={[
          {
            nilai: dinilai.length ? `${capai}/${semua.length}` : "–",
            label: "capai target",
            info: dinilai.length ? (
              <>
                <p className="font-medium">Realisasi {tahun} memenuhi target RPJMD (capaian ≥100%)</p>
                {tanpa.length ? <p className="text-muted-foreground">Belum dapat dihitung: {tanpa.join(", ")}.</p> : null}
              </>
            ) : (
              `Target RPJMD 2025–2029 dimulai 2025; tahun ${tahun} tanpa target.`
            ),
          },
          { nilai: data.indikator.length, label: "indikator" },
          { nilai: data.sumber.length, label: "sumber", info: "Publikasi BPS, RPJMD, dan dokumen OPD; daftarnya di bagian bawah halaman." },
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {semua.map((r) => (
            <KartuMakro key={r.ind.slug} r={r} data={data} />
          ))}
        </div>
      ) : (
        <Laporan data={data} tahun={tahun} />
      )}

      <SumberData data={data} judul="Sumber data makro" />
    </div>
  );
}

/* ----------------------------------------------------------------- Laporan */

type BarisLaporan = {
  ind: IndikatorMakro;
  lalu?: NilaiMakro;
  kini?: NilaiMakro;
  target?: NilaiMakro;
  terakhir?: NilaiMakro;
  laju: number | null;
  baik: boolean | null;
  capaian: number | null;
  kategori: Kategori | null;
};

function barisLaporan(data: DataMakro, tahun: number): BarisLaporan[] {
  return data.indikator.map((ind) => {
    const cari = (th: number, jenis: "realisasi" | "target") => data.nilai.find((n) => n.indikator === ind.slug && n.wilayah === "tubaba" && n.komponen === null && n.jenis === jenis && n.tahun === th);
    const kini = cari(tahun, "realisasi");
    const lalu = cari(tahun - 1, "realisasi");
    const target = cari(tahun, "target");
    const l = kini && lalu ? laju(kini.nilai, lalu.nilai) : null;
    const cap = kini && target ? capaian(kini.nilai, target.nilai, ind.polaritas) : null;
    return { ind, kini, lalu, target, terakhir: ringkas(data, ind, tahun).realisasi, laju: l, baik: l == null ? null : lajuBaik(l, ind.polaritas), capaian: cap, kategori: cap == null ? null : kategori(cap) };
  });
}


function Kosong({ b, tahun }: { b: BarisLaporan; tahun: number }) {
  return (
    <Tip
      isi={
        <>
          <p className="font-medium">Realisasi {tahun} belum tersedia</p>
          <p className="text-muted-foreground">
            {b.terakhir ? `Terakhir: ${fmtNilai(b.terakhir.nilai, b.terakhir.satuan, b.ind.slug)} (${b.terakhir.tahun}).` : ""}
            {b.ind.slug === "gini" ? " BPS tidak menerbitkan Gini kabupaten; angka daerah dari RPJMD." : ""}
          </p>
        </>
      }
    >
      <span className="cursor-help text-muted-foreground">n/a</span>
    </Tip>
  );
}

function Sumber({ data, n }: { data: DataMakro; n?: NilaiMakro }) {
  const s = cariSumber(data, n?.sumber);
  if (!s || !n) return null;
  return (
    <>
      <SumberChip s={s} halaman={n.halaman} className="print:hidden" />
      <span className="hidden text-[10px] print:inline">{labelSumber(s, n.halaman)}</span>
    </>
  );
}

function Laporan({ data, tahun }: { data: DataMakro; tahun: number }) {
  const rows = barisLaporan(data, tahun);
  const [narasi, setNarasi] = React.useState<Record<string, { teks?: string; galat?: string; muat?: boolean }>>({});
  const judulCetak = `Capaian Indikator Kinerja Makro Kabupaten Tulang Bawang Barat Tahun ${tahun}`;

  const keExcel = async () => {
    const v = (n?: NilaiMakro) => (n ? n.nilai : "");
    const sumber = (...ns: (NilaiMakro | undefined)[]) =>
      ns
        .filter((n): n is NilaiMakro => !!n)
        .map((n) => {
          const s = cariSumber(data, n.sumber);
          return s ? labelSumber(s, n.halaman) : n.sumber;
        })
        .filter((x, i, a) => a.indexOf(x) === i)
        .join("; ");
    const lppd = [
      [judulCetak],
      [],
      ["No", "Indikator Kinerja Makro", "Satuan", `Tahun ${tahun - 1}`, `Tahun ${tahun}`, "Laju Kinerja (%)", "Sumber"],
      ...rows.map((b, i) => [i + 1, b.ind.namaLppd, b.ind.satuan, v(b.lalu), v(b.kini), b.laju == null ? "" : Number(b.laju.toFixed(2)), sumber(b.lalu, b.kini)]),
    ];
    const evaluasi = [
      [`Evaluasi Capaian Indikator Kinerja Makro terhadap RPJMD 2025–2029, Tahun ${tahun}`],
      [],
      ["No", "Indikator", "Satuan", `Target ${tahun}`, `Realisasi ${tahun}`, "Capaian (%)", "Kategori", "Sumber"],
      ...rows.map((b, i) => [i + 1, b.ind.nama, b.ind.satuan, v(b.target), v(b.kini), b.capaian == null ? "" : Number(b.capaian.toFixed(2)), b.kategori ?? "", sumber(b.target, b.kini)]),
      [],
      ["Kategori: " + PITA_KATEGORI],
    ];
    const nilai = [
      ["Indikator", "Komponen", "Wilayah", "Tahun", "Jenis", "Nilai", "Satuan", "Sumber", "Halaman PDF", "Lokasi", "Kutipan", "Catatan", "Tautan"],
      ...data.nilai.map((n) => {
        const s = cariSumber(data, n.sumber);
        return [n.indikator, n.komponen ?? "", n.wilayah, n.tahun, n.jenis, n.nilai, n.satuan, s?.judul ?? n.sumber, n.halaman ?? "", n.lokasi, n.kutipan, n.catatan ?? "", s ? urlPenuh(hrefHalaman(s, n.halaman)) : ""];
      }),
    ];
    const sumberSheet = [["Judul", "Penerbit", "Tahun terbit", "Jenis", "Tautan"], ...data.sumber.map((s) => [s.judul, s.penerbit, s.tahunTerbit ?? "", s.jenis, urlPenuh(s.href)])];
    await unduhExcel(`kinerja-makro-tubaba-${tahun}.xlsx`, [
      { nama: "LPPD", baris: lppd, lebar: [4, 48, 10, 14, 14, 16, 60] },
      { nama: "Evaluasi RPJMD", baris: evaluasi, lebar: [4, 40, 10, 14, 14, 12, 14, 60] },
      { nama: "Nilai & kutipan", baris: nilai },
      { nama: "Sumber", baris: sumberSheet, lebar: [70, 40, 12, 10, 70] },
    ]);
  };

  const minta = async (b: BarisLaporan) => {
    const slug = b.ind.slug;
    setNarasi((x) => ({ ...x, [slug]: { muat: true } }));
    try {
      const res = await fetch("/api/makro/narasi", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ indikator: slug, tahun }) });
      const j = (await res.json()) as { narasi?: string; error?: string };
      setNarasi((x) => ({ ...x, [slug]: res.ok ? { teks: j.narasi } : { galat: j.error ?? `Gagal (${res.status})` } }));
    } catch (e) {
      setNarasi((x) => ({ ...x, [slug]: { galat: String(e) } }));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <KepalaCetak judul={judulCetak} sub="Sumber: BPS dan RPJMD Kabupaten Tulang Bawang Barat 2025–2029 (diolah Pemdi-AI); angka belum diverifikasi manual." />

      <AlatLaporan onExcel={keExcel} info="Excel memuat tabel LPPD, Evaluasi RPJMD, seluruh nilai beserta kutipan dan halaman sumbernya, dan daftar sumber. Cetak menyiapkan tata letak A4 mendatar dengan daftar sumber." />

      <Panel
        className="break-inside-avoid print:border-0 print:shadow-none"
        judul={`Tabel LPPD · Capaian Indikator Kinerja Makro ${tahun}`}
        info={
          <>
            <p className="font-medium">Format LPPD (Kemendagri)</p>
            <p className="text-muted-foreground">{RUMUS_LAJU}. Untuk indikator yang menurun (TPT, kemiskinan, Gini), laju negatif berarti membaik.</p>
          </>
        }
        bodyClassName="overflow-x-auto"
      >
        <table className="w-full min-w-[52rem] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={cn(kepala, "w-8")}>No</th>
              <th className={kepala}>Indikator Kinerja Makro</th>
              <th className={kepala}>Satuan</th>
              <th className={cn(kepala, "text-right")}>Tahun {tahun - 1}</th>
              <th className={cn(kepala, "text-right")}>Tahun {tahun}</th>
              <th className={cn(kepala, "text-right")}>Laju Kinerja (%)</th>
              <th className={kepala}>Sumber</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr key={b.ind.slug}>
                <td className={cn(sel, "tabular-nums text-muted-foreground")}>{i + 1}</td>
                <td className={sel}>
                  <Link href={b.ind.jalur} className="font-medium hover:underline">
                    {b.ind.namaLppd}
                  </Link>
                </td>
                <td className={cn(sel, "text-muted-foreground")}>{b.ind.satuan}</td>
                <td className={cn(sel, "text-right")}>{b.lalu ? <NilaiTip n={b.lalu} data={data} /> : <span className="text-muted-foreground">–</span>}</td>
                <td className={cn(sel, "text-right font-medium")}>{b.kini ? <NilaiTip n={b.kini} data={data} /> : <Kosong b={b} tahun={tahun} />}</td>
                <td className={cn(sel, "text-right font-semibold tabular-nums")} style={{ color: b.baik == null ? undefined : b.baik ? "var(--status-good)" : "var(--status-serious)" }}>
                  {fmtLaju(b.laju)}
                </td>
                <td className={sel}>
                  <div className="flex w-64 flex-col items-start gap-1">
                    <Sumber data={data} n={b.kini ?? b.lalu} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel
        className="break-inside-avoid print:border-0 print:shadow-none"
        judul={`Evaluasi RPJMD · Target dan Realisasi ${tahun}`}
        info={
          <>
            <p className="font-medium">Format evaluasi LKjIP / RPJMD</p>
            <p className="text-muted-foreground">{rumusCapaian("naik")}</p>
            <p className="text-muted-foreground">{rumusCapaian("turun")}</p>
            <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{PITA_KATEGORI}</p>
          </>
        }
        bodyClassName="overflow-x-auto"
      >
        {rows.some((b) => b.target) ? null : <p className="mb-2 text-xs text-muted-foreground">Target RPJMD 2025–2029 dimulai tahun 2025; tahun {tahun} tanpa target.</p>}
        <table className="w-full min-w-[56rem] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={cn(kepala, "w-8")}>No</th>
              <th className={kepala}>Indikator</th>
              <th className={kepala}>Satuan</th>
              <th className={cn(kepala, "text-right")}>Target {tahun}</th>
              <th className={cn(kepala, "text-right")}>Realisasi {tahun}</th>
              <th className={cn(kepala, "text-right")}>Capaian (%)</th>
              <th className={kepala}>Kategori</th>
              <th className={kepala}>Sumber</th>
              <th className={cn(kepala, "print:hidden")}>
                <span className="sr-only">Narasi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => {
              const nr = narasi[b.ind.slug];
              return (
                <React.Fragment key={b.ind.slug}>
                  <tr>
                    <td className={cn(sel, "tabular-nums text-muted-foreground")}>{i + 1}</td>
                    <td className={sel}>
                      <Link href={b.ind.jalur} className="font-medium hover:underline">
                        {b.ind.nama}
                      </Link>
                    </td>
                    <td className={cn(sel, "text-muted-foreground")}>{b.ind.satuan}</td>
                    <td className={cn(sel, "text-right")}>{b.target ? <NilaiTip n={b.target} data={data} /> : <span className="text-muted-foreground">–</span>}</td>
                    <td className={cn(sel, "text-right font-medium")}>{b.kini ? <NilaiTip n={b.kini} data={data} /> : <Kosong b={b} tahun={tahun} />}</td>
                    <td className={cn(sel, "text-right font-semibold tabular-nums")}>{fmtPersen(b.capaian)}</td>
                    <td className={sel}>
                      <KategoriChip r={b} />
                    </td>
                    <td className={sel}>
                      <div className="flex w-64 flex-col items-start gap-1">
                        <Sumber data={data} n={b.kini} />
                        <Sumber data={data} n={b.target} />
                      </div>
                    </td>
                    <td className={cn(sel, "print:hidden")}>
                      <Tip isi="Susun paragraf narasi gaya LPPD dari angka dan sumber di baris ini (AI). Periksa sebelum dipakai.">
                        <button type="button" onClick={() => minta(b)} disabled={nr?.muat} className={cn(tombol, "h-7 px-2")}>
                          <Sparkles className="size-3.5" style={{ color: WARNA_MAKRO }} /> {nr?.muat ? "Menyusun…" : "Narasi"}
                        </button>
                      </Tip>
                    </td>
                  </tr>
                  {nr?.teks || nr?.galat ? (
                    <tr>
                      <td />
                      <td colSpan={8} className="border-b border-border/60 px-2.5 pb-3 pt-1">
                        <div className={cn("rounded-xl px-3 py-2 text-[13px] leading-6", nr.galat ? "bg-[color-mix(in_oklab,var(--status-serious)_10%,transparent)] text-[var(--status-serious)]" : "bg-muted/60")}>
                          {nr.galat ?? nr.teks}
                          {nr.teks ? <p className="mt-1 text-[10.5px] text-muted-foreground">Draf AI · periksa angka dan sumbernya sebelum dipakai.</p> : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {(["Sangat Tinggi", "Tinggi", "Sedang", "Rendah", "Sangat Rendah"] as const).map((k, i) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: warnaKategori(k) }} />
              {k} <span className="tabular-nums opacity-70">{["≥91", "76–90", "66–75", "51–65", "≤50"][i]}</span>
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}
