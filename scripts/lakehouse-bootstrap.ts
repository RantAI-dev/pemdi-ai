/**
 * First-run setup of the lakehouse for Pemdi-AI.
 *
 * Signs in as the bootstrap admin of infra/lakehouse.env, completes the
 * forced password change (keeping the same password), joins the admin to
 * the tenant uploads will belong to, and writes .env.local for the app.
 * Safe to run again.
 *
 * The tenant is one the lakehouse seeds (LAKEHOUSE_TENANT_SLUG, default
 * "meridian-labs", its sandbox). A tenant created through the API gets its
 * own Lakekeeper warehouse, and the ClickHouse database uploads are read
 * through is bound to the default one, so a new tenant is not used here.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TENANT_SLUG = process.env.LAKEHOUSE_TENANT_SLUG ?? "meridian-labs";

const env = Object.fromEntries(
  (await readFile(path.join(ROOT, "infra/lakehouse.env"), "utf8"))
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
// API_HOST_PORT may carry a bind address ("127.0.0.1:8080").
const base = `http://localhost:${(env.API_HOST_PORT ?? "8080").split(":").pop()}`;
const email = env.AUTH_BOOTSTRAP_EMAIL;
const password = env.AUTH_BOOTSTRAP_PASSWORD;
if (!email || !password) throw new Error("Isi AUTH_BOOTSTRAP_EMAIL dan AUTH_BOOTSTRAP_PASSWORD di infra/lakehouse.env");

let cookie = "";
async function call(method: string, p: string, body?: unknown) {
  const res = await fetch(base + p, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const set = res.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith("lh_session="));
  if (set) cookie = set;
  const txt = await res.text();
  if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

const login = await call("POST", "/api/auth/login", { email, password });
if (login.mustChangePassword) {
  await call("POST", "/api/auth/change-password", { oldPassword: password, newPassword: password });
  await call("POST", "/api/auth/login", { email, password });
  console.log("kata sandi admin dikonfirmasi");
}

const me = await call("GET", "/api/auth/me");
type Tenant = { id: string; name: string; slug: string };
const tenants: Tenant[] = await call("GET", "/api/identity/tenants");
const tenant = tenants.find((t) => t.slug === TENANT_SLUG);
if (!tenant) throw new Error(`Tenant ${TENANT_SLUG} tidak ada (tersedia: ${tenants.map((t) => t.slug).join(", ")})`);
if (!me.tenants?.some((t: Tenant) => t.id === tenant.id)) {
  await call("PUT", `/api/identity/users/${me.id}/tenants/${tenant.id}`);
  console.log("admin ditambahkan ke tenant");
}

// Settings the app owns (its login password and session secret) survive the rewrite.
const lama = await readFile(path.join(ROOT, ".env.local"), "utf8").catch(() => "");
const milikApp = lama.split("\n").filter((l) => /^PEMDI_[A-Z_]+=/.test(l));

const local = [
  `LAKEHOUSE_URL=${base}`,
  `LAKEHOUSE_EMAIL=${email}`,
  `LAKEHOUSE_PASSWORD=${password}`,
  `LAKEHOUSE_TENANT_ID=${tenant.id}`,
  "",
  "# Penilaian AI memakai endpoint OpenAI-compatible yang sama dengan lakehouse.",
  `LLM_URL=${env.LLM_URL ?? ""}`,
  `LLM_MODEL=${env.LLM_MODEL ?? ""}`,
  `LLM_KEY=${env.LLM_KEY ?? ""}`,
  "",
  ...(milikApp.length ? ["# Login aplikasi", ...milikApp, ""] : []),
].join("\n");
await writeFile(path.join(ROOT, ".env.local"), local, { mode: 0o600 });
console.log(`.env.local ditulis (tenant ${tenant.id})`);
