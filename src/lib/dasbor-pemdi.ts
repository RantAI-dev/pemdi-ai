/**
 * Dashboard Pemdi: one reading of the four indicator frameworks side by side.
 * Everything here is counted from the framework trees in src/data/kerangka;
 * only Indeks Pemdi has scores, read from the saved penilaian.
 */
import { KERANGKA } from "@/data/kerangka";
import { hitungIndeks, predikat } from "@/data/pemdi";
import type { Kerangka, KerangkaNode } from "./kerangka";
import { readPenilaian } from "./penilaian";

/** Which level of each tree holds its indicators (0 = first level), and what they are called. */
export const TINGKAT_INDIKATOR: Record<string, { tingkat: number; satuan: string; tingkatNama: string[] }> = {
  makro: { tingkat: 0, satuan: "indikator", tingkatNama: ["indikator", "komponen"] },
  spm: { tingkat: 2, satuan: "jenis layanan", tingkatNama: ["bidang", "kewenangan", "jenis layanan"] },
  prosn: { tingkat: 2, satuan: "indikator", tingkatNama: ["kelompok", "program", "indikator", "kriteria"] },
  pemdi: { tingkat: 1, satuan: "indikator", tingkatNama: ["aspek", "indikator", "tingkat kematangan"] },
};

/**
 * The Indeks Pemdi tree names OPDs the way the data-requirement catalogue
 * does (short forms); the other three use the official names. Mapped here so
 * one OPD is counted once across frameworks. Labels that name no single OPD
 * ("Seluruh OPD pemilik layanan") are left out of the OPD chart.
 */
const ALIAS: Record<string, string> = {
  Diskominfo: "Dinas Komunikasi, Informatika, Persandian dan Statistik",
  Bappeda: "Badan Perencanaan Pembangunan Daerah",
  BKPSDM: "Badan Kepegawaian dan Pengembangan SDM",
  BKAD: "Badan Keuangan dan Aset Daerah",
  Bapenda: "Badan Pendapatan Daerah",
  DPMPTSP: "Dinas Penanaman Modal dan Pelayanan Perizinan Terpadu Satu Pintu",
  "Dinas PUPR": "Dinas Pekerjaan Umum dan Penataan Ruang",
  "Bagian Organisasi": "Bagian Organisasi, Sekretariat Daerah",
};
const BUKAN_OPD = /seluruh|opd sektoral|opd pemilik|^opd\b/i;

/** Short names for the OPD chart, where full names do not fit. */
const SINGKAT: Record<string, string> = {
  "Dinas Komunikasi, Informatika, Persandian dan Statistik": "Diskominfotiksan",
  "Badan Perencanaan Pembangunan Daerah": "Bappeda",
  "Badan Kepegawaian dan Pengembangan SDM": "BKPSDM",
  "Badan Keuangan dan Aset Daerah": "BKAD",
  "Badan Pendapatan Daerah": "Bapenda",
  "Dinas Penanaman Modal dan Pelayanan Perizinan Terpadu Satu Pintu": "DPMPTSP",
  "Dinas Pekerjaan Umum dan Penataan Ruang": "Dinas PUPR",
  "Bagian Organisasi, Sekretariat Daerah": "Bagian Organisasi",
  "Dinas Pendidikan dan Kebudayaan": "Disdikbud",
  "Dinas Kesehatan": "Dinkes",
  "Dinas Sosial": "Dinsos",
  "Dinas Pemberdayaan Masyarakat dan Tiyuh": "DPMT",
  "Dinas Koperasi, Usaha Mikro Menengah, Perindustrian, dan Perdagangan": "Diskopukmperindag",
  "Dinas Perumahan, Kawasan Pemukiman dan Pertanahan": "Disperkimtan",
  "Dinas Tanaman Pangan, Hortikultura, dan Perkebunan": "Distanhorbun",
  "Dinas Tenaga Kerja dan Transmigrasi": "Disnakertrans",
  "Badan Penanggulangan Bencana Daerah": "BPBD",
  "Satuan Polisi Pamong Praja": "Satpol PP",
  "Dinas Pemadam Kebakaran dan Penyelamatan": "Damkar",
  "Dinas Ketahanan Pangan": "Dinas Ketahanan Pangan",
  "Dinas Pemberdayaan Perempuan dan Perlindungan Anak": "DPPPA",
  "Dinas Pengendalian Penduduk dan Keluarga Berencana": "DPPKB",
  "Dinas Kependudukan dan Pencatatan Sipil": "Disdukcapil",
};

export type RingkasKerangkaPemdi = {
  slug: string;
  judul: string;
  dasar: string;
  deskripsi: string;
  indikator: number;
  satuan: string;
  /** Node count per level, with the level's name. */
  tingkat: { nama: string; jumlah: number }[];
};

export type DasborPemdiData = {
  kerangka: RingkasKerangkaPemdi[];
  totalIndikator: number;
  makro: { id: string; kode: string; judul: string; satuan: string; komponen: number; ringkas: string }[];
  spm: { id: string; judul: string; kabupaten: number; provinsi: number; kewenangan: number }[];
  prosn: { id: string; kode: string; judul: string; bobot: number | null; program: number; indikator: number; programList: string[] }[];
  pemdi: { indeks: number | null; predikat: string | null; indeksSementara: number | null; predikatSementara: string | null; terisi: number; jumlah: number; aspek: { nama: string; indeks: number | null; bobot: number }[] };
  opd: { nama: string; singkat: string; per: Record<string, number>; total: number }[];
  jumlahOpd: number;
};

/** Node count at each level of a tree, first level first. */
export function perTingkat(k: Kerangka): number[] {
  const out: number[] = [];
  const jalan = (nodes: KerangkaNode[], d: number) => {
    if (!nodes.length) return;
    out[d] = (out[d] ?? 0) + nodes.length;
    for (const n of nodes) jalan(n.anak ?? [], d + 1);
  };
  jalan(k.anak, 0);
  return out;
}

/**
 * The indicator-level nodes of a tree, each with the OPDs named on it or below
 * it. Groups above carry the union of their programmes' OPDs, so they are only
 * used for an indicator that names none of its own.
 */
function indikatorDenganOpd(k: Kerangka): Set<string>[] {
  const t = TINGKAT_INDIKATOR[k.slug]?.tingkat ?? 0;
  const out: Set<string>[] = [];
  const bawah = (n: KerangkaNode, s: Set<string>) => {
    for (const o of n.opd ?? []) s.add(o);
    for (const a of n.anak ?? []) bawah(a, s);
  };
  const jalan = (nodes: KerangkaNode[], d: number, atas: string[]) => {
    for (const n of nodes) {
      if (d === t) {
        const s = new Set<string>();
        bawah(n, s);
        out.push(s.size ? s : new Set(atas));
      } else jalan(n.anak ?? [], d + 1, n.opd?.length ? n.opd : atas);
    }
  };
  jalan(k.anak, 0, []);
  return out;
}

/** The first sentence of an explanation, for a tooltip. */
const ringkasDari = (penjelasan: string) => {
  const t = penjelasan.replace(/\s+/g, " ").trim();
  const m = /^(.{20,220}?[.;])(\s|$)/.exec(t);
  return m ? m[1] : t.slice(0, 220);
};

const satuanDari = (penjelasan: string) => /Satuan:\s*([^\n]+?)\.?\s*$/m.exec(penjelasan)?.[1] ?? "";

export async function muatDasborPemdi(): Promise<DasborPemdiData> {
  const penilaian = await readPenilaian();
  const hasil = hitungIndeks(penilaian.map((p) => ({ indikator: p.indikator_no, nilai: p.nilai })));

  const kerangka = KERANGKA.map((k): RingkasKerangkaPemdi => {
    const info = TINGKAT_INDIKATOR[k.slug];
    const jumlah = perTingkat(k);
    return {
      slug: k.slug,
      judul: k.judul,
      dasar: k.dasar,
      deskripsi: k.deskripsi,
      indikator: jumlah[info?.tingkat ?? 0] ?? 0,
      satuan: info?.satuan ?? "butir",
      tingkat: jumlah.map((n, i) => ({ nama: info?.tingkatNama[i] ?? `tingkat ${i + 1}`, jumlah: n })),
    };
  });
  const bySlug = new Map(KERANGKA.map((k) => [k.slug, k]));

  const makro = (bySlug.get("makro")?.anak ?? []).map((n) => ({ id: n.id, kode: n.kode ?? "", judul: n.judul, satuan: satuanDari(n.penjelasan), komponen: n.anak?.length ?? 0, ringkas: ringkasDari(n.penjelasan) }));
  const spm = (bySlug.get("spm")?.anak ?? []).map((b) => {
    let kabupaten = 0;
    let provinsi = 0;
    // A branch shared by both levels ("Kabupaten/Kota & Provinsi") counts for the kabupaten.
    for (const c of b.anak ?? []) {
      if (/kabupaten/.test(c.id)) kabupaten += c.anak?.length ?? 0;
      else provinsi += c.anak?.length ?? 0;
    }
    return { id: b.id, judul: b.judul, kabupaten, provinsi, kewenangan: b.anak?.length ?? 0 };
  });
  const prosn = (bySlug.get("prosn")?.anak ?? []).map((g) => ({
    id: g.id,
    kode: g.kode ?? "",
    judul: g.judul,
    bobot: g.bobot ?? null,
    program: g.anak?.length ?? 0,
    indikator: (g.anak ?? []).reduce((s, p) => s + (p.anak?.length ?? 0), 0),
    programList: (g.anak ?? []).map((p) => p.judul),
  }));

  // OPD x framework: in how many indicators of each framework an OPD is named.
  const hitung = new Map<string, Record<string, number>>();
  for (const k of KERANGKA) {
    for (const opd of indikatorDenganOpd(k)) {
      const resmi = new Set([...opd].filter((o) => !BUKAN_OPD.test(o)).map((o) => ALIAS[o] ?? o));
      for (const o of resmi) {
        const per = hitung.get(o) ?? {};
        per[k.slug] = (per[k.slug] ?? 0) + 1;
        hitung.set(o, per);
      }
    }
  }
  const opd = [...hitung]
    .map(([nama, per]) => ({ nama, singkat: SINGKAT[nama] ?? nama, per, total: Object.values(per).reduce((s, n) => s + n, 0) }))
    .sort((a, b) => b.total - a.total || a.nama.localeCompare(b.nama));

  return {
    kerangka,
    totalIndikator: kerangka.reduce((s, k) => s + k.indikator, 0),
    makro,
    spm,
    prosn,
    pemdi: {
      indeks: hasil.indeks,
      predikat: hasil.indeks == null ? null : predikat(hasil.indeks).nama,
      indeksSementara: hasil.sementara,
      predikatSementara: hasil.sementara == null ? null : predikat(hasil.sementara).nama,
      terisi: hasil.terisi,
      jumlah: hasil.jumlah,
      aspek: hasil.aspek.map((a) => ({ nama: a.nama, indeks: a.indeks, bobot: a.bobot })),
    },
    opd: opd.slice(0, 15),
    jumlahOpd: opd.length,
  };
}
