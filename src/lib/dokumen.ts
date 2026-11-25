/**
 * Intake of a document uploaded through the app: keep the original in
 * data/files, read its text (OCR when it has no text layer), add it to the
 * registry, and queue it for the AI step.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extOf, readFileText } from "./intake";
import { antrekan } from "./proses";
import { sinkronkan } from "./sinkron";
import { DATA_DIR, updateDok, writeTeks, type Dok } from "./store";

export async function intakeDokumen(file: { name: string; data: Uint8Array }, meta: { opd: string }): Promise<Dok & { antre: boolean }> {
  const id = createHash("sha1").update(file.data).digest("hex").slice(0, 12);
  await mkdir(path.join(DATA_DIR, "files"), { recursive: true });
  await writeFile(path.join(DATA_DIR, "files", `${id}.${extOf(file.name) || "bin"}`), file.data);
  const { teks, metode } = await readFileText(file.name, file.data);
  if (teks) await writeTeks(id, teks);

  const dok: Dok = {
    id,
    opd: meta.opd,
    kode: "",
    nama: file.name,
    jenis: extOf(file.name),
    ukuran_kb: Math.round(file.data.byteLength / 1024),
    sumber: "Unggahan",
    diunggah: new Date().toISOString(),
    karakter: teks.length,
    metode,
  };
  // The same bytes uploaded again replace the earlier entry (and its AI result is redone).
  await updateDok((all) => [...all.filter((d) => d.id !== id), dok]);
  const antre = (await antrekan([id])) > 0;
  if (!antre) sinkronkan();
  return { ...dok, antre };
}
