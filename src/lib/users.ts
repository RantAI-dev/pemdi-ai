/**
 * User accounts: data/users.json, one entry per person, the password kept
 * only as a salted scrypt hash. Accounts are managed with scripts/user.ts;
 * there is no sign-up.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const hash = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export type User = { nama: string; namaLengkap: string; salt: string; hash: string; dibuat: string };

const FILE = path.join(process.cwd(), "data", "users.json");
let cache: { mtime: number; users: User[] } | null = null;

/** Lower-case letters, digits, dot, dash and underscore; 3 to 32 characters. */
export function namaSah(nama: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(nama);
}

export async function readUsers(): Promise<User[]> {
  try {
    const { mtimeMs } = await stat(FILE);
    if (cache?.mtime === mtimeMs) return cache.users;
    const users = JSON.parse(await readFile(FILE, "utf8")) as User[];
    cache = { mtime: mtimeMs, users };
    return users;
  } catch {
    return [];
  }
}

async function writeUsers(users: User[]): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(`${FILE}.tmp`, JSON.stringify(users, null, 2), { mode: 0o600 });
  await rename(`${FILE}.tmp`, FILE);
  cache = null;
}

// Checked when the name is unknown, so a wrong name costs the same time as a wrong password.
const UMPAN = { salt: randomBytes(16), hash: randomBytes(64) };

/** The account if the name and password match, otherwise null. */
export async function cekLogin(nama: string, sandi: string): Promise<User | null> {
  const user = (await readUsers()).find((u) => u.nama === nama.trim().toLowerCase());
  const salt = user ? Buffer.from(user.salt, "hex") : UMPAN.salt;
  const want = user ? Buffer.from(user.hash, "hex") : UMPAN.hash;
  const got = await hash(sandi, salt, 64);
  return timingSafeEqual(got, want) && user ? user : null;
}

/** Create an account, or replace the password (and full name) of an existing one. */
export async function setUser(nama: string, sandi: string, namaLengkap?: string): Promise<"dibuat" | "diperbarui"> {
  if (!namaSah(nama)) throw new Error("Nama pengguna: 3-32 karakter, huruf kecil, angka, titik, strip, atau garis bawah.");
  if (sandi.length < 10) throw new Error("Kata sandi minimal 10 karakter.");
  const users = await readUsers();
  const ada = users.find((u) => u.nama === nama);
  const salt = randomBytes(16);
  const baru: User = {
    nama,
    namaLengkap: namaLengkap ?? ada?.namaLengkap ?? nama,
    salt: salt.toString("hex"),
    hash: (await hash(sandi, salt, 64)).toString("hex"),
    dibuat: ada?.dibuat ?? new Date().toISOString(),
  };
  await writeUsers([...users.filter((u) => u.nama !== nama), baru].sort((a, b) => a.nama.localeCompare(b.nama)));
  return ada ? "diperbarui" : "dibuat";
}

export async function hapusUser(nama: string): Promise<boolean> {
  const users = await readUsers();
  if (!users.some((u) => u.nama === nama)) return false;
  await writeUsers(users.filter((u) => u.nama !== nama));
  return true;
}
