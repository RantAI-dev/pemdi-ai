"use client";

/**
 * The Indeks Pemdi pages (/indeks, /indikator, /temuan) in the Dashboard Pemdi
 * idiom: a number, a name, a chart. Explanations live in the (i) tooltips.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUpRight, Check, ChevronDown, Download, RotateCcw, Search, X } from "lucide-react";
import { AiBadge, Notice } from "@/components/ui";
import { InfoTip, Meter, Panel, PetaPanas, Tip } from "@/components/viz";
import { DaftarBatang, Lintasan, Sementara, SkalaPredikat } from "@/components/viz-indeks";
import { nilaiTampil } from "@/lib/nilai-tampil";
import { hitungIndeks, predikat, type Aspek } from "@/data/pemdi";
import { cn, fmtDec, fmtInt, fmtPct } from "@/lib/utils";

type Status = "terpenuhi" | "sebagian" | "perlu_dicek" | "belum_ada";

export type DasborData = {
  llm: boolean;
  lakehouse: boolean;
  aspek: Aspek[];
  indikator: { no: number; aspek: number; nama: string; bobot: number; nilai: number | null; penilai: "AI" | "Manual" | null; penjelasan: string; jawaban: number }[];
  temuan: { indikator: number; tingkat: number; pernyataan: string; kutipan: string; opd: string; nama: string; id: string }[];
  kebutuhan: { id: string; indikator: number; nama: string; status: Status; pemilik: string; lingkup: "kabupaten" | "opd"; tingkat: number; diminta: string[]; belum: string[]; opdBukti: string[]; berkas: number }[];
  dok: { id: string; opd: string; jenis: string; metode: string; terbaca: boolean; ai: "selesai" | "gagal" | null; jenisDokumen: string }[];
  metrik: { nama: string; nilai: string; satuan: string; periode: string; indikator: number | null; opd: string; berkas: string }[];
  opd: { opd: string; status: string; pertanyaan: number; terjawab: number }[];
};

export type Tab = "ringkasan" | "indikator" | "temuan";

const WARNA = "var(--viz-pemdi)";
const pendek = (s: string) => s.replace("Tingkat Kematangan ", "").replace(" Layanan Digital Pemerintah", "");
const pendekAspek = (s: string) => s.replace(/ Layanan Digital Pemerintah$/, "");
const tombol = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium hover:bg-muted";

const JUDUL: Record<Tab, { judul: string; info: string }> = {
  ringkasan: {
    judul: "Indeks Pemdi",
    info: "7 aspek dan 20 indikator Permen PANRB 8/2026, skala 1–5. Angka di sini dihasilkan dari dokumen OPD yang dibaca AI, bukan hasil evaluasi resmi.",
  },
  indikator: { judul: "Aspek & Indikator", info: "Nilai tiap indikator beserta dasar penilaiannya. Klik baris untuk melihat rinciannya." },
  temuan: { judul: "Temuan Dokumen", info: "Fakta kondisi saat ini yang diekstrak AI dari dokumen OPD, per indikator, tingkat kematangan, dan OPD, beserta angka yang dilaporkan dokumennya." },
};

const STATUS: { key: Status; nama: string; warna: string }[] = [
  { key: "belum_ada", nama: "Belum ada", warna: "var(--status-serious)" },
  { key: "sebagian", nama: "Sebagian", warna: "var(--status-warning)" },
  { key: "perlu_dicek", nama: "Perlu dicek", warna: "var(--viz-ref)" },
  { key: "terpenuhi", nama: "Terpenuhi", warna: "var(--status-good)" },
];

const Judul = ({ children }: { children: React.ReactNode }) => <p className="font-medium text-foreground">{children}</p>;
const Baris = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <p className="flex justify-between gap-4">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium tabular-nums">{v}</span>
  </p>
);
const Tautan = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium hover:bg-muted" style={{ color: WARNA }}>
    {children} <ArrowUpRight className="size-3.5" />
  </Link>
);
const Kosong = ({ children }: { children: React.ReactNode }) => <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;

/** A dropdown filter pill. */
function Pilih({ label, value, options, onChange, search }: { label: string; value: string; options: { value: string; label: string; hint?: string }[]; onChange: (v: string) => void; search?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const current = options.find((o) => o.value === value);
  const shown = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex max-w-64 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
          value ? "border-primary/30 bg-primary/10 text-foreground" : "border-dashed border-border text-muted-foreground hover:bg-muted",
        )}
      >
        <span className="font-medium">{label}</span>
        {current && value ? <span className="truncate opacity-80">= {current.label}</span> : null}
        <ChevronDown className="size-3 shrink-0" />
      </button>
      {value ? (
        <button type="button" aria-label={`Hapus filter ${label}`} onClick={() => onChange("")} className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground">
          <X className="size-2.5" />
        </button>
      ) : null}
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-border bg-card p-1 shadow-xl">
          {search ? (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" className="mb-1 h-8 w-full rounded-md border border-input bg-muted/40 px-2 text-sm outline-none focus:border-ring" />
          ) : null}
          <ul className="max-h-72 overflow-y-auto">
            {shown.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value === value ? "" : o.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Check className={cn("size-3.5 shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint ? <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{o.hint}</span> : null}
                </button>
              </li>
            ))}
            {shown.length === 0 ? <li className="px-2 py-3 text-center text-xs text-muted-foreground">Tidak ada.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** One finding: the statement, its quote on hover, and where it came from. */
function KartuTemuan({ t, onIndikator, onOpd }: { t: DasborData["temuan"][number]; onIndikator?: () => void; onOpd?: () => void }) {
  const meta = "shrink-0 whitespace-nowrap rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground";
  return (
    <li className="py-2.5">
      <Tip className="block" isi={t.kutipan ? <p className="italic">“{t.kutipan}”</p> : null}>
        <p className="line-clamp-2 text-[13px] leading-5">{t.pernyataan}</p>
      </Tip>
      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
        {onIndikator ? (
          <button type="button" onClick={onIndikator} className={cn(meta, "hover:text-foreground")}>
            Ind. {t.indikator}
          </button>
        ) : (
          <span className={meta}>Ind. {t.indikator}</span>
        )}
        <span className={meta}>Tk. {t.tingkat}</span>
        <Tip className="min-w-0" isi={t.nama}>
          {onOpd ? (
            <button type="button" onClick={onOpd} className="truncate hover:text-foreground">
              {t.opd}
            </button>
          ) : (
            <span className="truncate">{t.opd}</span>
          )}
        </Tip>
      </p>
    </li>
  );
}

type Sort = { key: "no" | "bobot" | "temuan" | "butuh" | "nilai" | "hilang"; dir: 1 | -1 };

export function Dasbor({ data, tab, awal }: { data: DasborData; tab: Tab; awal?: { aspek?: number; opd?: string; indikator?: number } }) {
  const router = useRouter();
  const [aspek, setAspek] = React.useState(awal?.aspek ? String(awal.aspek) : "");
  const [opd, setOpd] = React.useState(awal?.opd ?? "");
  const [indikator, setIndikator] = React.useState(awal?.indikator ? String(awal.indikator) : "");
  const [tingkat, setTingkat] = React.useState("");
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<Sort>({ key: "no", dir: 1 });
  const aktif = [aspek, opd, indikator, tingkat, q].filter(Boolean).length;
  const reset = () => {
    setAspek("");
    setOpd("");
    setIndikator("");
    setTingkat("");
    setQ("");
  };

  const aspekOf = React.useMemo(() => new Map(data.indikator.map((i) => [i.no, i.aspek])), [data.indikator]);
  const cari = q.trim().toLowerCase();

  // One predicate per record kind; filters narrow every panel of the tab.
  const okInd = (no: number) => (!aspek || aspekOf.get(no) === Number(aspek)) && (!indikator || no === Number(indikator));
  const temuan = data.temuan.filter(
    (t) => okInd(t.indikator) && (!opd || t.opd === opd) && (!tingkat || t.tingkat === Number(tingkat)) && (!cari || `${t.pernyataan} ${t.kutipan} ${t.opd} ${t.nama}`.toLowerCase().includes(cari)),
  );
  const metrik = data.metrik.filter((m) => (!opd || m.opd === opd) && (m.indikator == null ? !aspek && !indikator : okInd(m.indikator)) && (!cari || `${m.nama} ${m.opd}`.toLowerCase().includes(cari)));

  // The index is a kabupaten-level number, whatever the filters.
  const hasil = hitungIndeks(data.indikator.filter((i) => i.nilai != null).map((i) => ({ indikator: i.no, nilai: i.nilai! })));
  const utama = nilaiTampil(hasil.indeks, hasil.sementara);
  const aspekTampil = hasil.aspek.map((a) => ({ ...a, ...nilaiTampil(a.indeks, a.sementara) }));
  const adaAi = data.indikator.some((i) => i.penilai === "AI");

  const perInd = data.indikator.map((i) => {
    const butuh = data.kebutuhan.filter((k) => k.indikator === i.no);
    return {
      ...i,
      temuan: data.temuan.filter((t) => t.indikator === i.no).length,
      butuh: butuh.length,
      terpenuhi: butuh.filter((k) => k.status === "terpenuhi").length,
      // Index points this indicator still leaves on the table: weight x distance to the top of the scale.
      hilang: i.nilai == null ? null : i.bobot * (5 - i.nilai),
    };
  });

  function unduh() {
    const rows = [["no", "indikator", "aspek", "bobot", "nilai", "predikat", "penilai", "temuan", "kebutuhan_terpenuhi", "kebutuhan_total"]];
    for (const i of perInd) rows.push([i.no, i.nama, i.aspek, i.bobot, i.nilai ?? "", i.nilai == null ? "" : predikat(i.nilai).nama, i.penilai ?? "", i.temuan, i.terpenuhi, i.butuh].map(String));
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "indeks-pemdi-tbb.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <p className="text-xs text-muted-foreground">Kab. Tulang Bawang Barat</p>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-semibold tracking-[-0.03em]">{JUDUL[tab].judul}</h1>
            <InfoTip isi={JUDUL[tab].info} />
          </div>
        </div>
        <div className="flex items-end gap-6 sm:gap-8">
          <dl className="flex gap-6 sm:gap-8">
            {(
              [
                [`${hasil.terisi}/${hasil.jumlah}`, "indikator dinilai"],
                [fmtInt(tab === "temuan" ? temuan.length : data.temuan.length), "temuan"],
                ...(tab === "temuan" ? ([[fmtInt(metrik.length), "angka"]] as const) : []),
              ] as const
            ).map(([n, l]) => (
              <div key={l} className="text-right">
                <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{n}</dd>
                <dt className="text-[11px] text-muted-foreground">{l}</dt>
              </div>
            ))}
          </dl>
          <button type="button" onClick={unduh} className={tombol}>
            <Download className="size-3.5" /> CSV
          </button>
        </div>
      </header>

      {!data.lakehouse ? <Notice tone="warning">Lakehouse belum dapat dibaca. Jalankan <code>scripts/lakehouse.sh up</code> lalu <code>bun run seed</code>.</Notice> : null}
      {!data.llm ? <Notice tone="warning"><span className="font-medium">AI belum aktif.</span> Temuan dan nilai indikator belum dapat dihasilkan.</Notice> : null}

      {tab !== "ringkasan" ? (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <Pilih label="Aspek" value={aspek} onChange={(v) => (setAspek(v), setIndikator(""))} options={data.aspek.map((a) => ({ value: String(a.no), label: `${a.no}. ${pendekAspek(a.nama)}`, hint: fmtPct(a.bobot) }))} />
          <Pilih
            label="Indikator"
            value={indikator}
            onChange={setIndikator}
            search
            options={data.indikator.filter((i) => !aspek || i.aspek === Number(aspek)).map((i) => ({ value: String(i.no), label: `${i.no}. ${pendek(i.nama)}`, hint: i.nilai == null ? "–" : fmtDec(i.nilai) }))}
          />
          {tab === "temuan" ? (
            <>
              <Pilih label="OPD" value={opd} onChange={setOpd} search options={[...new Set(data.temuan.map((t) => t.opd))].sort().map((o) => ({ value: o, label: o, hint: String(data.temuan.filter((t) => t.opd === o).length) }))} />
              <Pilih label="Tingkat" value={tingkat} onChange={setTingkat} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `Tingkat ${n}`, hint: String(data.temuan.filter((t) => t.tingkat === n).length) }))} />
            </>
          ) : null}
          <label className="relative ml-auto min-w-44 flex-1 sm:max-w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1.5 size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari" className="h-7 w-full rounded-full border border-input bg-muted/40 pl-8 pr-2 text-xs outline-none focus:border-ring" />
          </label>
          {aktif ? (
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              <RotateCcw className="size-3" /> Reset ({aktif})
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === "ringkasan" ? <Ringkasan data={data} hasil={hasil} utama={utama} aspekTampil={aspekTampil} perInd={perInd} adaAi={adaAi} onPilih={(href) => router.push(href)} /> : null}
      {tab === "indikator" ? (
        <TabIndikator data={data} perInd={perInd.filter((i) => (!aspek || i.aspek === Number(aspek)) && (!cari || i.nama.toLowerCase().includes(cari)))} indikator={indikator} setIndikator={setIndikator} sort={sort} setSort={setSort} aspekTampil={aspekTampil} />
      ) : null}
      {tab === "temuan" ? <TabTemuan data={data} temuan={temuan} metrik={metrik} opd={opd} setOpd={setOpd} setIndikator={setIndikator} /> : null}
    </div>
  );
}

type Hasil = ReturnType<typeof hitungIndeks>;
type AspekTampil = Hasil["aspek"][number] & { nilai: number | null; tentatif: boolean };
type PerInd = DasborData["indikator"][number] & { temuan: number; butuh: number; terpenuhi: number; hilang: number | null };

/* ---------------------------------------------------------------- Ringkasan */

function Ringkasan({
  data,
  hasil,
  utama,
  aspekTampil,
  perInd,
  adaAi,
  onPilih,
}: {
  data: DasborData;
  hasil: Hasil;
  utama: { nilai: number | null; tentatif: boolean };
  aspekTampil: AspekTampil[];
  perInd: PerInd[];
  adaAi: boolean;
  onPilih: (href: string) => void;
}) {
  const pred = utama.nilai == null ? null : predikat(utama.nilai);
  const poin = perInd.filter((i) => i.hilang != null).sort((a, b) => b.hilang! - a.hilang!);
  const kurang = data.kebutuhan.filter((k) => k.status !== "terpenuhi");
  const perStatus = STATUS.map((s) => ({ ...s, n: data.kebutuhan.filter((k) => k.status === s.key).length }));
  const total = data.kebutuhan.length;
  const teratas = [...data.temuan].sort((a, b) => b.tingkat - a.tingkat).slice(0, 3);

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-12">
        <Panel
          className="lg:col-span-4"
          judul="Indeks Pemdi"
          info={`Skala 1–5, tingkat kabupaten. ${hasil.terisi} dari ${hasil.jumlah} indikator sudah dinilai.${adaAi ? " Sebagian nilai masih estimasi AI." : ""}`}
          aksi={adaAi ? <AiBadge>Estimasi AI</AiBadge> : null}
          bodyClassName="flex flex-col justify-center gap-6"
        >
          <div className="pt-2">
            <Meter nilai={utama.nilai} warna={WARNA} label={pred ? `${pred.nama} · ${pred.label.split(" / ")[0]}` : "belum dinilai"} ukuran={220} />
            {utama.tentatif ? (
              <div className="mt-2 flex justify-center">
                <Sementara terisi={hasil.terisi} jumlah={hasil.jumlah} />
              </div>
            ) : null}
          </div>
          <SkalaPredikat nilai={utama.nilai} warna={WARNA} />
        </Panel>

        <Panel className="lg:col-span-8" judul="Indeks per aspek" info="Skala 1–5. Arahkan kursor untuk bobot dan sumbangannya ke indeks; klik untuk melihat indikatornya." aksi={<Tautan href="/indikator">Indikator</Tautan>}>
          <DaftarBatang
            skala
            warna={WARNA}
            lebarNama="13rem"
            onPilih={(b) => onPilih(`/indikator?aspek=${b.kunci}`)}
            data={aspekTampil.map((a) => ({
              kunci: a.no,
              nama: `${a.no}. ${pendekAspek(a.nama)}`,
              nilai: a.nilai,
              tip: (
                <>
                  <Judul>{a.nama}</Judul>
                  <div className="mt-1 min-w-48">
                    <Baris k="Indeks" v={a.nilai == null ? "belum dinilai" : `${fmtDec(a.nilai)} · ${predikat(a.nilai).nama}`} />
                    <Baris k="Bobot" v={fmtPct(a.bobot)} />
                    <Baris k="Sumbangan ke indeks" v={a.nilai == null ? "–" : fmtDec(a.bobot * a.nilai, 3)} />
                    <Baris k="Indikator dinilai" v={`${a.terisi}/${a.jumlah}`} />
                  </div>
                  {a.tentatif ? <p className="mt-1 border-t border-border pt-1 text-muted-foreground">Nilai sementara, belum semua indikatornya dinilai.</p> : null}
                </>
              ),
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <Panel
          className="lg:col-span-7"
          judul="Poin yang bisa diraih"
          info="Bobot indikator × jaraknya ke nilai 5. Makin panjang batangnya, makin besar kenaikan indeks bila indikator itu diperbaiki. Klik untuk melihat indikatornya."
        >
          {poin.length ? (
            <DaftarBatang
              warna={WARNA}
              lebarNama="15rem"
              onPilih={(b) => onPilih(`/indikator?indikator=${b.kunci}`)}
              data={poin.slice(0, 12).map((i) => ({
                kunci: i.no,
                nama: `${i.no}. ${pendek(i.nama)}`,
                nilai: i.hilang,
                teks: fmtDec(i.hilang),
                tip: (
                  <>
                    <Judul>{i.nama}</Judul>
                    <div className="mt-1 min-w-48">
                      <Baris k="Poin yang bisa diraih" v={fmtDec(i.hilang, 3)} />
                      <Baris k="Nilai kini" v={fmtDec(i.nilai)} />
                      <Baris k="Bobot" v={fmtPct(i.bobot)} />
                    </div>
                  </>
                ),
              }))}
            />
          ) : (
            <Kosong>Belum ada indikator yang dinilai.</Kosong>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-3 lg:col-span-5">
          <Panel judul="Data yang masih kurang" info="Butir kebutuhan data yang belum terpenuhi. Rinciannya di halaman Kebutuhan Data." aksi={<Tautan href="/kebutuhan">Kebutuhan</Tautan>}>
            <Link href="/kebutuhan" className="group block">
              <div className="flex items-baseline gap-1.5">
                <p className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">{fmtInt(kurang.length)}</p>
                <p className="text-xs text-muted-foreground">dari {fmtInt(total)} butir data</p>
              </div>
              <div className="mt-3 grid h-2 gap-0.5 overflow-hidden rounded-full" style={{ gridTemplateColumns: perStatus.filter((s) => s.n).map((s) => `${s.n}fr`).join(" ") }}>
                {perStatus
                  .filter((s) => s.n)
                  .map((s) => (
                    <Tip key={s.key} isi={`${s.nama}: ${fmtInt(s.n)} butir`} className="block h-full">
                      <span className="block h-full w-full" style={{ background: s.warna }} />
                    </Tip>
                  ))}
              </div>
            </Link>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {perStatus.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: s.warna }} />
                  {s.nama} <span className="font-medium tabular-nums text-foreground">{fmtInt(s.n)}</span>
                </span>
              ))}
            </div>
          </Panel>

          <Panel className="flex-1" judul="Temuan dokumen" info="Fakta kondisi saat ini yang diekstrak AI dari dokumen OPD; yang mendukung tingkat kematangan tertinggi di atas. Arahkan kursor untuk kutipannya." aksi={<Tautan href="/temuan">Semua</Tautan>}>
            {teratas.length ? (
              <ul className="-my-1 divide-y divide-border/60">
                {teratas.map((t, i) => (
                  <KartuTemuan key={i} t={t} />
                ))}
              </ul>
            ) : (
              <Kosong>Belum ada temuan.</Kosong>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Indikator */

function TabIndikator({
  data,
  perInd,
  indikator,
  setIndikator,
  sort,
  setSort,
  aspekTampil,
}: {
  data: DasborData;
  perInd: PerInd[];
  indikator: string;
  setIndikator: (v: string) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
  aspekTampil: AspekTampil[];
}) {
  const urut = [...perInd].sort((a, b) => {
    const v = (x: PerInd) => (sort.key === "butuh" ? (x.butuh ? x.terpenuhi / x.butuh : 0) : ((x[sort.key] as number | null) ?? -1));
    return (v(a) - v(b)) * sort.dir || a.no - b.no;
  });
  // Grouped under their aspect only in the natural order; any other sort is one flat list.
  const kelompok = sort.key === "no";
  const fokus = data.indikator.some((x) => x.no === Number(indikator)) ? (perInd.find((x) => x.no === Number(indikator)) ?? null) : null;

  const Th = ({ k, children, className }: { k: Sort["key"]; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-2 py-2 font-medium", className)}>
      <button type="button" onClick={() => setSort({ key: k, dir: sort.key === k ? (sort.dir === 1 ? -1 : 1) : k === "no" ? 1 : -1 })} className={cn("inline-flex items-center gap-1 hover:text-foreground", sort.key === k && "text-foreground")}>
        {children} <ArrowUpDown className="size-3 opacity-60" />
      </button>
    </th>
  );

  const baris = (i: PerInd) => (
    <tr
      key={i.no}
      onClick={() => setIndikator(indikator === String(i.no) ? "" : String(i.no))}
      className={cn("cursor-pointer border-t border-border/40 transition-colors hover:bg-muted/40", indikator === String(i.no) && "bg-[color-mix(in_oklab,var(--viz-pemdi)_10%,transparent)]")}
    >
      <td className="py-2 pl-4 pr-2 tabular-nums text-muted-foreground">{i.no}</td>
      <td className="px-2 py-2 text-[13px] leading-5">{pendek(i.nama)}</td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{fmtPct(i.bobot)}</td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{i.temuan || "–"}</td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
        {i.terpenuhi}/{i.butuh}
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{i.hilang == null ? "–" : fmtDec(i.hilang)}</td>
      <td className="py-2 pl-2 pr-4">
        <span className="flex items-center gap-2">
          <Lintasan nilai={i.nilai} warna={WARNA} className="w-24 shrink-0" />
          <span className="w-9 text-right text-[13px] font-semibold tabular-nums">{i.nilai == null ? "–" : fmtDec(i.nilai)}</span>
        </span>
      </td>
    </tr>
  );

  return (
    <div className="grid items-start gap-3 lg:grid-cols-12">
      <Panel
        className="lg:col-span-8"
        judul="Nilai per indikator"
        info="Skala 1–5; garis pada batang adalah batas predikat. Poin = bobot × jarak ke nilai 5. Klik judul kolom untuk mengurutkan, klik baris untuk rinciannya."
        bodyClassName="px-0 pb-1"
      >
        {urut.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground">
                  <Th k="no" className="pl-4">
                    No
                  </Th>
                  <th className="px-2 py-2 font-medium">Indikator</th>
                  <Th k="bobot" className="text-right">
                    Bobot
                  </Th>
                  <Th k="temuan" className="text-right">
                    Temuan
                  </Th>
                  <Th k="butuh" className="text-right">
                    Data
                  </Th>
                  <Th k="hilang" className="text-right">
                    Poin
                  </Th>
                  <Th k="nilai" className="pr-4 text-right">
                    Nilai
                  </Th>
                </tr>
              </thead>
              <tbody>
                {kelompok
                  ? aspekTampil
                      .filter((a) => urut.some((i) => i.aspek === a.no))
                      .map((a) => (
                        <React.Fragment key={a.no}>
                          <tr className="border-t border-border/60 bg-muted/40 text-[11px]">
                            <td colSpan={6} className="py-1.5 pl-4 pr-2 font-medium">
                              {a.no}. {pendekAspek(a.nama)} <span className="font-normal text-muted-foreground">· bobot {fmtPct(a.bobot)}</span>
                            </td>
                            <td className="py-1.5 pl-2 pr-4 text-right">
                              <span className="inline-flex items-center gap-1.5">
                                {a.tentatif ? <Sementara terisi={a.terisi} jumlah={a.jumlah} /> : null}
                                <span className="text-[13px] font-semibold tabular-nums">{a.nilai == null ? "–" : fmtDec(a.nilai)}</span>
                              </span>
                            </td>
                          </tr>
                          {urut.filter((i) => i.aspek === a.no).map(baris)}
                        </React.Fragment>
                      ))
                  : urut.map(baris)}
              </tbody>
            </table>
          </div>
        ) : (
          <Kosong>Tidak ada indikator untuk filter ini.</Kosong>
        )}
      </Panel>

      <div className="lg:sticky lg:top-32 lg:col-span-4">
        {fokus ? (
          <Panel
            judul={`Indikator ${fokus.no}`}
            info={fokus.nama}
            aksi={
              <button type="button" aria-label="Tutup" onClick={() => setIndikator("")} className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-3.5" />
              </button>
            }
          >
            <p className="text-sm font-medium leading-5">{pendek(fokus.nama)}</p>
            <div className="mt-3">
              <Meter nilai={fokus.nilai} warna={WARNA} label={fokus.nilai == null ? "belum dinilai" : predikat(fokus.nilai).nama} ukuran={180} />
            </div>
            <div className="mt-2 flex justify-center gap-1.5">{fokus.penilai === "AI" ? <AiBadge>Estimasi AI</AiBadge> : fokus.penilai ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Manual</span> : null}</div>
            <div className="mt-3 grid grid-cols-4 gap-2 border-y border-border/60 py-2.5 text-center">
              {(
                [
                  [fmtPct(fokus.bobot), "bobot"],
                  [fmtInt(fokus.temuan), "temuan"],
                  [`${fokus.terpenuhi}/${fokus.butuh}`, "data"],
                  [fmtInt(fokus.jawaban), "survei"],
                ] as const
              ).map(([n, l]) => (
                <div key={l}>
                  <p className="text-base font-semibold tabular-nums">{n}</p>
                  <p className="text-[10px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            {fokus.penjelasan ? (
              <div className="mt-3">
                <p className="text-[11px] font-medium text-muted-foreground">Dasar penilaian</p>
                <p className="mt-1 max-h-56 overflow-auto whitespace-pre-line text-xs leading-5 text-muted-foreground">{fokus.penjelasan}</p>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/penilaian?i=${fokus.no}`} className={tombol}>
                Penilaian <ArrowUpRight className="size-3.5" />
              </Link>
              <Link href={`/temuan?indikator=${fokus.no}`} className={tombol}>
                Temuan <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </Panel>
        ) : (
          <Panel judul="Sebaran predikat" info="Banyaknya indikator di tiap predikat Tabel 4. Pilih baris di tabel untuk melihat satu indikator.">
            <DaftarBatang
              warna={WARNA}
              lebarNama="6.5rem"
              data={["Kurang", "Cukup", "Baik", "Sangat Baik", "Memuaskan", "Belum dinilai"]
                .map((nama) => ({ kunci: nama, nama, nilai: perInd.filter((i) => (i.nilai == null ? "Belum dinilai" : predikat(i.nilai).nama) === nama).length }))
                .filter((r) => r.nilai || r.nama !== "Belum dinilai")
                .map((r) => ({ ...r, teks: fmtInt(r.nilai) }))}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Temuan */

function TabTemuan({
  data,
  temuan,
  metrik,
  opd,
  setOpd,
  setIndikator,
}: {
  data: DasborData;
  temuan: DasborData["temuan"];
  metrik: DasborData["metrik"];
  opd: string;
  setOpd: (v: string) => void;
  setIndikator: (v: string) => void;
}) {
  const baris = data.indikator.filter((i) => temuan.some((t) => t.indikator === i.no));
  const hitung = (no: number, lv: number) => temuan.filter((t) => t.indikator === no && t.tingkat === lv).length;
  const perOpd = [...temuan.reduce((m, t) => m.set(t.opd, (m.get(t.opd) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const urut = [...temuan].sort((a, b) => b.tingkat - a.tingkat).slice(0, 80);

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-7" judul="Per indikator dan tingkat" info="Jumlah temuan menurut tingkat kematangan yang didukungnya. Makin pekat, makin banyak.">
          {baris.length ? (
            <PetaPanas
              baris={baris.map((i) => ({ nama: `${i.no}. ${pendek(i.nama)}`, info: i.nama }))}
              kolom={[1, 2, 3, 4, 5].map((n) => ({ nama: `Tk. ${n}`, warna: WARNA }))}
              nilai={(b, k) => hitung(baris[b].no, k + 1)}
              tip={(b, k) => (
                <>
                  <Judul>{pendek(baris[b].nama)}</Judul>
                  <p className="text-muted-foreground">
                    {hitung(baris[b].no, k + 1) || "Tidak ada"} temuan tingkat {k + 1}
                  </p>
                </>
              )}
            />
          ) : (
            <Kosong>Tidak ada temuan untuk filter ini.</Kosong>
          )}
        </Panel>
        <Panel className="lg:col-span-5" judul="Per OPD" info="15 OPD dengan temuan terbanyak. Klik batang untuk menyaring ke OPD itu.">
          {perOpd.length ? (
            <DaftarBatang
              warna={WARNA}
              lebarNama="14rem"
              onPilih={(b) => setOpd(opd === b.nama ? "" : b.nama)}
              data={perOpd.slice(0, 15).map(([nama, v]) => ({ kunci: nama, nama, nilai: v, teks: fmtInt(v), aktif: opd ? nama === opd : undefined, tip: nama.length > 34 ? nama : undefined }))}
            />
          ) : (
            <Kosong>Tidak ada.</Kosong>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-7" judul="Temuan" info="Diurutkan dari tingkat kematangan tertinggi; 80 pertama. Arahkan kursor untuk kutipan dokumennya." bodyClassName="pb-2">
          {urut.length ? (
            <ul className="-my-1 max-h-[32rem] divide-y divide-border/60 overflow-auto pr-1">
              {urut.map((t, i) => (
                <KartuTemuan key={i} t={t} onIndikator={() => setIndikator(String(t.indikator))} onOpd={() => setOpd(t.opd)} />
              ))}
            </ul>
          ) : (
            <Kosong>Tidak ada temuan untuk filter ini.</Kosong>
          )}
        </Panel>
        <Panel className="lg:col-span-5" judul="Angka dari dokumen" info="Angka yang diekstrak AI; satuan dan periode mengikuti dokumennya. Arahkan kursor untuk nama berkasnya." bodyClassName="px-0 pb-2">
          {metrik.length ? (
            <ul className="max-h-[32rem] divide-y divide-border/60 overflow-auto px-4">
              {metrik.slice(0, 200).map((m, i) => (
                <li key={i}>
                  <Tip
                    className="flex w-full items-baseline gap-3 py-2"
                    isi={
                      <>
                        <Judul>{m.nama}</Judul>
                        <p className="text-muted-foreground">
                          {m.opd}
                          {m.periode ? ` · ${m.periode}` : ""}
                        </p>
                        <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{m.berkas}</p>
                      </>
                    }
                  >
                    <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-5">{m.nama}</span>
                    <span className="shrink-0 text-right text-[13px] font-semibold tabular-nums">
                      {m.nilai} <span className="text-[11px] font-normal text-muted-foreground">{m.satuan}</span>
                    </span>
                  </Tip>
                </li>
              ))}
            </ul>
          ) : (
            <Kosong>Tidak ada angka untuk filter ini.</Kosong>
          )}
        </Panel>
      </div>
    </>
  );
}
