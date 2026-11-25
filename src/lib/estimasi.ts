/**
 * AI estimate of each indicator's maturity, from what the pipeline found.
 *
 * An estimate is stored as a score with penilai "AI". A score someone
 * entered by hand ("Manual") is never overwritten.
 */
import { INDIKATOR, KRITERIA, PREDIKAT } from "@/data/pemdi";
import { getBuktiIndikator } from "./bukti";
import { hitungKebutuhan } from "./kebutuhan";
import { llmConfigured, llmJson } from "./llm";
import { readPenilaian, savePenilaian } from "./penilaian";
import { readDok } from "./store";

const SYSTEM = `Anda asesor internal Evaluasi Kinerja Pemerintah Digital (Permen PANRB 8/2026) untuk sebuah pemerintah kabupaten.
Tugas: mengusulkan nilai tingkat kematangan SATU indikator berdasarkan bukti yang diberikan, dan hanya bukti itu.

Aturan:
- Pilih tingkat tertinggi yang SEMUA kriterianya didukung bukti. Rencana atau niat (jawaban "To-Be") bukan pemenuhan kriteria.
- Bukti berasal dari masing-masing perangkat daerah, sedangkan indikator menilai pemerintah kabupaten secara keseluruhan: praktik di satu-dua OPD berarti "sebagian", bukan "seluruh".
- Dokumen kunci yang tercatat BELUM ADA berarti kriteria yang bergantung padanya tidak terpenuhi.
- Bila bukti tidak cukup untuk menilai, pilih tingkat 1 dan katakan itu dengan jelas.
- Nilai berada dalam rentang tingkatnya: 1 = 1,00-1,49; 2 = 1,50-2,49; 3 = 2,50-3,49; 4 = 3,50-3,99; 5 = 4,00-5,00.
- Jangan mengarang dokumen, angka, atau nama aplikasi yang tidak ada di bukti.

Balas dengan JSON:
{"tingkat": 1-5, "nilai": angka dua desimal, "penjelasan": "3-6 kalimat: kriteria mana yang terpenuhi dan bukti dari OPD mana", "kekurangan": ["bukti yang belum ada untuk naik ke tingkat berikutnya", ...]}`;

export type Estimasi = { nilai: number; penjelasan: string; kekurangan: string[]; dasar: { temuan: number; jawaban: number; kebutuhanBelum: number } };

/** The evidence for one indicator as a prompt block. Null when there is nothing to judge from. */
async function bukti(no: number) {
  const [dok, kebutuhan, survei] = await Promise.all([
    readDok(),
    hitungKebutuhan(),
    getBuktiIndikator(no).catch(() => ({ jawaban: [], berkas: [] })),
  ]);
  const temuan = dok.flatMap((d) => (d.ai?.status === "selesai" ? d.ai.temuan.filter((t) => t.indikator === no).map((t) => ({ ...t, opd: d.opd, nama: d.nama })) : []));
  const metrik = dok.flatMap((d) => (d.ai?.status === "selesai" ? d.ai.metrik.filter((m) => m.indikator === no).map((m) => ({ ...m, opd: d.opd })) : []));
  const jawaban = survei.jawaban.filter((j) => !j.jawaban.startsWith("[File]") && j.jawaban.length > 15).slice(0, 40);
  const butuh = kebutuhan.filter((k) => k.indikator === no);
  if (temuan.length + jawaban.length === 0) return null;

  const parts: string[] = [];
  parts.push("## Status dokumen kunci");
  for (const k of butuh) {
    const s = k.status === "belum_ada" ? "BELUM ADA" : k.status === "sebagian" ? `sebagian (${k.diminta.length - k.belum.length} dari ${k.diminta.length} OPD)` : k.status === "perlu_dicek" ? "ada berkas, isinya belum terverifikasi" : "ada";
    parts.push(`- ${k.nama}: ${s}`);
  }
  if (temuan.length) {
    parts.push("\n## Temuan dari dokumen (hasil pembacaan AI per dokumen)");
    for (const t of temuan.slice(0, 60)) parts.push(`- [${t.opd}] ${t.pernyataan} (mendukung tingkat ${t.tingkat}; "${t.kutipan}"; berkas: ${t.nama})`);
  }
  if (metrik.length) {
    parts.push("\n## Angka yang dilaporkan dokumen");
    for (const m of metrik.slice(0, 40)) parts.push(`- [${m.opd}] ${m.nama}: ${m.nilai} ${m.satuan} ${m.periode}`.trim());
  }
  if (jawaban.length) {
    parts.push("\n## Jawaban survei OPD");
    for (const j of jawaban) parts.push(`- [${j.opd}] (${j.kode}, ${j.jenis}) ${j.pertanyaan.slice(0, 140)}\n  Jawaban: ${j.jawaban.slice(0, 600)}`);
  }
  return { teks: parts.join("\n"), temuan: temuan.length, jawaban: jawaban.length, kebutuhanBelum: butuh.filter((k) => k.status === "belum_ada").length };
}

export async function estimasiIndikator(no: number): Promise<Estimasi | null> {
  const ind = INDIKATOR.find((i) => i.no === no);
  const k = KRITERIA.find((x) => x.no === no);
  if (!ind || !k) return null;
  const b = await bukti(no);
  if (!b) return null;
  const kriteria = k.tingkat.map((t) => `Tingkat ${t.level} (${PREDIKAT[t.level - 1].nama}):\n${t.kriteria}`).join("\n\n");
  const r = await llmJson<{ nilai: number; penjelasan: string; kekurangan?: string[] }>(
    SYSTEM,
    `# Indikator ${ind.no}. ${ind.nama}\n${k.deskripsi}\n\n# Kriteria\n${kriteria}\n\n# Bukti\n${b.teks}`,
    6000,
  );
  const nilai = Math.min(5, Math.max(1, Math.round(Number(r.nilai) * 100) / 100));
  if (Number.isNaN(nilai)) throw new Error("LLM tidak memberi nilai yang dapat dibaca.");
  return {
    nilai,
    penjelasan: String(r.penjelasan ?? "").slice(0, 3000),
    kekurangan: Array.isArray(r.kekurangan) ? r.kekurangan.map(String).slice(0, 8) : [],
    dasar: { temuan: b.temuan, jawaban: b.jawaban, kebutuhanBelum: b.kebutuhanBelum },
  };
}

let berjalan = false;
export const estimasiBerjalan = () => berjalan;

const TANPA_BUKTI =
  "Belum ada temuan dokumen maupun jawaban survei untuk indikator ini. Nilai terendah (1,00) dipakai sebagai estimasi konservatif sampai ada bukti; lihat halaman Kebutuhan Data untuk dokumen yang perlu diminta.";

/**
 * Re-estimate every indicator that has no manual score. An indicator with no
 * evidence at all gets the floor of the scale, said plainly, so the index can
 * be computed; `hanyaKosong` leaves the indicators already scored alone.
 */
export async function perbaruiEstimasi(hanyaKosong = false): Promise<void> {
  if (berjalan || !llmConfigured()) return;
  berjalan = true;
  try {
    for (const i of INDIKATOR) {
      const ada = (await readPenilaian()).find((p) => p.indikator_no === i.no);
      if (ada?.penilai === "Manual" || (hanyaKosong && ada)) continue;
      try {
        const e = await estimasiIndikator(i.no);
        if (!e) {
          await savePenilaian({ indikator_no: i.no, nilai: 1, penjelasan: TANPA_BUKTI, penilai: "AI" }, false);
          continue;
        }
        const kurang = e.kekurangan.length ? `\n\nBelum ada bukti untuk: ${e.kekurangan.join("; ")}.` : "";
        await savePenilaian({ indikator_no: i.no, nilai: e.nilai, penjelasan: e.penjelasan + kurang, penilai: "AI" }, false);
      } catch {
        // One indicator failing (a model hiccup) must not stop the rest.
      }
    }
  } finally {
    berjalan = false;
  }
}
