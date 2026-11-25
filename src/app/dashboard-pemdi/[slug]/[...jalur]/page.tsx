import { notFound } from "next/navigation";
import { KerangkaTampilan } from "@/components/kerangka";
import { MakroDetail } from "@/components/makro-detail";
import { getKerangka } from "@/data/kerangka";
import { muatKerangka } from "@/lib/kerangka-data";
import { muatMakro } from "@/lib/makro";
import { TAHUN_PILIHAN } from "@/lib/makro-tampil";
import { SpmBidang, SpmLayanan } from "@/components/spm-detail";
import { ProsnIndikatorDetail, ProsnLingkup } from "@/components/prosn-detail";
import { muatSpm } from "@/lib/spm";
import { muatProsn } from "@/lib/prosn";
import { TAMPIL_PROSN } from "@/lib/fitur";
import { TAHUN_SPM } from "@/lib/spm-tampil";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string; jalur: string[] }>; searchParams: Promise<{ tahun?: string }> }) {
  const { slug, jalur } = await params;
  // Dukungan PROSN is hidden for now (src/lib/fitur.ts).
  if (slug === "prosn" && !TAMPIL_PROSN) notFound();
  // A Kinerja Makro indicator has its own page with numbers; deeper levels (IPM components) keep the generic tree.
  if (slug === "makro" && jalur.length === 1) {
    const data = await muatMakro();
    const ind = data.indikator.find((i) => i.jalur === `/dashboard-pemdi/makro/${jalur[0]}`);
    if (ind) {
      const kerangka = getKerangka("makro");
      const node = kerangka?.anak.find((a) => a.id === jalur[0]);
      const tahun = Number((await searchParams).tahun);
      return (
        <MakroDetail
          data={data}
          slug={ind.slug}
          tahunAwal={TAHUN_PILIHAN.includes(tahun) ? tahun : data.tahunUtama}
          node={node && kerangka ? { judul: node.judul, penjelasan: node.penjelasan ?? "", opd: node.opd ?? [], dasar: kerangka.dasar } : null}
        />
      );
    }
  }
  // Capaian SPM: a bidang (or its kabupaten branch) and a kabupaten service get pages with numbers.
  // Provincial branches and services stay on the generic tree, as a reference.
  if (slug === "spm" && jalur.length <= 3) {
    const kerangka = getKerangka("spm");
    const bidangNode = kerangka?.anak.find((a) => a.id === jalur[0]);
    const cabang = bidangNode?.anak?.find((c) => c.id === jalur[1]);
    if (kerangka && bidangNode && (jalur.length === 1 || (cabang && cabang.id !== "provinsi"))) {
      const [data, sp] = await Promise.all([muatSpm(), searchParams]);
      const tahun = Number(sp.tahun);
      const tahunAwal = TAHUN_SPM.includes(tahun) ? tahun : data.tahunUtama;
      if (jalur.length <= 2) return <SpmBidang data={data} bidangId={bidangNode.id} tahunAwal={tahunAwal} node={{ penjelasan: bidangNode.penjelasan ?? "", dasar: kerangka.dasar }} />;
      const layanan = data.layanan.find((l) => l.jalur === `/dashboard-pemdi/spm/${jalur.join("/")}`);
      const daun = cabang?.anak?.find((d) => d.id === jalur[2]);
      if (layanan && daun) return <SpmLayanan data={data} layanan={layanan} tahunAwal={tahunAwal} node={{ penjelasan: daun.penjelasan ?? "", dasar: kerangka.dasar }} />;
    }
  }
  // Dukungan PROSN: kelompok and program pages roll the scores up; an indicator shows its assessment and evidence.
  if (slug === "prosn" && jalur.length <= 3) {
    const data = await muatProsn();
    const id = jalur.join("/");
    const ind = jalur.length === 3 ? data.indikator.find((i) => i.id === id) : undefined;
    if (ind) return <ProsnIndikatorDetail data={data} indikatorId={ind.id} />;
    if (jalur.length < 3 && data.indikator.some((i) => i.kelompok === jalur[0] && (jalur.length === 1 || i.program === jalur[1]))) {
      return <ProsnLingkup data={data} kelompok={jalur[0]} program={jalur[1]} />;
    }
  }
  const data = await muatKerangka(slug, jalur);
  if (!data || !data.ketemu) notFound();
  return <KerangkaTampilan data={data} />;
}
