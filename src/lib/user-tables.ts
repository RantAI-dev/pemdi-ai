/** Tables people loaded through Unggah Berkas, as opposed to the ones the seed builds. */
import { listUploads, query, tableRef } from "./lakehouse";
import { TABLES, type TableDef } from "./tables";

export async function userTables(): Promise<TableDef[]> {
  const known = new Set(TABLES.map((t) => t.name));
  let names: string[];
  try {
    const uploads = await listUploads();
    names = [...new Set(uploads.filter((u) => u.status === "ingested" && u.bronzeTable && !known.has(u.bronzeTable)).map((u) => u.bronzeTable!))];
  } catch {
    return [];
  }
  const out: TableDef[] = [];
  // The AI context is capped at 6,000 characters by the lakehouse: describe only a few.
  for (const name of names.slice(0, 6)) {
    try {
      const d = await query(`DESCRIBE TABLE ${tableRef(name)}`);
      const columns = Object.fromEntries(d.rows.slice(0, 25).map((r) => [String(r.name), ""]));
      out.push({ name, about: "Tabel unggahan pengguna.", columns });
    } catch {
      // Not visible in ClickHouse yet (a fresh load can take up to a minute).
    }
  }
  return out;
}
