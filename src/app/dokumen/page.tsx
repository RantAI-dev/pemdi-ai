import { KEBUTUHAN } from "@/data/kebutuhan";
import { getOpd } from "@/lib/data";
import { Dokumen } from "./dokumen";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string; dok?: string }> }) {
  const [{ f, dok }, opd] = await Promise.all([searchParams, getOpd()]);
  return (
    <div className="flex flex-col gap-4">
      <Dokumen opd={opd.map((o) => o.opd)} kebutuhan={Object.fromEntries(KEBUTUHAN.map((k) => [k.id, k.nama]))} awal={f ?? "semua"} awalDok={dok ?? null} />
    </div>
  );
}
