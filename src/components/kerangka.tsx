/**
 * One level of a framework tree: breadcrumb, title (explanation on hover),
 * a row of key numbers, the children to drill into, their charts, the OPDs
 * likely involved and the documents already available.
 *
 * The same component renders the root and every deeper level, so the depth of
 * a framework is only limited by its data file.
 */
import Link from "next/link";
import { ArrowUpRight, ChevronRight, FileText } from "lucide-react";
import { GrafikTingkat } from "@/components/kerangka-viz";
import { InfoTip, Meter, Panel, Tip } from "@/components/viz";
import { Sementara } from "@/components/viz-indeks";
import { predikat } from "@/data/pemdi";
import { perTingkat, TINGKAT_INDIKATOR } from "@/lib/dasbor-pemdi";
import { nilaiTampil } from "@/lib/nilai-tampil";
import type { DataKerangka } from "@/lib/kerangka-data";
import { indikatorDalam, ringkasKerangka, type KerangkaNode } from "@/lib/kerangka";
import type { DokBukti } from "@/lib/kerangka-dokumen";
import { cn, fmtDec, fmtInt, fmtPct } from "@/lib/utils";

/** "PENANGGULANGAN KEMISKINAN" -> "Penanggulangan Kemiskinan"; the PROSN source prints groups in capitals. */
const judulBiasa = (s: string) => (s.length > 4 && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()) : s);
const label = (n: KerangkaNode) => `${n.kode ? `${n.kode}. ` : ""}${judulBiasa(n.judul)}`;
const tombol = "inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium hover:bg-muted";

function nilaiNode(n: KerangkaNode, hasil: DataKerangka["hasil"], nilai: Map<number, number>): number | null {
  if (n.indikator != null) return nilai.get(n.indikator) ?? null;
  if (n.aspek != null) return aspekTampil(hasil, n.aspek)?.nilai ?? null;
  return null;
}

/** An aspect's score, provisional while some of its indicators are unscored. */
function aspekTampil(hasil: DataKerangka["hasil"], no: number) {
  const a = hasil.aspek.find((x) => x.no === no);
  return a ? { ...nilaiTampil(a.indeks, a.sementara), terisi: a.terisi, jumlah: a.jumlah } : null;
}

/** Merge the same document found under several child indicators. */
function gabungDokumen(indikator: number[], bukti: Map<number, DokBukti[]>): DokBukti[] {
  const peta = new Map<string, DokBukti>();
  for (const no of indikator) {
    for (const d of bukti.get(no) ?? []) {
      const ada = peta.get(d.id);
      peta.set(d.id, ada ? { ...ada, temuan: ada.temuan + d.temuan, metrik: ada.metrik + d.metrik, kebutuhan: [...new Set([...ada.kebutuhan, ...d.kebutuhan])] } : { ...d });
    }
  }
  return [...peta.values()].sort((a, b) => b.temuan - a.temuan || a.nama.localeCompare(b.nama));
}

function Angka({ nilai, label, info }: { nilai: React.ReactNode; label: string; info?: React.ReactNode }) {
  const isi = (
    <div className="flex h-full min-w-0 flex-col justify-end rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{nilai}</p>
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
  return info ? (
    <Tip isi={info} className="block h-full">
      {isi}
    </Tip>
  ) : (
    isi
  );
}

export function KerangkaTampilan({ data }: { data: DataKerangka }) {
  const { kerangka, jejak, node, hasil, nilai, bukti } = data;
  const dasar = `/dashboard-pemdi/${kerangka.slug}`;
  const warna = `var(--viz-${kerangka.slug})`;
  const kosong = !node && kerangka.anak.length === 0;
  const anak = node ? (node.anak ?? []) : kerangka.anak;
  const opd = node?.opd ?? [...new Set(kerangka.anak.flatMap((a) => a.opd ?? []))];
  const indikatorNo = node?.indikator;
  const indeksTampil = nilaiTampil(hasil.indeks, hasil.sementara);
  const nilaiKini = node ? nilaiNode(node, hasil, nilai) : kerangka.slug === "pemdi" ? indeksTampil.nilai : null;
  // Provisional (not all indicators below are scored): which count to put on the badge, if any.
  const sementara = node?.indikator != null ? null : node?.aspek != null ? aspekTampil(hasil, node.aspek) : !node ? { ...indeksTampil, terisi: hasil.terisi, jumlah: hasil.jumlah } : null;
  const tampilkanNilai = kerangka.slug === "pemdi" && (!node || node.indikator != null || node.aspek != null);
  const judul = node ? label(node) : kerangka.judul;
  const penjelasan = node?.penjelasan || kerangka.deskripsi;
  const cakupan = indikatorDalam(node ? [node] : kerangka.anak);
  const dokumen = gabungDokumen(cakupan, bukti);
  const nilaiAnak = anak.map((a) => ({ anak: a, nilai: nilaiNode(a, hasil, nilai) }));
  // At the criterion level every child points to the same indicator; one score
  // repeated on five cards would read as five different scores, so it is shown
  // once, in the meter above, instead.
  const indikatorSama = new Set(anak.map((a) => (a.indikator != null ? `i${a.indikator}` : a.aspek != null ? `a${a.aspek}` : `n${a.id}`))).size !== anak.length;
  const grafNilai = nilaiAnak.some((x) => x.nilai != null) && !indikatorSama;
  const ringkas = ringkasKerangka(kerangka);
  const tingkat = TINGKAT_INDIKATOR[kerangka.slug];
  const jumlahIndikator = perTingkat(kerangka)[tingkat?.tingkat ?? 0] ?? 0;

  const hrefAnak = (a: KerangkaNode) => `${dasar}/${[...jejak.map((n) => n.id), a.id].join("/")}`;
  const hrefJejak = (i: number) =>
    `${dasar}/${jejak
      .slice(0, i + 1)
      .map((n) => n.id)
      .join("/")}`;

  const angka: { nilai: React.ReactNode; label: string; info?: string }[] = node
    ? [
        ...(node.bobot != null ? [{ nilai: fmtPct(node.bobot, 1), label: "bobot", info: "Bobot terhadap kelompok induknya" }] : []),
        { nilai: fmtInt(anak.length), label: anak.length ? "butir di bawahnya" : "tingkat terdalam" },
        { nilai: fmtInt(opd.length), label: "OPD terlibat" },
        { nilai: fmtInt(dokumen.length), label: "dokumen pendukung", info: "Dokumen yang sudah dibaca AI dan menyebut indikator di bagian ini" },
      ]
    : [
        { nilai: fmtInt(kerangka.anak.length), label: tingkat?.tingkatNama[0] ?? "kelompok" },
        ...(tingkat && tingkat.tingkat > 0 ? [{ nilai: fmtInt(jumlahIndikator), label: tingkat.satuan }] : []),
        { nilai: fmtInt(ringkas.daun), label: tingkat?.tingkatNama.at(-1) ?? "butir rinci", info: "Jumlah butir di tingkat terdalam" },
        { nilai: fmtInt(opd.length), label: "OPD terlibat" },
      ];

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 px-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Beranda
        </Link>
        <ChevronRight className="size-3.5 opacity-60" />
        <Link href={dasar} className="hover:text-foreground">
          {kerangka.judul}
        </Link>
        {jejak.map((n, i) => (
          <span key={n.id} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0 opacity-60" />
            {i === jejak.length - 1 ? (
              <span className="max-w-72 truncate font-medium text-foreground">{label(n)}</span>
            ) : (
              <Link href={hrefJejak(i)} className="max-w-48 truncate hover:text-foreground">
                {label(n)}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: warna }} />
            <h1 className="text-2xl font-semibold leading-8 tracking-[-0.03em]">{judul}</h1>
          </div>
          {penjelasan ? (
            <Tip isi={<p className="whitespace-pre-line">{penjelasan}</p>} className="mt-1 block pl-3">
              <p className="line-clamp-1 cursor-help text-sm text-muted-foreground">{penjelasan}</p>
            </Tip>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tip isi={kerangka.dasar}>
            <span
              className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium"
              style={{ background: `color-mix(in oklab, ${warna} 12%, transparent)`, color: warna }}
            >
              {kerangka.dasar.split(/\s+—\s+/)[0]}
            </span>
          </Tip>
          {!kosong && kerangka.slug === "pemdi" && !node ? (
            <Link href="/indeks" className={tombol}>
              Dasbor indeks <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null}
          {indikatorNo != null ? (
            <>
              <Link href={`/penilaian?i=${indikatorNo}`} className={tombol}>
                Penilaian <ArrowUpRight className="size-3.5" />
              </Link>
              <Link href={`/temuan?indikator=${indikatorNo}`} className={tombol}>
                Temuan <ArrowUpRight className="size-3.5" />
              </Link>
            </>
          ) : null}
        </div>
      </header>

      {kosong ? (
        <Panel judul="Menunggu dokumen sumber" info={kerangka.deskripsi}>
          <p className="text-sm text-muted-foreground">
            <code>{kerangka.dasar}</code> belum tersedia.
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
            {angka.map((a, i) => (
              <Angka key={i} {...a} />
            ))}
            {tampilkanNilai ? (
              <Tip
                className="col-span-2 block sm:col-span-1"
                isi={
                  <>
                    <p className="font-medium">{indikatorNo != null ? `Nilai indikator ${indikatorNo}` : node?.aspek != null ? `Indeks aspek ${node.aspek}` : "Indeks Pemdi"}</p>
                    <p className="text-muted-foreground">{nilaiKini == null ? "Muncul setelah indikator di bawahnya dinilai." : `${predikat(nilaiKini).nama} · ${predikat(nilaiKini).label}`}. Skala 1–5.</p>
                  </>
                }
              >
                <div className="h-full w-full rounded-2xl border border-border/70 bg-card px-3 pt-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <Meter nilai={nilaiKini} warna={warna} label={nilaiKini == null ? "belum dinilai" : predikat(nilaiKini).nama} ukuran={130} />
                  {sementara?.tentatif ? (
                    <div className="flex justify-center pb-2">
                      <Sementara terisi={sementara.terisi} jumlah={sementara.jumlah} />
                    </div>
                  ) : null}
                </div>
              </Tip>
            ) : null}
          </div>

          {anak.length ? (
            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-1">
                <h2 className="text-sm font-semibold">Isi tingkat ini</h2>
                <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{anak.length}</span>
                <InfoTip isi="Arahkan kursor ke kartu untuk penjelasan; klik untuk turun satu tingkat." />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {nilaiAnak.map(({ anak: a, nilai: v }) => (
                  <Tip
                    key={a.id}
                    className="block"
                    isi={
                      a.penjelasan ? (
                        <>
                          <p className="font-medium">{label(a)}</p>
                          <p className="mt-1 line-clamp-[10] whitespace-pre-line text-muted-foreground">{a.penjelasan}</p>
                        </>
                      ) : null
                    }
                  >
                    <Link
                      href={hrefAnak(a)}
                      className="group relative flex h-full w-full min-w-0 flex-col rounded-2xl border border-border/70 bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.18)]"
                    >
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {a.kode ? (
                          <span className="rounded-md px-1.5 py-0.5 font-mono font-medium" style={{ background: `color-mix(in oklab, ${warna} 12%, transparent)`, color: warna }}>
                            {a.kode}
                          </span>
                        ) : null}
                        {a.anak?.length ? <span>{a.anak.length} butir</span> : null}
                        {a.bobot != null ? <span className="ml-auto font-medium tabular-nums text-foreground">{fmtPct(a.bobot, 1)}</span> : null}
                      </div>
                      <p className="mt-2 line-clamp-3 break-words text-sm font-medium leading-5">{judulBiasa(a.judul)}</p>
                      <div className="mt-auto flex items-center gap-2 pt-3">
                        {a.bobot != null ? (
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, a.bobot * 100)}%`, background: warna }} />
                          </span>
                        ) : (
                          <span className="flex-1" />
                        )}
                        {!indikatorSama && kerangka.slug === "pemdi" && (a.indikator != null || a.aspek != null) ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums">
                            {v != null ? `${fmtDec(v)} · ${predikat(v).nama}` : "belum dinilai"}
                          </span>
                        ) : null}
                        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" style={{ color: warna }} />
                      </div>
                    </Link>
                  </Tip>
                ))}
              </div>
            </section>
          ) : null}

          {grafNilai ? (
            <Panel judul="Nilai di tingkat ini" info="Skala 1–5. Batang kosong berarti belum dinilai. Klik batang untuk menelusuri.">
              <GrafikTingkat
                warna={warna}
                satuan="skor"
                max={5}
                data={nilaiAnak.map(({ anak: a, nilai: v }) => ({
                  nama: judulBiasa(a.judul),
                  judul: label(a),
                  nilai: v,
                  catatan: v == null ? "" : `${predikat(v).nama} · ${predikat(v).label}`,
                  href: hrefAnak(a),
                }))}
              />
            </Panel>
          ) : null}

          <div className={cn("grid gap-3", dokumen.length && "lg:grid-cols-2")}>
            <Panel judul="OPD terlibat" info="Dari pemetaan kebutuhan data Pemdi-AI, bukan penetapan resmi.">
              {opd.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {opd.map((o) => (
                    <span key={o} className="rounded-full border border-border/70 px-2.5 py-1 text-xs">
                      {o}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum dipetakan.</p>
              )}
            </Panel>

            {dokumen.length ? (
              <Panel
                judul="Dokumen pendukung"
                info="Dokumen yang sudah dibaca AI dan menyebut indikator di bagian ini."
                aksi={
                  <Link
                    href="/dokumen"
                    className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Semua <ArrowUpRight className="size-3.5" />
                  </Link>
                }
                bodyClassName="px-2"
              >
                <ul className="max-h-72 overflow-auto">
                  {dokumen.slice(0, 20).map((d) => (
                    <li key={d.id}>
                      <Tip
                        className="block"
                        isi={
                          <>
                            <p className="font-medium">{d.judul || d.nama}</p>
                            <p className="text-muted-foreground">
                              {d.opd || "OPD tidak diisi"} · {d.jenis || "dokumen"}
                              {d.temuan ? ` · ${fmtInt(d.temuan)} temuan` : ""}
                              {d.metrik ? ` · ${fmtInt(d.metrik)} angka` : ""}
                            </p>
                          </>
                        }
                      >
                        <Link href={`/dokumen?dok=${d.id}`} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm">{d.judul || d.nama}</span>
                          {d.temuan ? <span className="text-[11px] tabular-nums text-muted-foreground">{fmtInt(d.temuan)}</span> : null}
                        </Link>
                      </Tip>
                    </li>
                  ))}
                  {dokumen.length > 20 ? <li className="px-2 py-1 text-[11px] text-muted-foreground">+{fmtInt(dokumen.length - 20)} lainnya</li> : null}
                </ul>
              </Panel>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
