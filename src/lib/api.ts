import { NextResponse } from "next/server";
import { LakehouseError } from "./lakehouse";

/** Turn a thrown error into the JSON error the pages show. */
export function fail(e: unknown) {
  if (e instanceof LakehouseError) {
    return NextResponse.json({ error: e.message }, { status: e.status >= 400 && e.status < 600 ? e.status : 500 });
  }
  return NextResponse.json({ error: e instanceof Error ? e.message : "Terjadi kesalahan." }, { status: 500 });
}
