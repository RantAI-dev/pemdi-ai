import { notFound } from "next/navigation";
import { KerangkaTampilan } from "@/components/kerangka";
import { MakroHalaman } from "@/components/makro-halaman";
import { getKerangka } from "@/data/kerangka";
import { muatKerangka } from "@/lib/kerangka-data";
import { muatMakro } from "@/lib/makro";
import { TAHUN_PILIHAN } from "@/lib/makro-tampil";
import { SpmHalaman } from "@/components/spm-halaman";
import { ProsnHalaman } from "@/components/prosn-halaman";
import { muatSpm } from "@/lib/spm";
import { muatProsn } from "@/lib/prosn";
import { TAMPIL_PROSN } from "@/lib/fitur";
import { TAHUN_SPM } from "@/lib/spm-tampil";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string; tahun?: string }> }) {
  const { slug } = await params;
  // Dukungan PROSN is hidden for now (src/lib/fitur.ts).
  if (slug === "prosn" && !TAMPIL_PROSN) notFound();
  // Kinerja Makro has numbers of its own (BPS + RPJMD), so it gets a dedicated page instead of the generic tree.
  if (slug === "makro") {
    const [data, sp] = await Promise.all([muatMakro(), searchParams]);
    const tahun = Number(sp.tahun);
    return (
      <MakroHalaman
        data={data}
        tabAwal={sp.tab === "laporan" ? "laporan" : "ringkasan"}
        tahunAwal={TAHUN_PILIHAN.includes(tahun) ? tahun : data.tahunUtama}
        deskripsi={getKerangka("makro")?.deskripsi ?? ""}
      />
    );
  }
  // Capaian SPM and Dukungan PROSN likewise have their own numbers (RKPD tables; evidence-based assessment).
  if (slug === "spm") {
    const [data, sp] = await Promise.all([muatSpm(), searchParams]);
    const tahun = Number(sp.tahun);
    return (
      <SpmHalaman
        data={data}
        tabAwal={sp.tab === "laporan" ? "laporan" : "ringkasan"}
        tahunAwal={TAHUN_SPM.includes(tahun) ? tahun : data.tahunUtama}
        deskripsi={getKerangka("spm")?.deskripsi ?? ""}
      />
    );
  }
  if (slug === "prosn") {
    const [data, sp] = await Promise.all([muatProsn(), searchParams]);
    const kerangka = getKerangka("prosn");
    // Kelompok listed in the source without any indicator (F) are shown as such, not hidden.
    const kosong = (kerangka?.anak ?? [])
      .filter((k) => !data.indikator.some((i) => i.kelompok === k.id))
      .map((k) => ({ id: k.id, kode: k.kode ?? "", judul: k.judul, penjelasan: k.penjelasan ?? "" }));
    return <ProsnHalaman data={data} tabAwal={sp.tab === "laporan" ? "laporan" : "ringkasan"} deskripsi={kerangka?.deskripsi ?? ""} kosong={kosong} />;
  }
  const data = await muatKerangka(slug, []);
  if (!data) notFound();
  return <KerangkaTampilan data={data} />;
}
