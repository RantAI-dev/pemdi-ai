/**
 * The AI step of the pipeline: one document's text in, structured Pemdi data
 * out (what kind of document it is, which indicators it is evidence for and
 * at what maturity level, the numbers it reports, and which data
 * requirements it satisfies).
 *
 * Documents are processed one at a time by a single in-process worker; the
 * queue is in memory, so a restart drops what was waiting (not what was
 * done, which is in the registry).
 */
import { INDIKATOR } from "@/data/pemdi";
import { KEBUTUHAN, KEBUTUHAN_BY_ID } from "@/data/kebutuhan";
import { llmConfigured, llmJson } from "./llm";
import { sinkronkan } from "./sinkron";
import { readDok, readTeks, updateDok, type HasilAi } from "./store";

const SYSTEM = `Anda analis Evaluasi Kinerja Pemerintah Digital (Permen PANRB 8/2026) untuk sebuah pemerintah kabupaten.
Anda membaca SATU dokumen milik perangkat daerah dan mengubahnya menjadi data terstruktur. Teks bisa berasal dari OCR (kata menempel, salah eja): baca dengan toleran.

Indikator Indeks Pemdi:
${INDIKATOR.map((i) => `${i.no}. ${i.nama}`).join("\n")}

Katalog kebutuhan data (id: nama):
${KEBUTUHAN.map((k) => `${k.id}: ${k.nama}`).join("\n")}

Aturan:
- Hanya gunakan isi dokumen. Jangan menambah fakta, angka, atau nama yang tidak tertulis.
- "temuan": pernyataan faktual tentang KONDISI SAAT INI yang relevan dengan sebuah indikator. "tingkat" adalah tingkat kematangan 1-5 yang didukung temuan itu SENDIRI: 1 = masih rencana/penyiapan, 2 = sudah ada dan berjalan di sebagian layanan, 3 = berjalan menyeluruh/terstandar, 4 = sudah direviu/dievaluasi berkala, 5 = tindak lanjut reviu dilaksanakan. "kutipan" adalah potongan pendek dari dokumen (maks. 200 karakter) yang menjadi dasarnya. Maksimal 6 temuan; lebih baik sedikit dan kuat.
- "metrik": angka yang dilaporkan dokumen (mis. nilai IKM/SKM, jumlah layanan, jumlah aplikasi, jumlah pengaduan, persentase). "nilai" berupa angka dengan titik desimal. Maksimal 8.
- "kebutuhan": id dari katalog yang BENAR-BENAR dipenuhi dokumen ini (dokumen itu sendiri adalah barang yang diminta, bukan sekadar menyebutnya).
- Bila dokumen tidak relevan dengan Pemdi, kembalikan temuan, metrik dan kebutuhan kosong.

Balas dengan JSON:
{"jenis_dokumen": "SOP|Laporan SKM|Peraturan|SK|Katalog layanan|Daftar aplikasi|Data|Laporan|Lainnya", "judul": "...", "tahun": "YYYY atau kosong", "ringkasan": "1-2 kalimat",
 "temuan": [{"indikator": 1-20, "pernyataan": "...", "tingkat": 1-5, "kutipan": "..."}],
 "metrik": [{"nama": "...", "nilai": "...", "satuan": "...", "periode": "...", "indikator": 1-20 atau null}],
 "kebutuhan": ["20.1", ...]}`;

type Raw = Partial<Omit<HasilAi, "status" | "model" | "pada">>;

const str = (v: unknown, max: number) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim().slice(0, max));
const ind = (v: unknown) => (INDIKATOR.some((i) => i.no === Number(v)) ? Number(v) : null);

/** Keep only what has the promised shape: the model's output is data from outside. */
function bersihkan(r: Raw): Omit<HasilAi, "status" | "model" | "pada"> {
  return {
    jenis_dokumen: str(r.jenis_dokumen, 40) || "Lainnya",
    judul: str(r.judul, 200),
    ringkasan: str(r.ringkasan, 500),
    tahun: /^\d{4}$/.test(str(r.tahun, 4)) ? str(r.tahun, 4) : "",
    temuan: (Array.isArray(r.temuan) ? r.temuan : [])
      .map((t) => ({ indikator: ind(t?.indikator), pernyataan: str(t?.pernyataan, 400), tingkat: Math.round(Number(t?.tingkat)), kutipan: str(t?.kutipan, 240) }))
      .filter((t): t is { indikator: number; pernyataan: string; tingkat: number; kutipan: string } => t.indikator != null && t.pernyataan !== "" && t.tingkat >= 1 && t.tingkat <= 5)
      .slice(0, 6),
    metrik: (Array.isArray(r.metrik) ? r.metrik : [])
      .map((m) => ({ nama: str(m?.nama, 120), nilai: str(m?.nilai, 40), satuan: str(m?.satuan, 30), periode: str(m?.periode, 40), indikator: ind(m?.indikator) }))
      .filter((m) => m.nama && m.nilai)
      .slice(0, 8),
    kebutuhan: (Array.isArray(r.kebutuhan) ? r.kebutuhan : []).map(String).filter((id) => KEBUTUHAN_BY_ID.has(id)),
  };
}

export async function prosesDokumen(id: string): Promise<void> {
  const dok = (await readDok()).find((d) => d.id === id);
  if (!dok) return;
  const stamp = { model: process.env.LLM_MODEL ?? "", pada: new Date().toISOString() };
  let ai: HasilAi;
  try {
    const teks = await readTeks(id);
    if (teks.length <= 80) throw new Error("Tidak ada teks yang dapat dibaca dari berkas ini.");
    const raw = await llmJson<Raw>(SYSTEM, `Perangkat daerah: ${dok.opd || "(tidak diketahui)"}\nNama berkas: ${dok.nama}\n\n--- ISI DOKUMEN ---\n${teks.slice(0, 14000)}`, 8000);
    ai = { status: "selesai", ...stamp, ...bersihkan(raw) };
  } catch (e) {
    ai = { status: "gagal", error: e instanceof Error ? e.message : String(e), ...stamp, jenis_dokumen: "", judul: "", ringkasan: "", tahun: "", temuan: [], metrik: [], kebutuhan: [] };
  }
  await updateDok((all) => {
    const d = all.find((x) => x.id === id);
    if (d) d.ai = ai;
  });
}

// ── Queue ──────────────────────────────────────────────────────────────

const antrean: string[] = [];
const sedang = new Set<string>();
let berjalan = false;
let selesai = 0;
let total = 0;
/** Documents read by the model at the same time. */
const PARALEL = 3;

export function statusAntrean() {
  return { aktif: [...sedang][0] ?? null, sedang: [...sedang], menunggu: antrean.length, selesai, total, llm: llmConfigured() };
}

async function pekerja() {
  for (let id = antrean.shift(); id; id = antrean.shift()) {
    sedang.add(id);
    await prosesDokumen(id);
    sedang.delete(id);
    selesai++;
  }
}

async function jalan() {
  if (berjalan) return;
  berjalan = true;
  try {
    // Loop: documents queued while the workers were finishing are picked up too.
    while (antrean.length) await Promise.all(Array.from({ length: PARALEL }, pekerja));
  } finally {
    berjalan = false;
    selesai = 0;
    total = 0;
  }
  // The batch is done: refresh the indicator estimates from the new findings, then the lakehouse copy.
  const { perbaruiEstimasi } = await import("./estimasi");
  await perbaruiEstimasi().catch(() => undefined);
  sinkronkan();
}

/** Queue documents for the AI step. `ulang` also re-reads the ones already done. */
export async function antrekan(ids: string[] | "semua", ulang = false): Promise<number> {
  // Without a model every document would be marked as failed: leave them waiting instead.
  if (!llmConfigured()) return 0;
  const all = await readDok();
  const pilih = all.filter((d) => (ids === "semua" || ids.includes(d.id)) && d.karakter > 80 && (ulang || d.ai?.status !== "selesai") && !sedang.has(d.id) && !antrean.includes(d.id));
  antrean.push(...pilih.map((d) => d.id));
  total += pilih.length;
  void jalan();
  return pilih.length;
}
