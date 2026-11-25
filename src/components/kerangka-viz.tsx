"use client";

/** The two charts of a framework level, as client components so their tooltips can be functions. */
import { useRouter } from "next/navigation";
import { BatangH } from "@/components/viz";
import { fmtDec } from "@/lib/utils";

export type BarisGrafik = { nama: string; judul: string; nilai: number | null; catatan: string; href: string };

export function GrafikTingkat({ data, warna, satuan, max }: { data: BarisGrafik[]; warna: string; satuan: "persen" | "skor"; max?: number }) {
  const router = useRouter();
  return (
    <BatangH
      data={data.map((d) => ({ ...d, v: d.nilai ?? 0 }))}
      seri={[{ key: "v", nama: satuan === "persen" ? "Bobot" : "Nilai", warna }]}
      lebarLabel={260}
      tinggiBaris={data.length > 12 ? 28 : 34}
      domain={max ? [0, max] : undefined}
      onPilih={(r) => router.push(r.href)}
      tip={(r) => (
        <>
          <p className="font-medium">{r.judul}</p>
          <p className="mt-1 flex justify-between gap-4">
            <span className="text-muted-foreground">{satuan === "persen" ? "Bobot" : "Nilai"}</span>
            <span className="font-medium tabular-nums">{r.nilai == null ? "belum dinilai" : satuan === "persen" ? `${fmtDec(r.nilai, 1)}%` : fmtDec(r.nilai)}</span>
          </p>
          {r.catatan ? <p className="text-muted-foreground">{r.catatan}</p> : null}
        </>
      )}
    />
  );
}
