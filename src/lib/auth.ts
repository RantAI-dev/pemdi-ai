/**
 * Sessions. A session is a cookie holding the user name, an expiry time and
 * their HMAC under PEMDI_SESSION_SECRET; nothing is stored on the server.
 * Web Crypto is used so the same code runs in the proxy and in route
 * handlers. Accounts and passwords are in src/lib/users.ts.
 */
export const COOKIE = "pemdi_sesi";
/** Readable by the page, for showing who is signed in. Never trusted for access. */
export const COOKIE_NAMA = "pemdi_user";
const MAX_AGE = 7 * 24 * 60 * 60;

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(text: string): Promise<string> {
  const secret = process.env.PEMDI_SESSION_SECRET ?? "";
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}

/** Compare without leaking, through timing, how much of the input matched. */
function sama(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Whether a session secret is set. Without one nobody is let in. */
export function authSiap(): boolean {
  return (process.env.PEMDI_SESSION_SECRET ?? "").length >= 32;
}

export async function buatSesi(nama: string): Promise<{ value: string; maxAge: number }> {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return { value: `${nama}|${exp}|${await hmac(`sesi:${nama}:${exp}`)}`, maxAge: MAX_AGE };
}

/** The signed-in user's name, or null when the cookie is missing, expired or not ours. */
export async function sesiUser(value: string | undefined): Promise<string | null> {
  if (!value || !authSiap()) return null;
  const [nama, exp, sig] = decodeURIComponent(value).split("|");
  if (!nama || !exp || !sig || Number(exp) < Date.now() / 1000) return null;
  return sama(sig, await hmac(`sesi:${nama}:${exp}`)) ? nama : null;
}
