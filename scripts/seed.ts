/**
 * Build the Pemdi-AI tables from the TBB folder and load them into the
 * lakehouse.
 *
 *   bun run scripts/seed.ts            build data/seed/*.csv, then load them
 *   bun run scripts/seed.ts --build    build only (no lakehouse needed)
 *   bun run scripts/seed.ts --load     load the CSVs already built
 *   bun run scripts/seed.ts --only pemdi_opd,pemdi_survei
 *   bun run scripts/seed.ts --no-ocr   skip OCR of scanned files (much faster)
 *
 * Supporting files go into the document registry (data/dokumen.json), where
 * the AI pipeline picks them up; the registry is copied to the lakehouse
 * with the other pipeline tables at the end of a load.
 *
 * Respondents' names, e-mail addresses and phone numbers are in the source
 * workbooks and are deliberately left out of every table.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { ASPEK, INDIKATOR, KRITERIA, PREDIKAT, indikatorUntukKode } from "../src/data/pemdi";
import { extOf, readFileText, toCsv } from "../src/lib/intake";
import { loadTable } from "../src/lib/lakehouse";
import { sinkronSekarang } from "../src/lib/sinkron";
import { readDok, updateDok, writeTeks, type Dok } from "../src/lib/store";
import { TABLES } from "../src/lib/tables";

const OCR = !process.argv.includes("--no-ocr");
const ROOT = path.resolve(import.meta.dirname, "..");
const TBB = path.join(ROOT, "TBB");
const OUT = path.join(ROOT, "data", "seed");

type Table = { columns: string[]; rows: unknown[][] };
const tables: Record<string, Table> = {};

function table(name: string, rows: Record<string, unknown>[]) {
  const def = TABLES.find((t) => t.name === name);
  if (!def) throw new Error(`Tabel ${name} tidak ada di src/lib/tables.ts`);
  const columns = Object.keys(def.columns);
  tables[name] = { columns, rows: rows.map((r) => columns.map((c) => r[c] ?? "")) };
}

function sheetRows(wb: XLSX.WorkBook, sheet: string): unknown[][] {
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Sheet ${sheet} tidak ditemukan`);
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
}

const text = (v: unknown) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const yaTidak = (v: unknown) => (v === true || v === "✅" || v === 1 ? "ya" : v == null || v === "" ? "" : "tidak");

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out.sort();
}

// ── Permen ─────────────────────────────────────────────────────────────

function buildPermen() {
  table(
    "pemdi_indikator",
    INDIKATOR.map((i) => {
      const a = ASPEK.find((x) => x.no === i.aspek)!;
      return {
        indikator_no: i.no,
        indikator: i.nama,
        bobot_indikator: i.bobot,
        aspek_no: a.no,
        aspek: a.nama,
        bobot_aspek: a.bobot,
        deskripsi: KRITERIA.find((k) => k.no === i.no)?.deskripsi,
      };
    }),
  );
  table(
    "pemdi_kriteria",
    KRITERIA.flatMap((k) =>
      k.tingkat.map((t) => ({
        indikator_no: k.no,
        tingkat: t.level,
        predikat: PREDIKAT[t.level - 1].nama,
        kriteria: t.kriteria,
      })),
    ),
  );
}

// ── Survei dan dokumen pendukung ───────────────────────────────────────

const SURVEI = "Pertanyaan + Jawaban Survei.xlsx";

async function buildSurvei() {
  const opdRows: Record<string, unknown>[] = [];
  const survei: Record<string, unknown>[] = [];
  const lama = new Map((await readDok()).map((d) => [d.id, d]));
  const dokumen: Dok[] = [];

  const folders = (await readdir(TBB, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const folder of folders.sort()) {
    // "<OPD> - <nama responden>": the name is dropped.
    const opd = folder.slice(0, folder.lastIndexOf(" - ")).trim();
    const dir = path.join(TBB, folder);
    const files = (await walk(dir)).filter((f) => path.basename(f) !== SURVEI);

    for (const file of files) {
      const name = path.basename(file);
      const kode = /^([a-z]+\d?_\d(?:_(?:tobe|asis))?) - /.exec(name)?.[1] ?? "";
      const id = createHash("sha1").update(path.relative(TBB, file)).digest("hex").slice(0, 12);
      const ada = lama.get(id);
      // Reading (and above all OCR) is slow: a file already read keeps its text and its AI result.
      if (ada && (ada.karakter > 80 || !OCR)) {
        dokumen.push(ada);
        continue;
      }
      const { teks, metode } = await readFileText(name, await readFile(file), OCR);
      if (teks) await writeTeks(id, teks);
      if (metode === "ocr") console.log(`  OCR: ${opd} / ${name} (${teks.length} karakter)`);
      dokumen.push({
        id,
        opd,
        kode,
        nama: kode ? name.slice(kode.length + 3) : name,
        jenis: extOf(name),
        ukuran_kb: Math.round((await stat(file)).size / 1024),
        sumber: "TBB",
        diunggah: "",
        karakter: teks.length,
        metode,
      });
    }

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(await readFile(path.join(dir, SURVEI)));
    } catch {
      console.warn(`  (tanpa berkas survei) ${opd}`);
      continue;
    }
    const identitas = new Map(sheetRows(wb, "Identitas").map((r) => [text(r[0]), r[1]]));
    const qa = sheetRows(wb, "Pertanyaan & Jawaban").slice(1).filter((r) => r[1]);
    let terjawab = 0;
    for (const r of qa) {
      const kode = text(r[1]);
      const raw = text(r[4]);
      const kosong = raw === "" || raw === "(tidak dijawab)";
      if (!kosong) terjawab++;
      const ind = indikatorUntukKode(kode)[0];
      survei.push({
        opd,
        kode,
        tema: kode.split("_")[0],
        jenis: /to-be/i.test(text(r[2])) ? "To-Be" : "As-Is",
        pertanyaan: text(r[3]),
        jawaban: kosong ? "" : raw.replace(/\s*→ ada di folder Dokumen Pendukung$/, ""),
        dijawab: kosong ? "tidak" : "ya",
        indikator_no: ind ?? "",
        aspek_no: INDIKATOR.find((i) => i.no === ind)?.aspek ?? "",
      });
    }
    opdRows.push({
      opd,
      jenis_form: text(identitas.get("Form yang diisi")),
      jabatan_responden: text(identitas.get("Jabatan")),
      tanggal_pengisian: text(identitas.get("Tanggal Pengisian")),
      status: text(identitas.get("Status")),
      jumlah_pertanyaan: qa.length,
      jumlah_terjawab: terjawab,
      jumlah_dokumen: files.length,
    });
  }
  table("pemdi_opd", opdRows);
  table("pemdi_survei", survei);
  // Files uploaded through the app stay; the TBB ones are replaced by this run's list.
  await updateDok((all) => [...dokumen, ...all.filter((d) => d.sumber !== "TBB")]);
  console.log(`  registri dokumen: ${dokumen.length} berkas TBB, ${dokumen.filter((d) => d.karakter > 80).length} terbaca (${dokumen.filter((d) => d.metode === "ocr").length} lewat OCR)`);
}

// ── Diskominfo: aplikasi, katalog data, Dalam Angka ────────────────────

async function diskominfo(pattern: RegExp): Promise<XLSX.WorkBook> {
  const folder = (await readdir(TBB)).find((f) => f.startsWith("Dinas Komunikasi"));
  if (!folder) throw new Error("Folder Diskominfo tidak ditemukan");
  const dir = path.join(TBB, folder, "Dokumen Pendukung");
  const file = (await readdir(dir)).find((f) => pattern.test(f));
  if (!file) throw new Error(`Berkas ${pattern} tidak ditemukan`);
  return XLSX.read(await readFile(path.join(dir, file)));
}

async function buildAplikasi() {
  const rows = sheetRows(await diskominfo(/^d2_3 .*\.xlsx$/), "Rekap");
  const head = rows.findIndex((r) => text(r[1]).startsWith("Subdomain"));
  table(
    "pemdi_aplikasi",
    rows
      .slice(head + 1)
      .filter((r) => text(r[1]))
      .map((r) => ({
        subdomain: text(r[1]),
        kategori: text(r[2]),
        fungsi: text(r[3]),
        status_ssl: text(r[4]),
        pemilik: text(r[5]),
      })),
  );
}

async function buildDataStatistik() {
  const wb = await diskominfo(/^data 2026\.xlsx$/);
  const rows = sheetRows(wb, wb.SheetNames[0]);
  const col = (name: string) => rows[0].findIndex((h) => text(h) === name);
  const c = {
    no: col("No. Tabel"),
    judul: col("Judul Tabel"),
    sumber: col("Sumber Data"),
    kel: col("Kel_sektoral"),
    wajib: col("Tabel Wajib"),
    pusat: col("Daftar Data Prioritas (Pusat)"),
    daerah: col("Daftar Data Prioritas (Daerah)"),
    masuk: col("Pemasukan Data"),
    tabulasi: col("Sudah Tabulasi"),
    web: col("Sudah update Website"),
    pola: col("Sentralisasi/ Desentralisasi"),
  };
  table(
    "pemdi_data_statistik",
    rows
      .slice(1)
      .filter((r) => text(r[c.no]) && text(r[c.judul]))
      .map((r) => ({
        no_tabel: text(r[c.no]),
        judul: text(r[c.judul]),
        sumber_data: text(r[c.sumber]),
        kelompok_sektoral: text(r[c.kel]),
        tabel_wajib: yaTidak(r[c.wajib]),
        prioritas_pusat: yaTidak(r[c.pusat]),
        prioritas_daerah: yaTidak(r[c.daerah]),
        data_masuk: yaTidak(r[c.masuk]),
        sudah_tabulasi: yaTidak(r[c.tabulasi]),
        sudah_di_website: yaTidak(r[c.web]),
        pola: text(r[c.pola]),
      })),
  );
}

/**
 * The 2024 workbook holds one statistical table per sheet: five title rows,
 * one or two header rows, then data. Each cell becomes one row here. The
 * 2022 and 2023 workbooks are OCR output with broken numbers and are not
 * loaded.
 */
async function buildDalamAngka() {
  const wb = await diskominfo(/Dalam_Angka_2024.*\.xlsx$/);
  const out: Record<string, unknown>[] = [];
  // Bilingual labels ("Kecamatan\nDistrict", "Januari/January"): keep the Indonesian part.
  const indo = (v: unknown) => text(String(v ?? "").split("\n")[0]);
  for (const name of wb.SheetNames.filter((s) => s.startsWith("Tabel_"))) {
    const rows = sheetRows(wb, name);
    const judul = text(rows[1]?.[0]);
    const h = rows.findIndex((r, i) => i >= 4 && r.filter((x) => text(x)).length >= 2);
    if (h < 0) continue;
    let header = rows[h].map(indo);
    let first = h + 1;
    const sub = rows[first];
    if (sub && !text(sub[0]) && sub.filter((x) => text(x)).length >= 2) {
      // A second header row under merged cells: carry the group label right.
      let group = "";
      header = header.map((top, i) => {
        if (top) group = top;
        const s = indo(sub[i]);
        return s ? `${i === 0 ? top : group} - ${s}` : top;
      });
      first++;
    }
    const label = header.findIndex((x) => x && !/^no\.?$/i.test(x));
    for (const r of rows.slice(first)) {
      const baris = indo(r[label]);
      if (!baris) continue;
      header.forEach((kolom, i) => {
        const nilai = text(r[i]);
        if (i === label || !kolom || /^no\.?$/i.test(kolom) || !nilai) return;
        out.push({ tahun_publikasi: 2024, no_tabel: name.replace("Tabel_", ""), judul, baris, kolom, nilai });
      });
    }
  }
  table("tbb_dalam_angka", out);
}

// ── Main ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
await mkdir(OUT, { recursive: true });

if (!args.includes("--load")) {
  buildPermen();
  await buildSurvei();
  await buildAplikasi();
  await buildDataStatistik();
  await buildDalamAngka();
  for (const [name, t] of Object.entries(tables)) {
    await writeFile(path.join(OUT, `${name}.csv`), toCsv(t.columns, t.rows));
    console.log(`  ${name}: ${t.rows.length} baris, ${t.columns.length} kolom`);
  }
}

// Tables the pipeline owns: built from the registry and the scores, not from TBB.
const PIPELINE = ["pemdi_dokumen", "pemdi_temuan", "pemdi_metrik", "pemdi_kebutuhan", "pemdi_penilaian"];

if (!args.includes("--build")) {
  const names = (only ?? TABLES.map((t) => t.name)).filter((n) => !PIPELINE.includes(n));
  for (const name of names) {
    const csv = await readFile(path.join(OUT, `${name}.csv`), "utf8");
    process.stdout.write(`  memuat ${name} ... `);
    const upload = await loadTable(name, csv);
    console.log(`${upload.rows ?? "?"} baris`);
  }
  if (!only || only.some((n) => PIPELINE.includes(n))) {
    process.stdout.write("  memuat tabel pipeline (dokumen, temuan, metrik, kebutuhan, penilaian) ... ");
    await sinkronSekarang();
    console.log("selesai");
  }
}
