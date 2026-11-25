"use client";

import { BatangH, Panel } from "@/components/viz";
import { Baris, BatangTumpuk, DaftarBatang, Judul, Kepala, Legenda, Segmen } from "@/components/viz-opd";
import type { getAplikasi, getDataStatistik } from "@/lib/data";
import { fmtInt, fmtPct } from "@/lib/utils";

type Aplikasi = Awaited<ReturnType<typeof getAplikasi>>;
type Statistik = Awaited<ReturnType<typeof getDataStatistik>>;

const BIRU = "var(--viz-makro)";
const ABU = "var(--viz-ref)";
/** Categorical order for subdomain categories, fixed, never cycled; the rest fold into grey. */
const KATEGORI = ["var(--viz-makro)", "var(--viz-spm)", "var(--viz-prosn)", "var(--viz-pemdi)"];
const sslAktif = (s: string) => /aktif|ssl/i.test(s) && !/tidak|non/i.test(s);
const MASUK = [
  { nama: "Data masuk", warna: BIRU },
  { nama: "Belum masuk", warna: ABU },
];

export function DataTampilan({ app, stat }: { app: Aplikasi; stat: Statistik }) {
  const aktif = app.ssl.filter((s) => sslAktif(s.name)).reduce((n, s) => n + s.value, 0);
  const alur = [
    { nama: "Data masuk", n: stat.masuk, info: "Datanya sudah diserahkan produsen data ke walidata" },
    { nama: "Tertabulasi", n: stat.tabulasi, info: "Sudah diolah ke dalam tabel statistik" },
    { nama: "Terbit di website", n: stat.web, info: "Sudah dipublikasikan di portal data daerah" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Kepala
        judul="Data & Aplikasi"
        info="Bahan untuk aspek Data, Keamanan dan Teknologi: katalog data statistik sektoral 2026 dari walidata dan inventaris subdomain aplikasi Pemkab (sumber: Diskominfo)."
        angka={[
          { nilai: fmtInt(stat.total), label: "tabel data sektoral", info: `${fmtPct(stat.total ? stat.masuk / stat.total : null)} sudah diserahkan produsen data` },
          { nilai: `${fmtInt(stat.pusatMasuk)}/${fmtInt(stat.pusat)}`, label: "prioritas pusat masuk", info: "Tabel Daftar Data Prioritas pusat yang datanya sudah masuk" },
          { nilai: fmtPct(stat.total ? stat.web / stat.total : null), label: "terbit di website", info: `${fmtInt(stat.web)} tabel sudah dipublikasikan` },
          { nilai: fmtInt(app.total), label: "subdomain aplikasi", info: `${fmtInt(aktif)} dengan SSL aktif · ${fmtInt(app.pemilik)} pemilik` },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-5" judul="Data sektoral" info="Jumlah tabel per kelompok, sudah dan belum masuk; di bawahnya tahap pengolahan seluruh tabel.">
          <Legenda className="mb-1" item={MASUK} />
          <BatangH
            data={stat.perKelompok.map((k) => ({ ...k, nama: k.name, belum: k.n - k.masuk }))}
            seri={[
              { key: "masuk", nama: "Data masuk", warna: BIRU },
              { key: "belum", nama: "Belum masuk", warna: ABU },
            ]}
            lebarLabel={150}
            tinggiBaris={40}
            tip={(r) => (
              <>
                <Judul>{r.name}</Judul>
                <div className="mt-1 min-w-44">
                  <Baris k="Tabel" v={fmtInt(r.n)} />
                  <Baris k="Data masuk" v={`${fmtInt(r.masuk)} (${fmtPct(r.n ? r.masuk / r.n : null)})`} />
                  <Baris k="Terbit di website" v={fmtInt(r.web)} />
                </div>
              </>
            )}
          />
          <div className="mt-3 border-t border-border/70 pt-3">
            <DaftarBatang
              baris={[
                ...alur.map((a) => ({
                  nama: a.nama,
                  nilai: stat.total ? a.n / stat.total : 0,
                  teks: fmtPct(stat.total ? a.n / stat.total : null),
                  info: `${a.info}. ${fmtInt(a.n)} dari ${fmtInt(stat.total)} tabel.`,
                })),
                {
                  nama: "Prioritas pusat masuk",
                  nilai: stat.pusat ? stat.pusatMasuk / stat.pusat : 0,
                  teks: fmtPct(stat.pusat ? stat.pusatMasuk / stat.pusat : null),
                  info: `Tabel Daftar Data Prioritas pusat yang datanya sudah masuk: ${fmtInt(stat.pusatMasuk)} dari ${fmtInt(stat.pusat)}.`,
                },
              ]}
            />
          </div>
        </Panel>

        <Panel className="lg:col-span-7" judul="Produsen data" info={`${stat.perSumber.length} produsen data dengan tabel belum masuk terbanyak.`}>
          <Legenda className="mb-1" item={MASUK} />
          <BatangTumpuk
            seri={MASUK}
            lebarLabel="minmax(0,16rem)"
            baris={stat.perSumber.map((k) => ({
              nama: k.name,
              nilai: [k.masuk, k.n - k.masuk],
              info: (
                <>
                  <Judul>{k.name}</Judul>
                  <div className="mt-1 min-w-44">
                    <Baris k="Tabel" v={fmtInt(k.n)} />
                    <Baris k="Data masuk" v={fmtInt(k.masuk)} />
                    <Baris k="Belum masuk" v={fmtInt(k.n - k.masuk)} />
                  </div>
                </>
              ),
            }))}
          />
        </Panel>

        <Panel className="lg:col-span-7" judul="Subdomain per pemilik" info={`${app.perPemilik.length} pemilik aplikasi dengan subdomain terbanyak, dari ${fmtInt(app.pemilik)} pemilik.`}>
          <BatangH
            data={app.perPemilik.map((p) => ({ nama: p.name, n: p.value }))}
            seri={[{ key: "n", nama: "Subdomain", warna: BIRU }]}
            lebarLabel={170}
            tinggiBaris={20}
            tip={(r) => (
              <>
                <Judul>{r.nama}</Judul>
                <Baris k="Subdomain" v={fmtInt(r.n)} />
              </>
            )}
          />
        </Panel>

        <Panel className="lg:col-span-5" judul="Subdomain" info="Kategori subdomain dan status sertifikat SSL. SSL adalah bukti untuk indikator 11, penerapan kriptografi.">
          <div className="flex flex-col gap-5 pt-1">
            <div>
              <p className="mb-1.5 text-xs font-medium">Kategori</p>
              <Segmen
                tinggi={12}
                bagian={app.perKategori.map((k, i) => ({
                  nama: k.name,
                  nilai: k.value,
                  warna: k.name === "(kosong)" ? ABU : (KATEGORI[i] ?? ABU),
                  info: `${fmtInt(k.value)} subdomain kategori ${k.name}`,
                }))}
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium">Status SSL</p>
              <Segmen
                tinggi={12}
                bagian={app.ssl.map((s) => ({
                  nama: s.name,
                  nilai: s.value,
                  warna: sslAktif(s.name) ? "var(--status-good)" : s.name === "(kosong)" ? ABU : "var(--status-serious)",
                  info: `${fmtInt(s.value)} subdomain dengan status SSL ${s.name.toLowerCase()}`,
                }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                [fmtPct(app.total ? aktif / app.total : null), "SSL aktif"],
                [fmtInt(app.pemilik), "pemilik aplikasi"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-xl border border-border/70 px-3 py-2">
                  <p className="text-xl font-semibold tabular-nums tracking-[-0.03em]">{n}</p>
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
