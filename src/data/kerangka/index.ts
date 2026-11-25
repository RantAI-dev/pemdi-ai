/** The four frameworks the app can show. Adding a fifth is one data file and one entry here. */
import type { Kerangka } from "@/lib/kerangka";
import { TAMPIL_PROSN } from "@/lib/fitur";
import { makro } from "./makro";
import { pemdi } from "./pemdi";
import { prosn } from "./prosn";
import { spm } from "./spm";

// Indeks Pemdi is one framework among four, not the headline, so it comes last.
// PROSN is left out while it is hidden (see src/lib/fitur.ts).
export const KERANGKA: Kerangka[] = TAMPIL_PROSN ? [makro, spm, prosn, pemdi] : [makro, spm, pemdi];

const BY_SLUG = new Map(KERANGKA.map((k) => [k.slug, k]));

export function getKerangka(slug: string): Kerangka | null {
  return BY_SLUG.get(slug) ?? null;
}
