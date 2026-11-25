# Pemdi-AI

Dasbor evaluasi kinerja pemerintah digital untuk Kab. Tulang Bawang Barat: Indeks Pemdi (Permen
PANRB 8/2026), Kinerja Makro, Capaian SPM, kesiapan OPD, dokumen bukti, dan tanya-jawab AI Tubaba
(NL2SQL). Next.js 16 + Bun di atas RantAI Lakehouse (ClickHouse, Lakekeeper, Dagster); produksi di
`epemdi.ai.id` dan `pemdi.rantai.dev`, satu stack Portainer.

## Commands

| What | Command |
|---|---|
| Everything, before any handoff | `scripts/check.sh` (budget: 10 minutes) |
| Only the parts your change can affect, while iterating | `scripts/check.sh --changed` (budget: 2 minutes) |
| One test | TS: `bun test <file>.test.ts -t "name"` (no TS tests yet, see `TEST-1`); Rust: `cd rust && cargo test -p pemdi-domain parity` |
| Oracle (old TS code as spec) | `bun scripts/oracle/cases.ts <module>` writes `tests/parity/<module>.cases` |
| Rust API locally | `cd rust && cargo run -p pemdi-api` → http://localhost:3200/api/health |
| One backlog row | `scripts/backlog.sh get <ID>` (reads `docs/core/BACKLOG.md` on main; never read the whole file) |
| Type check | `bun run typecheck` |
| Run it locally | `bun run dev` → http://localhost:3100 (lakehouse: `scripts/lakehouse.sh up`) |
| Deploy | `scripts/portainer.sh build <tag>` then `scripts/portainer.sh stack <tag>`; tag = `date -u +%Y%m%d%H%M` |

## Where code lives

Dependencies point down this list, never up.

- `src/app/` — pages and `api/` route handlers. The only place that reads requests and cookies.
- `src/components/` — React views and charts. Imports `src/lib/*-tampil.ts` and types only.
- `src/lib/` — logic. `*-hitung.ts` are the official calculations (pure). `lakehouse.ts`, `llm.ts`
  and `store.ts` are the only modules that talk to the outside.
- `src/data/` — the indicator frameworks (`kerangka/`) and the built Makro, SPM and PROSN values.
  Built by `scripts/{makro,spm,prosn}-bangun.ts` from `sumber/`; do not edit the JSON by hand.
- `scripts/` — build, seed and deploy tooling. Not imported by the app.
- `sumber/` — source PDFs. Only the manifests are in git; the files live in the Portainer volume.
- `rust/` — the new backend (ADR 0001, 0002). `pemdi-domain` (pure) ← `pemdi-ports` ← `pemdi-app`
  ← `pemdi-api`; `pemdi-adapters` implement ports; `pemdi-contracts` holds HTTP types.
  `pemdi-boundary` fails the build on an upward dependency.
- `scripts/oracle/`, `tests/parity/` — the port oracle and its generated cases. Protected.
- `docs/core/` — product: PRODUCT, BACKLOG (the only board), features, specs, HANDOFF.
  `docs/port/` — port plan and ledger. `docs/adr/` — decisions.

The backend is being ported from TypeScript to Rust (`docs/port/README.md`). Do not add features to
a module whose ledger row is "in progress"; new backend logic goes to Rust when its layer exists.

## Rules the gate enforces

1. TypeScript strict; `bun run typecheck` must pass.
2. Ratchet (`.agents/ratchet.tsv`): `any`, suppressions, Biome lint errors (`bunx biome lint .`)
   and ruff errors in `scripts/` may fall, never rise.
3. Rust: `cargo fmt --check`, clippy with `-D warnings` and the workspace lints (no `unwrap`,
   `expect`, `panic!`, slice indexing outside tests; every `allow` has a `reason`), `cargo test`
   including the parity and boundary tests.
4. `.agents/error-codes.tsv` is the only source of error codes; `error_codes.rs` is generated.
5. A source file over 600 lines fails (1,000 for Rust); `dasbor.tsx` and `kerangka/prosn.ts` are frozen and may only
   shrink (`.agents/size-baseline.tsv`).

## Conventions

The same in every RantAI repository. The full list is `docs/conventions.md`; read it before you add
an endpoint, an error, a log line, a config variable or a table. The ones broken most often:

- Every error response is `{ "error": { "code", "message", "requestId" } }`, built by one function.
- A `code` is a row of `.agents/error-codes.tsv`. New code: add a row, run
  `scripts/error-codes.sh --write`. Never rename or remove a row. Its status comes from the table.
- No internal text in a message: no exception text, SQL or upstream response. Log it instead.
- JSON fields are `camelCase`; times are `2026-11-11T08:30:00.000Z` in fields ending `At`.
- A list returns `{ "data": [...], "nextCursor": ... }`, never a bare array.
- Tests assert on the status and the `code`, not on message text.
- Commit subject: `type(scope): summary`.

The current `/api/*` responses predate these conventions. They are frozen while the port to Rust
runs (see `docs/port/`); the Rust service adopts the conventions after cutover.

## Working agreements

1. **Evidence, not claims.** "Green" means you ran `scripts/check.sh` after your last edit and can
   quote its last line. Anything you did not run is `not verified`.
2. **Never weaken a gate to get green.** No deleted or skipped tests, no suppression without a reason
   on the same line, no edits to anything in `.agents/protected-paths`. If a test is wrong, say so
   and stop.
3. **When the plan and the code disagree, do not pick a side silently.** Stop and report, or follow
   the code or contract test and list it under DEVIATIONS in your handoff.
4. **Stay in scope.** Change only the paths your task names. Everything else you noticed goes in the
   handoff.
5. **Proof depends on the change.** Logic or data: a test that failed before and passes now, in
   the module's existing test file. Visual: before and after captures. Server only: the test plus a
   short runtime transcript. Nobody will read your diff; the proof is what gets read.
6. **Comments say why, or nothing.** One line for a constraint the code cannot show. If a line looks
   wrong but is right, say why at that line, or the next reader will "fix" it.
7. **Search before you write.** Look for an existing helper first. A second copy is a review finding.
   New code goes in a file named for what it does, not at the bottom of the nearest big one. The
   gate fails a source file over 600 lines (1,000 for Rust), and a file already over that may only
   shrink.
8. **No new dependency** without the owner's approval. Say why you need it in the handoff.
9. **Keep the gate fast.** If it prints `check: SLOW`, or your change makes it slower, say so in the
   handoff. Speed comes from caching and from smaller crates or packages, never from removing tests.

## Traps

- No `next build` or Docker image build on the developer machine: images are built on the
  Portainer host (`scripts/portainer.sh build`). Type-check locally only.
- `deploy/stack.yml` is generated by `scripts/portainer-stack.py` from `.env.local` and
  `infra/lakehouse.env`. Edit those, never the YAML.
- `scripts/portainer.sh volumes` and `upload_volume` wipe the target volume. Never point them at
  `pemdi-ai_app_data`.
- The lakehouse JWTs (oidc-mock) expire every 30 days and are not renewed. Symptom: AI Tubaba says
  "Authentication failed". Fix: `scripts/portainer.sh token`.
- Do not modify `~/rantai/RantAI-Lakehouse`; change behaviour from this repo (e.g. `llm-proxy`).
- Cloudflare cuts a response idle for 100 s; `/api/ask` streams a ping every 15 s. Keep it.
- Secrets live only in `.env`, `.env.local`, `infra/lakehouse.env` (mode 600). Never print them.

## Roles

- You are the long-lived thread connected to the tracker: you are the **desk**. Load the `desk` skill.
- Another agent gave you a brief: you are the **worker**. Follow the brief and end with its handoff.
- The desk, or a person, asked you to plan, delegate or review one feature: you are the **lead**.
  Load the `orchestrate` skill first.
- You were asked to bring this repository up to the guidelines, or to clean it up: load the
  `adopt-guidelines` skill.
- You were asked to move code to another language: load the `port-code` skill.
