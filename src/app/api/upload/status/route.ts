import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { getUpload } from "@/lib/lakehouse";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id kosong." }, { status: 400 });
    return NextResponse.json(await getUpload(id));
  } catch (e) {
    return fail(e);
  }
}
