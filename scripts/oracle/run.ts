/**
 * The oracle: runs the old implementation on cases and prints `input => output`, one per line.
 *
 *   bun scripts/oracle/run.ts <module> < inputs.jsonl     one {"fn","args"} per line
 *
 * Output values are JSON. A non-finite number cannot be JSON, so it prints as the string
 * "NaN", "Infinity" or "-Infinity" (docs/port/differences.md, D-1).
 */
import { readFileSync } from "node:fs";
import { MODULES } from "./modules";

const mod = process.argv[2] ?? "";
const fns = MODULES[mod];
if (!fns) {
  console.error(`oracle: unknown module "${mod}". Known: ${Object.keys(MODULES).join(", ")}`);
  process.exit(2);
}

const enc = (v: unknown): string =>
  JSON.stringify(v, (_k, x) => (typeof x === "number" && !Number.isFinite(x) ? String(x) : x));

const text = readFileSync(0, "utf8");
for (const line of text.split("\n")) {
  if (!line.trim()) continue;
  const input = JSON.parse(line) as { fn: string; args: never[] };
  const call = fns[input.fn];
  if (!call) {
    console.error(`oracle: ${mod} has no function "${input.fn}"`);
    process.exit(2);
  }
  console.log(`${enc(input)} => ${enc(call(input.args))}`);
}
