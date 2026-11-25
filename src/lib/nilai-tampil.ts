/** A score to show: the final one when complete, otherwise the provisional one (re-weighted over what is scored). */
export function nilaiTampil(indeks: number | null, sementara: number | null | undefined): { nilai: number | null; tentatif: boolean } {
  if (indeks != null) return { nilai: indeks, tentatif: false };
  return { nilai: sementara ?? null, tentatif: sementara != null };
}
