import { NextResponse, type NextRequest } from "next/server";
import { authSiap, COOKIE, sesiUser } from "@/lib/auth";
import { readUsers } from "@/lib/users";

/**
 * Every page and API route needs a session, except the login page and its
 * API. An API call without one gets 401; a page is sent to /login. A session
 * stops working as soon as its account is removed.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();
  const nama = await sesiUser(req.cookies.get(COOKIE)?.value);
  if (nama && (await readUsers()).some((u) => u.nama === nama)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: authSiap() ? "Sesi habis. Silakan masuk lagi." : "Login belum diatur di server." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?ke=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Static assets and the emblem are public; everything else goes through the check.
  matcher: ["/((?!_next/static|_next/image|icon.png|tubaba.png|favicon.ico).*)"],
};
