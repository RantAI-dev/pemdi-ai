/**
 * Bangun ulang src/data/spm/{nilai,sumber}.json untuk dasbor Capaian SPM.
 *
 * Sumber angka:
 *   - src/data/spm/ekstraksi.json (ekstraksi tangan dari PDF, sudah dicek)
 *   - sumber/spm/manifest.json (berkas SPM yang diunduh dari domain *.go.id)
 *   - sumber/dokumen/<id>.pdf lewat data/dokumen.json (Perda RPJMD 2025-2029)
 *
 * Jalankan dari akar repo: bun run scripts/spm-bangun.ts
 */
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NilaiSpm, SumberSpm } from "../src/lib/spm";
import { spm as kerangkaSpm } from "../src/data/kerangka/spm";

type JenisNilai = NilaiSpm["jenis"];

type Baris = {
  layanan: string | null;
  bidang: string | null;
  label: string;
  jenis: JenisNilai;
  nilai: (number | null)[];
  kutipan: string;
  catatan?: string;
};

type Tabel = {
  id: string;
  sumber: string;
  halaman: number;
  halamanCetak: number;
  judul: string;
  lokasi: string;
  tahun: number[];
  catatan?: string;
  baris: Baris[];
};

type Ekstraksi = { catatan: string; kategori: unknown; tabel: Tabel[] };

type Manifest = {
  file: string;
  url: string;
  url_unduh?: string;
  judul: string;
  penerbit: string;
  tahun_terbit?: number | null;
  tahun_data?: number[];
  bidang?: string[];
  catatan?: string;
};

type Dok = { id: string; opd: string; nama: string; jenis: string; ukuran_kb: number };

const ROOT = process.cwd();
const DIR_SPM = path.join(ROOT, "src", "data", "spm");
const DIR_SUMBER = path.join(ROOT, "sumber", "spm");

/** Sumber dengan peringkat lebih tinggi menang saat angka yang sama dilaporkan dua dokumen. */
const PERINGKAT_SUMBER: Record<string, number> = {
  "perbup-18-2026-rkpd-2027": 2,
  "rpjmd-2025-2029": 1,
};

const NAMA_SUMBER: Record<string, string> = {
  "perbup-18-2026-rkpd-2027": "Perbup 18/2026 (RKPD 2027)",
  "rpjmd-2025-2029": "RPJMD 2025–2029",
};

const baca = async <T>(berkas: string): Promise<T> => JSON.parse(await readFile(berkas, "utf8")) as T;

const rapikan = (teks: string): string => teks.replace(/\s+/g, " ").trim();

async function ukuranKb(berkas: string): Promise<number | null> {
  try {
    return Math.round((await stat(berkas)).size / 1024);
  } catch {
    return null;
  }
}

// --- Kerangka: urutan bidang dan layanan kabupaten/kota ------------------ //
const URUT_BIDANG = new Map<string, number>();
const URUT_LAYANAN = new Map<string, number>();
for (const [i, bidang] of kerangkaSpm.anak.entries()) {
  URUT_BIDANG.set(bidang.id, i);
  for (const cabang of bidang.anak ?? []) {
    if (cabang.id === "provinsi") continue;
    for (const daun of cabang.anak ?? []) URUT_LAYANAN.set(daun.id, URUT_LAYANAN.size);
  }
}

const ekstraksi = await baca<Ekstraksi>(path.join(DIR_SPM, "ekstraksi.json"));
const manifest = await baca<Manifest[]>(path.join(DIR_SUMBER, "manifest.json"));
const dokumen = await baca<Dok[]>(path.join(ROOT, "data", "dokumen.json"));

// --- Sumber -------------------------------------------------------------- //
// RPJMD sudah ada di volume dokumen aplikasi; sisanya berkas PDF di sumber/spm.
const rpjmdDok = dokumen.find((x) => x.id === "b268f44dbfce");
if (!rpjmdDok) throw new Error("Dokumen RPJMD b268f44dbfce tidak ada di data/dokumen.json");

const sumberRpjmd: SumberSpm = {
  id: "rpjmd-2025-2029",
  judul: "Peraturan Daerah Kabupaten Tulang Bawang Barat tentang Rencana Pembangunan Jangka Menengah Daerah Tahun 2025–2029",
  penerbit: "Bappeda Kabupaten Tulang Bawang Barat",
  tahunTerbit: 2025,
  jenis: "rpjmd",
  href: `/api/dokumen/${rpjmdDok.id}/berkas`,
  dokId: rpjmdDok.id,
  indikator: [],
  ukuranKb: rpjmdDok.ukuran_kb ?? null,
};

const sumberBerkas: SumberSpm[] = await Promise.all(
  manifest.map(async (m) => ({
    id: m.file.replace(/\.pdf$/i, ""),
    judul: m.judul,
    penerbit: m.penerbit,
    tahunTerbit: m.tahun_terbit ?? null,
    jenis: "dokumen" as const,
    href: `/api/sumber/spm/${encodeURIComponent(m.file)}`,
    dokId: null,
    indikator: [],
    ukuranKb: await ukuranKb(path.join(DIR_SUMBER, m.file)),
  })),
);

const sumber = [sumberRpjmd, ...sumberBerkas];

// --- Nilai --------------------------------------------------------------- //
type Entri = { nilai: NilaiSpm; label: string; peringkat: number; halamanCetak: number };

const entri: Entri[] = [];

for (const tabel of ekstraksi.tabel) {
  const peringkat = PERINGKAT_SUMBER[tabel.sumber] ?? 0;
  if (!sumber.some((s) => s.id === tabel.sumber)) throw new Error(`Sumber ${tabel.sumber} tidak dikenal (tabel ${tabel.id})`);
  if (tabel.baris.some((b) => b.nilai.length !== tabel.tahun.length)) {
    throw new Error(`Jumlah nilai tidak sama dengan jumlah tahun pada tabel ${tabel.id}`);
  }

  for (const baris of tabel.baris) {
    if (baris.layanan != null && !URUT_LAYANAN.has(baris.layanan)) throw new Error(`Layanan ${baris.layanan} tidak ada di kerangka (tabel ${tabel.id})`);
    if (baris.layanan != null && baris.bidang == null) throw new Error(`Layanan ${baris.layanan} tanpa bidang (tabel ${tabel.id})`);
    if (baris.bidang != null && !URUT_BIDANG.has(baris.bidang)) throw new Error(`Bidang ${baris.bidang} tidak ada di kerangka (tabel ${tabel.id})`);

    baris.nilai.forEach((angka, i) => {
      if (angka == null) return;
      const catatan = [baris.catatan, baris.jenis === "indeks" ? tabel.catatan : null].filter(Boolean).join(" ");
      entri.push({
        label: baris.label,
        peringkat,
        halamanCetak: tabel.halamanCetak,
        nilai: {
          layanan: baris.layanan,
          bidang: baris.bidang,
          tahun: tabel.tahun[i],
          jenis: baris.jenis,
          nilai: angka,
          satuan: "%",
          wilayah: "tubaba",
          sumber: tabel.sumber,
          halaman: tabel.halaman,
          lokasi: rapikan(`${tabel.lokasi} — ${baris.label}`),
          kutipan: rapikan(baris.kutipan),
          catatan: catatan ? rapikan(catatan) : null,
          terverifikasi: true,
        },
      });
    });
  }
}

// Duplikat antar dokumen: pakai sumber berperingkat tertinggi, catat bila sama/berbeda.
const kelompok = new Map<string, Entri[]>();
for (const e of entri) {
  const k = `${e.nilai.layanan ?? "-"}|${e.nilai.bidang ?? "-"}|${e.nilai.tahun}|${e.nilai.jenis}|${e.label}`;
  kelompok.set(k, [...(kelompok.get(k) ?? []), e]);
}

const nilai: NilaiSpm[] = [];
for (const daftar of kelompok.values()) {
  const urut = [...daftar].sort((a, b) => b.peringkat - a.peringkat);
  const utama = { ...urut[0].nilai };
  const lain = urut.slice(1);
  if (lain.length) {
    const tambahan: string[] = [];
    for (const s of lain) {
      if (s.nilai.sumber === utama.sumber) continue;
      const nama = NAMA_SUMBER[s.nilai.sumber] ?? s.nilai.sumber;
      tambahan.push(s.nilai.nilai === utama.nilai ? `Angka sama di ${nama} hlm. ${s.halamanCetak}.` : `Berbeda dengan ${nama} hlm. ${s.halamanCetak} (${s.nilai.nilai}).`);
    }
    if (tambahan.length) utama.catatan = rapikan([utama.catatan, ...tambahan].filter(Boolean).join(" "));
  }
  nilai.push(utama);
}

const urutLayanan = (x: NilaiSpm): number => (x.layanan == null ? -1 : (URUT_LAYANAN.get(x.layanan) ?? 999));
const URUT_JENIS: Record<JenisNilai, number> = { indeks: 1, capaian: 2, sasaran: 3, terlayani: 4 };

nilai.sort(
  (a, b) =>
    (URUT_BIDANG.get(a.bidang ?? "") ?? 99) - (URUT_BIDANG.get(b.bidang ?? "") ?? 99) ||
    urutLayanan(a) - urutLayanan(b) ||
    a.tahun - b.tahun ||
    URUT_JENIS[a.jenis] - URUT_JENIS[b.jenis],
);

await writeFile(path.join(DIR_SPM, "nilai.json"), `${JSON.stringify(nilai, null, 2)}\n`);
await writeFile(path.join(DIR_SPM, "sumber.json"), `${JSON.stringify(sumber, null, 2)}\n`);

// --- Laporan cakupan ----------------------------------------------------- //
const TAHUN = [...new Set(nilai.filter((x) => x.layanan != null).map((x) => x.tahun))].sort((a, b) => a - b);
const kepala = "layanan".padEnd(28) + "bidang".padEnd(20) + TAHUN.map((t) => String(t).padStart(6)).join("") + "  sumber";
console.log(`\nCakupan nilai SPM (jenis layanan kewenangan kabupaten/kota)\n${kepala}`);
console.log("-".repeat(kepala.length));
for (const [id, urut] of [...URUT_LAYANAN.entries()].sort((a, b) => a[1] - b[1])) {
  const baris = nilai.filter((x) => x.layanan === id);
  const sel = TAHUN.map((t) => (baris.some((x) => x.tahun === t) ? "ada" : "-").padStart(6)).join("");
  const sumberId = [...new Set(baris.map((x) => x.sumber))].map((s) => NAMA_SUMBER[s] ?? s).join(", ");
  console.log(`${`${id} (${urut})`.padEnd(28)}${(baris[0]?.bidang ?? "?").padEnd(20)}${sel}  ${sumberId}`);
}
console.log("-".repeat(kepala.length));
const jumlah = (jenis: JenisNilai) => nilai.filter((x) => x.jenis === jenis).length;
const terisi = new Set(nilai.filter((x) => x.layanan != null).map((x) => x.layanan)).size;
const rincian = `capaian ${jumlah("capaian")}, indeks ${jumlah("indeks")}, sasaran ${jumlah("sasaran")}, terlayani ${jumlah("terlayani")}`;
console.log(`layanan kabupaten: ${terisi}/${URUT_LAYANAN.size} punya nilai · nilai: ${nilai.length} (${rincian})`);
const rpjmd = sumber.filter((s) => s.jenis === "rpjmd").length;
const dokumenSumber = sumber.filter((s) => s.jenis === "dokumen").length;
console.log(`sumber: ${sumber.length} (${rpjmd} RPJMD, ${dokumenSumber} dokumen) · tahun: ${TAHUN.join(", ")}`);
