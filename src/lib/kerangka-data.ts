/** Everything one framework page needs: the node at the requested path, the Pemdi scores, and the evidence. */
import { getKerangka } from "@/data/kerangka";
import { hitungIndeks } from "@/data/pemdi";
import { bukaJalur, type Kerangka, type KerangkaNode } from "./kerangka";
import { dokumenPerIndikator, type DokBukti } from "./kerangka-dokumen";
import { readPenilaian } from "./penilaian";

export type DataKerangka = {
  kerangka: Kerangka;
  jejak: KerangkaNode[];
  node: KerangkaNode | null;
  /** False when a segment of the requested path does not exist. */
  ketemu: boolean;
  hasil: ReturnType<typeof hitungIndeks>;
  nilai: Map<number, number>;
  bukti: Map<number, DokBukti[]>;
};

export async function muatKerangka(slug: string, jalur: string[]): Promise<DataKerangka | null> {
  const kerangka = getKerangka(slug);
  if (!kerangka) return null;
  const { jejak, node, ketemu } = bukaJalur(kerangka.anak, jalur);
  const [penilaian, bukti] = await Promise.all([readPenilaian(), dokumenPerIndikator()]);
  return {
    kerangka,
    jejak,
    node,
    ketemu,
    hasil: hitungIndeks(penilaian.map((p) => ({ indikator: p.indikator_no, nilai: p.nilai }))),
    nilai: new Map(penilaian.map((p) => [p.indikator_no, p.nilai])),
    bukti,
  };
}
