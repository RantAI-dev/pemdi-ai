import { getOpd, getTemaPerOpd } from "@/lib/data";
import { readDok } from "@/lib/store";
import { OpdTampilan } from "./opd-tampilan";
import { susunOpd } from "./susun";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [opd, tema, dok] = await Promise.all([getOpd(), getTemaPerOpd(), readDok()]);
  return (
    <OpdTampilan
      data={susunOpd(
        opd,
        tema,
        dok.map((d) => ({ jenis: d.jenis, karakter: d.karakter })),
      )}
    />
  );
}
