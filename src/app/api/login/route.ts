import { NextResponse } from "next/server";
import { authSiap, buatSesi, COOKIE, COOKIE_NAMA } from "@/lib/auth";
import { cekLogin } from "@/lib/users";

// Failed attempts, counted per client address and per user name: five within
// 15 minutes locks that address (or that name) out until the window passes.
const gagal = new Map<string, { n: number; sejak: number }>();
const JENDELA = 15 * 60 * 1000;
const BATAS = 5;

function terkunci(kunci: string): boolean {
  const g = gagal.get(kunci);
  if (g && Date.now() - g.sejak > JENDELA) gagal.delete(kunci);
  return (gagal.get(kunci)?.n ?? 0) >= BATAS;
}

function catat(kunci: string) {
  const g = gagal.get(kunci) ?? { n: 0, sejak: Date.now() };
  gagal.set(kunci, { n: g.n + 1, sejak: g.sejak });
}

export async function POST(req: Request) {
  if (!authSiap()) return NextResponse.json({ error: "Login belum diatur di server (PEMDI_SESSION_SECRET)." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { nama?: string; sandi?: string };
  const nama = String(body.nama ?? "").trim().toLowerCase().slice(0, 64);
  // Behind Cloudflare the client address is in cf-connecting-ip; otherwise the first forwarded hop.
  const ip = `ip:${req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "lokal"}`;
  if (terkunci(ip) || terkunci(`u:${nama}`)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." }, { status: 429 });
  }
  const user = await cekLogin(nama, String(body.sandi ?? ""));
  if (!user) {
    catat(ip);
    catat(`u:${nama}`);
    // One message for a wrong name and a wrong password: it does not reveal which accounts exist.
    return NextResponse.json({ error: "Nama pengguna atau kata sandi salah." }, { status: 401 });
  }
  gagal.delete(ip);
  gagal.delete(`u:${nama}`);
  const sesi = await buatSesi(user.nama);
  const res = NextResponse.json({ ok: true, nama: user.nama });
  // Over the public domain the request arrives as https; on the LAN it is plain http.
  const opsi = { sameSite: "lax" as const, secure: req.headers.get("x-forwarded-proto") === "https", maxAge: sesi.maxAge, path: "/" };
  res.cookies.set(COOKIE, sesi.value, { ...opsi, httpOnly: true });
  res.cookies.set(COOKIE_NAMA, user.namaLengkap, opsi);
  return res;
}
