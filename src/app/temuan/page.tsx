import { Dasbor } from "@/app/dasbor";
import { muatDasbor } from "@/lib/dasbor-data";

export const dynamic = "force-dynamic";

const angka = (v: string | undefined) => {
  const n = Number(v);
  return v && Number.isInteger(n) && n > 0 ? n : undefined;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ aspek?: string; opd?: string; indikator?: string }> }) {
  const sp = await searchParams;
  return <Dasbor data={await muatDasbor()} tab="temuan" awal={{ aspek: angka(sp.aspek), opd: sp.opd, indikator: angka(sp.indikator) }} />;
}
