/**
 * Manage Pemdi-AI accounts (data/users.json).
 *
 *   bun run scripts/user.ts list
 *   bun run scripts/user.ts add <nama> ["Nama Lengkap"]     asks for the password (hidden)
 *   bun run scripts/user.ts add <nama> --acak               makes a password and prints it once
 *   bun run scripts/user.ts passwd <nama>                   new password for an existing account
 *   bun run scripts/user.ts remove <nama>
 *
 * A change takes effect at once; the app does not need a restart.
 */
import { randomBytes } from "node:crypto";
import { hapusUser, readUsers, setUser } from "../src/lib/users";

const [cmd, nama, ...rest] = process.argv.slice(2);

async function tanyaSandi(): Promise<string> {
  process.stdout.write("Kata sandi (min. 10 karakter, tidak ditampilkan): ");
  const { spawnSync } = await import("node:child_process");
  spawnSync("stty", ["-echo"], { stdio: "inherit" });
  const sandi = await new Promise<string>((resolve) => process.stdin.once("data", (d) => resolve(String(d).replace(/\r?\n$/, ""))));
  spawnSync("stty", ["echo"], { stdio: "inherit" });
  process.stdout.write("\n");
  process.stdin.pause();
  return sandi;
}

if (cmd === "list") {
  const users = await readUsers();
  if (!users.length) console.log("Belum ada akun.");
  for (const u of users) console.log(`${u.nama.padEnd(20)} ${u.namaLengkap.padEnd(28)} dibuat ${u.dibuat.slice(0, 10)}`);
} else if ((cmd === "add" || cmd === "passwd") && nama) {
  const ada = (await readUsers()).some((u) => u.nama === nama);
  if (cmd === "passwd" && !ada) throw new Error(`Akun ${nama} tidak ada.`);
  if (cmd === "add" && ada) throw new Error(`Akun ${nama} sudah ada. Pakai "passwd" untuk mengganti kata sandinya.`);
  const acak = rest.includes("--acak");
  const lengkap = rest.find((r) => !r.startsWith("--"));
  const sandi = acak ? randomBytes(12).toString("base64url") : await tanyaSandi();
  console.log(`Akun ${nama} ${await setUser(nama, sandi, lengkap)}.`);
  if (acak) console.log(`Kata sandi: ${sandi}\n(hanya ditampilkan sekali ini)`);
} else if (cmd === "remove" && nama) {
  console.log((await hapusUser(nama)) ? `Akun ${nama} dihapus; sesinya langsung tidak berlaku.` : `Akun ${nama} tidak ada.`);
} else {
  console.log("Pakai: list | add <nama> [\"Nama Lengkap\"] [--acak] | passwd <nama> [--acak] | remove <nama>");
  process.exit(1);
}
