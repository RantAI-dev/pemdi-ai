/**
 * Copy the pipeline's state (documents, findings, metrics, data requirements,
 * scores) into lakehouse tables, where SQL and the AI copilot can reach it.
 *
 * Each table is replaced whole. Loads run one after another in the
 * background; a request that arrives during a run triggers one more run
 * after it, so the lakehouse ends up with the latest state.
 */
import { INDIKATOR } from "@/data/pemdi";
import { toCsv } from "./intake";
import { hitungKebutuhan } from "./kebutuhan";
import { loadTable } from "./lakehouse";
import { readPenilaian } from "./penilaian";
import { readDok, readTeks, type Dok } from "./store";
import { TABLES } from "./tables";

type Rows = Record<string, unknown>[];

const STATUS_AI = (d: Dok) => (d.ai?.status === "selesai" ? "selesai" : d.ai?.status === "gagal" ? "gagal" : d.karakter > 80 ? "menunggu" : "tanpa teks");

export async function barisDokumen(): Promise<Rows> {
  const dok = await readDok();
  return Promise.all(
    dok.map(async (d) => ({
      dokumen_id: d.id,
      opd: d.opd,
      kode: d.kode,
      nama_file: d.nama,
      jenis_file: d.jenis,
      ukuran_kb: d.ukuran_kb,
      sumber: d.sumber,
      metode_teks: d.metode,
      jumlah_karakter: d.karakter,
      status_ai: STATUS_AI(d),
      jenis_dokumen: d.ai?.jenis_dokumen ?? "",
      tahun: d.ai?.tahun ?? "",
      ringkasan: d.ai?.ringkasan || (await readTeks(d.id)).slice(0, 400),
    })),
  );
}

async function semuaTabel(): Promise<Record<string, Rows>> {
  const [dok, kebutuhan, penilaian] = await Promise.all([readDok(), hitungKebutuhan(), readPenilaian()]);
  const selesai = dok.filter((d) => d.ai?.status === "selesai");
  return {
    pemdi_dokumen: await barisDokumen(),
    pemdi_temuan: selesai.flatMap((d) =>
      d.ai!.temuan.map((t) => ({
        dokumen_id: d.id,
        opd: d.opd,
        nama_file: d.nama,
        indikator_no: t.indikator,
        aspek_no: INDIKATOR.find((i) => i.no === t.indikator)?.aspek ?? "",
        tingkat: t.tingkat,
        pernyataan: t.pernyataan,
        kutipan: t.kutipan,
      })),
    ),
    pemdi_metrik: selesai.flatMap((d) =>
      d.ai!.metrik.map((m) => ({ dokumen_id: d.id, opd: d.opd, nama_metrik: m.nama, nilai: m.nilai, satuan: m.satuan, periode: m.periode, indikator_no: m.indikator ?? "" })),
    ),
    pemdi_kebutuhan: kebutuhan.map((k) => ({
      kebutuhan_id: k.id,
      indikator_no: k.indikator,
      kebutuhan: k.nama,
      lingkup: k.lingkup,
      pemilik: k.pemilik,
      tingkat_minimal: k.tingkat,
      status: k.status.replace("_", " "),
      jumlah_berkas: k.bukti.length,
      opd_diminta: k.diminta.length,
      opd_belum: k.belum.length,
      daftar_opd_belum: k.belum.join("; "),
    })),
    pemdi_penilaian: penilaian as unknown as Rows,
  };
}

let state: { state: "idle" | "running" | "failed"; error?: string; at?: string } = { state: "idle" };
let pending = false;

export function statusSinkron() {
  return state;
}

async function run() {
  state = { state: "running" };
  try {
    do {
      pending = false;
      for (const [name, rows] of Object.entries(await semuaTabel())) {
        // The lakehouse refuses a load without rows; such a table keeps what it last held.
        if (rows.length === 0) continue;
        const columns = Object.keys(TABLES.find((t) => t.name === name)!.columns);
        await loadTable(name, toCsv(columns, rows.map((r) => columns.map((c) => r[c]))));
      }
    } while (pending);
    state = { state: "idle", at: new Date().toISOString() };
  } catch (e) {
    state = { state: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

/** Start a sync in the background (or mark one as needed if a sync is running). */
export function sinkronkan(): void {
  if (state.state === "running") {
    pending = true;
    return;
  }
  void run();
}

/** Run a sync and wait for it: for scripts. */
export async function sinkronSekarang(): Promise<void> {
  await run();
  if (state.state === "failed") throw new Error(state.error);
}
