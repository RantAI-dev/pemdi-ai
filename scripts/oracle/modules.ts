/**
 * The functions the oracle can run: the OLD TypeScript implementation is the specification for
 * the Rust port (docs/port/README.md). One entry per ported module; each maps a function name to a
 * call taking JSON arguments and returning a JSON value.
 */
import { capaian, kategori, laju, lajuBaik } from "../../src/lib/makro-hitung";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type Call = (args: Json[]) => Json;

const num = (v: Json | undefined): number => (typeof v === "number" ? v : Number.NaN);
const pol = (v: Json | undefined): "naik" | "turun" => (v === "turun" ? "turun" : "naik");

export const MODULES: Record<string, Record<string, Call>> = {
  "makro-hitung": {
    laju: (a) => laju(num(a[0]), num(a[1])),
    lajuBaik: (a) => lajuBaik(num(a[0]), pol(a[1])),
    capaian: (a) => capaian(num(a[0]), num(a[1]), pol(a[2])),
    kategori: (a) => kategori(num(a[0])),
  },
};
