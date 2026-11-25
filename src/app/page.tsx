import { DasborPemdi } from "@/app/dashboard-pemdi/dasbor-pemdi";
import { muatDasborPemdi } from "@/lib/dasbor-pemdi";
import { muatMakro } from "@/lib/makro";
import { muatProsn } from "@/lib/prosn";
import { TAMPIL_PROSN } from "@/lib/fitur";
import { muatSpm } from "@/lib/spm";

export const dynamic = "force-dynamic";

/** Beranda: the four frameworks side by side. */
export default async function Page() {
  const [data, makro, spm, prosn] = await Promise.all([muatDasborPemdi(), muatMakro(), muatSpm(), TAMPIL_PROSN ? muatProsn() : null]);
  return <DasborPemdi data={data} makro={makro} spm={spm} prosn={prosn} />;
}
