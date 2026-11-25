import { ASPEK, INDIKATOR } from "@/data/pemdi";
import { hitungKebutuhan } from "@/lib/kebutuhan";
import { llmConfigured } from "@/lib/llm";
import { Kebutuhan, type Butir } from "./kebutuhan";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; aspek?: string }> }) {
  const [sp, semua] = await Promise.all([searchParams, hitungKebutuhan()]);
  // Plain rows only: the catalogue's RegExp and survey codes stay on the server.
  const butir: Butir[] = semua.map((k) => ({
    id: k.id,
    nama: k.nama,
    indikator: k.indikator,
    aspek: INDIKATOR.find((i) => i.no === k.indikator)!.aspek,
    pemilik: k.pemilik,
    tingkat: k.tingkat,
    lingkup: k.lingkup,
    status: k.status,
    survei: Boolean(k.kode?.length),
    nBukti: k.bukti.length,
    bukti: k.bukti.slice(0, 30),
    diminta: k.diminta.length,
    belum: k.belum,
  }));
  return (
    <Kebutuhan
      butir={butir}
      aspek={ASPEK.map((a) => ({ no: a.no, nama: a.nama }))}
      indikator={INDIKATOR.map((i) => ({ no: i.no, aspek: i.aspek, nama: i.nama, bobot: i.bobot }))}
      llm={llmConfigured()}
      awalStatus={sp.status ?? ""}
      awalAspek={sp.aspek ?? ""}
    />
  );
}
