import { Dasbor } from "@/app/dasbor";
import { muatDasbor } from "@/lib/dasbor-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <Dasbor data={await muatDasbor()} tab="ringkasan" />;
}
