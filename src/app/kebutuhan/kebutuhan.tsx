"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, FileText, RotateCcw } from "lucide-react";
import { BatangH, Panel, Tip } from "@/components/viz";
import { BilahBagian, Cari, Chip, KepalaHalaman, Pil, Pilihan, WARNA_STATUS } from "@/components/viz-bukti";
import type { BuktiKebutuhan, StatusKebutuhan as Status } from "@/lib/kebutuhan";
import { cn, fmtInt, fmtPct } from "@/lib/utils";

export type Butir = {
  id: string;
  nama: string;
  indikator: number;
  aspek: number;
  pemilik: string;
  tingkat: number;
  lingkup: "kabupaten" | "opd";
  status: Status;
  /** Asked for through a survey question. */
  survei: boolean;
  nBukti: number;
  bukti: BuktiKebutuhan[];
  /** OPD scope: how many OPDs were asked, and which of them have no file yet. */
  diminta: number;
  belum: string[];
};

const STATUS: { key: Status; label: string; arti: string }[] = [
  { key: "belum_ada", label: "Belum ada", arti: "Tidak ada berkas yang cocok. Perlu diminta ke pemiliknya." },
  { key: "sebagian", label: "Sebagian", arti: "Sudah diserahkan sebagian OPD; sisanya masih berutang." },
  { key: "perlu_dicek", label: "Perlu dicek", arti: "Ada berkas yang tampaknya cocok, tetapi belum dibaca AI atau tak terbaca." },
  { key: "terpenuhi", label: "Terpenuhi", arti: "Berkasnya ada dan sudah dibaca." },
];
const LABEL = Object.fromEntries(STATUS.map((s) => [s.key, s.label])) as Record<Status, string>;
/** Short aspect names for chart labels and selects. */
const ASPEK_PENDEK: Record<number, string> = { 1: "Tata Kelola", 2: "Penyelenggara", 3: "Data", 4: "Keamanan", 5: "Teknologi", 6: "Keterpaduan", 7: "Kepuasan" };
const pendek = (s: string) => s.replace(/^Tingkat (Kematangan|Pengelolaan) /, "").replace(/ Layanan Digital Pemerintah/, "");
const BARIS_AWAL = 12;

const Baris = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <p className="flex justify-between gap-4">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium tabular-nums">{v}</span>
  </p>
);

export function Kebutuhan({
  butir,
  aspek,
  indikator,
  llm,
  awalStatus,
  awalAspek,
}: {
  butir: Butir[];
  aspek: { no: number; nama: string }[];
  indikator: { no: number; aspek: number; nama: string; bobot: number }[];
  llm: boolean;
  awalStatus: string;
  awalAspek: string;
}) {
  const [status, setStatus] = React.useState<Status | "">(STATUS.some((s) => s.key === awalStatus) ? (awalStatus as Status) : "");
  const [asp, setAsp] = React.useState(aspek.some((a) => String(a.no) === awalAspek) ? awalAspek : "");
  const [ind, setInd] = React.useState("");
  const [opd, setOpd] = React.useState("");
  const [cari, setCari] = React.useState("");
  const [semua, setSemua] = React.useState(false);
  const [buka, setBuka] = React.useState<string | null>(null);

  const n = (s: Status, rows = butir) => rows.filter((k) => k.status === s).length;
  const daftarOpd = React.useMemo(() => [...new Set(butir.flatMap((k) => k.pemilik.split(/,\s*/)))].sort((a, b) => a.localeCompare(b)), [butir]);
  const q = cari.trim().toLowerCase();
  // Every filter but status, so the status pills keep counting within the other filters.
  const dasar = butir.filter(
    (k) =>
      (!asp || String(k.aspek) === asp) &&
      (!ind || String(k.indikator) === ind) &&
      (!opd || k.pemilik.split(/,\s*/).includes(opd) || k.belum.includes(opd)) &&
      (!q || `${k.id} ${k.nama} ${k.pemilik}`.toLowerCase().includes(q)),
  );
  const tampil = dasar.filter((k) => !status || k.status === status);
  const terlihat = semua ? tampil : tampil.slice(0, BARIS_AWAL);
  const adaFilter = Boolean(status || asp || ind || opd || q);
  const reset = () => {
    setStatus("");
    setAsp("");
    setInd("");
    setOpd("");
    setCari("");
  };

  // Who owes the most: OPDs over the per-OPD items they were asked for and have not supplied.
  const utang = new Map<string, number>();
  for (const k of butir) for (const o of k.belum) utang.set(o, (utang.get(o) ?? 0) + 1);
  const perOpd = [...utang].sort((a, b) => b[1] - a[1]).slice(0, 7);
  // Who is named owner of the items still missing.
  const pemilikKurang = new Map<string, number>();
  for (const k of butir) if (k.status === "belum_ada") for (const o of k.pemilik.split(/,\s*/)) pemilikKurang.set(o, (pemilikKurang.get(o) ?? 0) + 1);
  const perPemilik = [...pemilikKurang].sort((a, b) => b[1] - a[1]).slice(0, 7);

  const perAspek = aspek.map((a) => {
    const rows = butir.filter((k) => k.aspek === a.no);
    return { nama: `${a.no}. ${ASPEK_PENDEK[a.no] ?? a.nama}`, no: a.no, judul: a.nama, total: rows.length, ...Object.fromEntries(STATUS.map((s) => [s.key, n(s.key, rows)])) } as {
      nama: string;
      no: number;
      judul: string;
      total: number;
    } & Record<Status, number>;
  });

  return (
    <div className="flex flex-col gap-4">
      <KepalaHalaman
        judul="Kebutuhan Data"
        info={
          <>
            Dokumen dan data yang harus ada untuk menilai tiap indikator Pemdi. Daftarnya tafsir Pemdi-AI atas kriteria Permen PANRB 8/2026.
            {!llm ? <span className="mt-1 block border-t border-border pt-1">AI belum aktif: kecocokan berkas ditebak dari pertanyaan survei dan kata kunci, ditandai “terdeteksi”.</span> : null}
          </>
        }
        angka={[
          [fmtInt(butir.length), "butir"],
          [fmtPct(n("terpenuhi") / Math.max(1, butir.length)), "terpenuhi"],
          [fmtInt(butir.reduce((s, k) => s + k.nBukti, 0)), "berkas cocok"],
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <Panel judul="Status" info="Klik bagian untuk menyaring daftar." className="lg:col-span-4">
          <div className="flex items-baseline gap-1.5">
            <p className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">{fmtInt(n("terpenuhi"))}</p>
            <p className="text-xs text-muted-foreground">dari {fmtInt(butir.length)} terpenuhi</p>
          </div>
          <div className="mt-4">
            <BilahBagian
              bagian={[...STATUS].reverse().map((s) => ({ key: s.key, nama: s.label, nilai: n(s.key), warna: WARNA_STATUS[s.key], info: s.arti }))}
              pilih={status || null}
              onPilih={(k) => setStatus((k as Status) ?? "")}
            />
          </div>
        </Panel>

        <Panel judul="Per aspek" info="Butir kebutuhan tiap aspek menurut status. Klik batang untuk menyaring." className="lg:col-span-5">
          <BatangH
            data={perAspek}
            seri={[...STATUS].reverse().map((s) => ({ key: s.key, nama: s.label, warna: WARNA_STATUS[s.key] }))}
            tinggiBaris={28}
            lebarLabel={140}
            onPilih={(r) => setAsp(String(r.no))}
            tip={(r) => (
              <>
                <p className="font-medium">{r.judul}</p>
                <div className="mt-1 min-w-40">
                  {[...STATUS].reverse().map((s) => (
                    <Baris key={s.key} k={s.label} v={r[s.key]} />
                  ))}
                </div>
              </>
            )}
          />
        </Panel>

        <Panel
          judul={perOpd.length ? "OPD belum menyerahkan" : "Pemilik butir kosong"}
          info={perOpd.length ? "Butir yang diminta lewat survei dan belum ada berkasnya, 7 OPD terbanyak." : "Berapa butir “belum ada” yang menjadi tanggung jawab tiap pemilik, 7 terbanyak. Klik batang untuk menyaring."}
          className="lg:col-span-3"
        >
          {(perOpd.length ? perOpd : perPemilik).length ? (
            <BatangH
              data={(perOpd.length ? perOpd : perPemilik).map(([nama, v]) => ({ nama, v }))}
              seri={[{ key: "v", nama: "Butir", warna: WARNA_STATUS.belum_ada }]}
              tinggiBaris={28}
              lebarLabel={140}
              onPilih={(r) => setOpd(r.nama)}
              tip={(r) => (
                <>
                  <p className="font-medium">{r.nama}</p>
                  <p className="text-muted-foreground">{r.v} butir belum ada</p>
                </>
              )}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada.</p>
          )}
        </Panel>
      </div>

      <Panel
        judul="Daftar kebutuhan"
        info="Klik baris untuk melihat berkas yang cocok dan OPD yang belum menyerahkan."
        aksi={
          <span className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">
              {fmtInt(tampil.length)} dari {fmtInt(butir.length)}
            </span>
            <Cari nilai={cari} onUbah={setCari} placeholder="Cari kebutuhan atau pemilik" className="w-60" />
          </span>
        }
        bodyClassName="px-0 pb-1"
      >
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <Pil
            opsi={[{ key: "" as Status | "", label: "Semua", n: dasar.length }, ...STATUS.map((s) => ({ key: s.key as Status | "", label: s.label, n: n(s.key, dasar) }))]}
            nilai={status}
            onUbah={setStatus}
          />
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <Pilihan
              nilai={asp}
              onUbah={(v) => {
                setAsp(v);
                setInd("");
              }}
              semua="Semua aspek"
              opsi={aspek.map((a) => ({ value: String(a.no), label: `${a.no}. ${ASPEK_PENDEK[a.no] ?? a.nama}` }))}
              className="w-36"
            />
            <Pilihan
              nilai={ind}
              onUbah={setInd}
              semua="Semua indikator"
              opsi={indikator.filter((i) => !asp || String(i.aspek) === asp).map((i) => ({ value: String(i.no), label: `${i.no}. ${pendek(i.nama)}` }))}
              className="w-40"
            />
            <Pilihan nilai={opd} onUbah={setOpd} semua="Semua OPD" opsi={daftarOpd.map((o) => ({ value: o, label: o }))} className="w-36" />
            {adaFilter ? (
              <button type="button" onClick={reset} aria-label="Hapus filter" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <RotateCcw className="size-3.5" />
              </button>
            ) : null}
          </span>
        </div>

        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-14" />
            <col />
            <col className="w-[22%]" />
            <col className="w-[15%]" />
            <col className="w-16" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-9" />
          </colgroup>
          <thead>
            <tr className="border-y border-border/70 bg-muted/30 text-left text-[11px] text-muted-foreground">
              <th className="py-2 pl-4">ID</th>
              <th className="px-2 py-2">Kebutuhan</th>
              <th className="px-2 py-2">Indikator</th>
              <th className="px-2 py-2">Penanggung jawab</th>
              <th className="px-2 py-2 text-right">Tingkat</th>
              <th className="px-2 py-2 text-right">Berkas</th>
              <th className="px-2 py-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {terlihat.map((k) => {
              const i = indikator.find((x) => x.no === k.indikator)!;
              const open = buka === k.id;
              return (
                <React.Fragment key={k.id}>
                  <tr onClick={() => setBuka(open ? null : k.id)} className={cn("cursor-pointer border-b border-border/50 hover:bg-muted/40", open && "bg-muted/40")}>
                    <td className="py-2 pl-4 font-mono text-[11px] text-muted-foreground">{k.id}</td>
                    <td className="px-2 py-2">
                      <p className="line-clamp-2 text-[13px] leading-5">{k.nama}</p>
                    </td>
                    <td className="px-2 py-2">
                      <Tip isi={`${i.no}. ${i.nama} · bobot ${fmtPct(i.bobot)}`} className="max-w-full">
                        <span className="truncate text-muted-foreground">
                          <span className="tabular-nums text-foreground">{i.no}</span> {pendek(i.nama)}
                        </span>
                      </Tip>
                    </td>
                    <td className="truncate px-2 py-2 text-muted-foreground" title={k.pemilik}>
                      {k.pemilik}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{k.tingkat}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {k.lingkup === "opd" && k.diminta ? (
                        <Tip isi={`${k.diminta - k.belum.length} dari ${k.diminta} OPD yang diminta sudah menyerahkan`}>
                          <span>
                            {k.diminta - k.belum.length}/{k.diminta} OPD
                          </span>
                        </Tip>
                      ) : k.nBukti ? (
                        fmtInt(k.nBukti)
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Chip warna={WARNA_STATUS[k.status]}>{LABEL[k.status]}</Chip>
                    </td>
                    <td className="pr-3 text-right">
                      <ChevronDown className={cn("inline size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-b border-border/50 bg-muted/20">
                      <td />
                      <td colSpan={7} className="px-2 py-3">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="mb-1 text-[11px] font-medium text-muted-foreground">Berkas yang cocok</p>
                            {k.bukti.length === 0 ? (
                              <p className="text-muted-foreground">{k.survei ? "Sudah diminta lewat survei, belum ada yang menyerahkan." : "Belum pernah diminta lewat survei."}</p>
                            ) : (
                              <ul className="space-y-1">
                                {k.bukti.map((b) => (
                                  <li key={b.id}>
                                    <Link href={`/dokumen?dok=${b.id}`} className="flex items-start gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted">
                                      <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                      <span className="min-w-0 flex-1">
                                        <span className="break-all">{b.nama}</span> <span className="text-muted-foreground">· {b.opd}</span>
                                      </span>
                                      <Chip warna={b.dasar === "ai" ? "var(--viz-pemdi)" : undefined}>{b.dasar === "ai" ? "Dibaca AI" : b.terbaca ? "Terdeteksi" : "Tak terbaca"}</Chip>
                                    </Link>
                                  </li>
                                ))}
                                {k.nBukti > k.bukti.length ? <li className="pl-6 text-muted-foreground">+{k.nBukti - k.bukti.length} lainnya</li> : null}
                              </ul>
                            )}
                          </div>
                          {k.lingkup === "opd" ? (
                            <div>
                              <p className="mb-1 text-[11px] font-medium text-muted-foreground">Belum menyerahkan ({k.belum.length})</p>
                              {k.belum.length ? (
                                <ul className="flex flex-wrap gap-1">
                                  {k.belum.map((o) => (
                                    <li key={o}>
                                      <Chip warna={WARNA_STATUS.belum_ada}>{o}</Chip>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-muted-foreground">{k.diminta ? "Semua OPD yang diminta sudah menyerahkan." : "Belum diminta lewat survei."}</p>
                              )}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <p className="mb-1 text-[11px] font-medium">Cakupan</p>
                              <p>Satu dokumen untuk seluruh pemerintah daerah · diperlukan mulai tingkat {k.tingkat}.</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
            {tampil.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada butir untuk filter ini.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {tampil.length > BARIS_AWAL ? (
          <button type="button" onClick={() => setSemua(!semua)} className="mx-auto mt-1 flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            {semua ? "Ringkas" : `Tampilkan semua (${fmtInt(tampil.length)})`}
            <ChevronDown className={cn("size-3.5 transition-transform", semua && "rotate-180")} />
          </button>
        ) : null}
      </Panel>
    </div>
  );
}
