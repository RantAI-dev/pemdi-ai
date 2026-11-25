import { ASPEK, INDIKATOR, KRITERIA, PREDIKAT } from "@/data/pemdi";
import { Penilaian } from "./penilaian";

export default async function Page({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  const awal = INDIKATOR.some((x) => x.no === Number(i)) ? Number(i) : 1;
  return (
    <div className="flex flex-col gap-4">
      <Penilaian awal={awal} aspek={ASPEK} indikator={INDIKATOR} kriteria={KRITERIA} predikat={PREDIKAT} />
    </div>
  );
}
