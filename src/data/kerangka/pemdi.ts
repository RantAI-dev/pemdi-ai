/**
 * The Indeks Pemdi tree, derived from the same tables the rest of the app
 * uses: seven aspects (Tabel 1 of Permen PANRB 8/2026), twenty indicators,
 * and the five maturity criteria per indicator from permen-kriteria.json.
 *
 * OPD names come from the data-requirement catalogue (src/data/kebutuhan.ts),
 * which already maps every indicator to the OPDs that own the evidence. No new
 * OPD list is introduced here.
 */
import { KEBUTUHAN } from "@/data/kebutuhan";
import { ASPEK, INDIKATOR, KRITERIA, PREDIKAT } from "@/data/pemdi";
import type { Kerangka, KerangkaNode } from "@/lib/kerangka";

/** A short reading of what each aspect covers, from its own indicator names. */
const JELAS_ASPEK: Record<number, string> = {
  1: "Perencanaan, pelaksanaan, dan pengendalian penerapan Pemdi, termasuk manajemen layanan digital pemerintah.",
  2: "Kapasitas penyelenggara: sumber daya manusia Pemdi dan kolaborasi dengan pihak lain.",
  3: "Tata kelola data, informasi geospasial, statistik sektoral, dan pelindungan data pribadi.",
  4: "Audit keamanan, manajemen keamanan Pemdi, kriptografi, dan kapabilitas penanganan insiden siber.",
  5: "Aplikasi dan infrastruktur yang dipakai menyelenggarakan layanan digital pemerintah.",
  6: "Keterpaduan proses bisnis, integrasi aplikasi, portal layanan, dan interoperabilitas data.",
  7: "Fasilitas dukungan bagi pengguna layanan digital dan pengelolaan kepuasannya.",
};

/** OPDs named by the data requirements of one indicator, in catalogue order. */
function opdIndikator(no: number): string[] {
  const out: string[] = [];
  for (const k of KEBUTUHAN) {
    if (k.indikator !== no) continue;
    for (const bagian of k.pemilik.split(",")) {
      const nama = bagian.trim();
      if (nama && !out.includes(nama)) out.push(nama);
    }
  }
  return out;
}

function gabungOpd(nodes: KerangkaNode[]): string[] {
  const out: string[] = [];
  for (const n of nodes) for (const o of n.opd ?? []) if (!out.includes(o)) out.push(o);
  return out;
}

const indikator: KerangkaNode[] = INDIKATOR.map((i) => {
  const kriteria = KRITERIA.find((k) => k.no === i.no);
  const opd = opdIndikator(i.no);
  return {
    id: `indikator-${i.no}`,
    kode: String(i.no),
    judul: i.nama,
    penjelasan: kriteria?.deskripsi ?? "",
    bobot: i.bobot,
    opd,
    indikator: i.no,
    anak: (kriteria?.tingkat ?? []).map((t) => {
      const pred = PREDIKAT.find((p) => p.level === t.level);
      return {
        id: `indikator-${i.no}-tingkat-${t.level}`,
        kode: `T${t.level}`,
        judul: `Tingkat ${t.level}${pred ? ` · ${pred.nama}` : ""}`,
        penjelasan: t.kriteria,
        indikator: i.no,
        opd,
      };
    }),
  };
});

const nodeIndikator = new Map(indikator.map((n) => [n.indikator!, n]));

const aspek: KerangkaNode[] = ASPEK.map((a) => {
  const anak = INDIKATOR.filter((i) => i.aspek === a.no).map((i) => nodeIndikator.get(i.no)!);
  return {
    id: `aspek-${a.no}`,
    kode: String(a.no),
    judul: a.nama,
    penjelasan: JELAS_ASPEK[a.no] ?? "",
    bobot: a.bobot,
    opd: gabungOpd(anak),
    aspek: a.no,
    anak,
  };
});

export const pemdi: Kerangka = {
  slug: "pemdi",
  judul: "Indeks Pemdi",
  dasar: "Permen PANRB No. 8 Tahun 2026",
  deskripsi:
    "Indeks Pemerintah Digital Kabupaten Tulang Bawang Barat: 7 aspek dengan bobot berbeda, 20 indikator, dan 5 tingkat kematangan per indikator. Struktur dan bobot mengikuti Permen PANRB 8/2026; nilai diambil dari penilaian yang tersimpan di aplikasi.",
  anak: aspek,
};
