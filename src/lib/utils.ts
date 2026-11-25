import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nf = new Intl.NumberFormat("id-ID");

export function fmtInt(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? "–" : nf.format(n);
}

export function fmtDec(n: number | null | undefined, digits = 2): string {
  return n == null || Number.isNaN(n)
    ? "–"
    : n.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(n: number | null | undefined, digits = 0): string {
  return n == null || Number.isNaN(n) ? "–" : `${fmtDec(n * 100, digits)}%`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
