# Progress — task #2

Mode: all-at-once
Auto-commit: off

## Step log

- group 1/1 (whole tasks.md) — anchor ced8fcede037bd5a5c8dac64aa51448a524bb99d — review ×1 (0 rejects) → checkpoint: ok (infra re-verified on real ports 27017/9000/9001; front :3000 held by an unrelated process, verified on :3002)

## Status

Active subtask: none — T1..T11 green + staged; awaiting review (auto-commit OFF, nothing committed)

## Decision log

- T1: root switched npm -> pnpm in one command (rm npm node_modules + front/node_modules, `CI=true pnpm i`); lemony 0.11.0 present after. No blocked-build warnings.
- T1: front/package.json keeps its original no-trailing-newline style (only `pnpm` field removed).
- ENV: host ports 3000 (vite of ~/lab/prueba-plan-mode), 27017/9000/9001 (docker project `clase-hoy`) are held by OTHER projects. Front dev/preview verified on the fallback port vite picked (3002 -> 200). Not stopping the user's other processes without consent.
- progress.md is kept on disk only (not staged), per Orchestrator instruction.

- Verification uses COMPOSE_FILE=docker-compose.yml:<scratchpad>/ports-override.yml remapping host ports (mongo 37017, s3 19000/19001); committed compose keeps 27017/9000/9001.
- T7: RustFS console lives at http://localhost:9001/rustfs/console/ (root `/` answers 403 S3-style). README uses that URL.
- T4: model and seed get a `typecheck: tsc --noEmit` script (needed for turbo R21); model still has no `build` script (R13).
- T4 probe: temporary `export const broken: number = "x"` in seed/src/index.ts -> `pnpm typecheck` failed naming @demo/seed#typecheck; restored by trap.
- T8: s3-init script = head-bucket || create-bucket, policy via heredoc to /tmp/policy.json, put-bucket-policy, echo ready; `$$` escaping in YAML.
- T9: verified from-zero (own project volumes removed first), repeat idempotent, S3_BUCKET=Nombre_Invalido -> exit 254, unhealthy s3 (override healthcheck false) -> exit 1, recovery -> 0.
- T10: infra:down keeps both volumes; S3 object and Mongo doc survive down/up. Test objects (probe.txt, bucket `otro`, db.probe) removed. Stack left down (no -v); volumes demo-simple-lemony_{mongo,s3}-data remain (bucket `images`, empty).
- Literal host ports 3000/27017/9000/9001 NOT verified (held by other projects) — pending human freeing ports.

## Blockers

- Literal-port checks (R11/R23 on :3000, R31/R32 on 27017/9000) need the user to stop `~/lab/prueba-plan-mode` vite (pid 17787) and docker project `clase-hoy`.

## Next action

Orchestrator: review / checkpoint; optionally re-run port-literal checks once ports are free.

## Review evidence — pre-gate full pass (single group, all-at-once, auto-commit OFF)

Reviewer (fresh), anchor ced8fcede037bd5a5c8dac64aa51448a524bb99d. Verdict: APPROVE. Ledger: .claude/state/tasks/2/review-ledger/full-pass.json.

### Verify (re-run by Reviewer)
- `CI=true pnpm install --frozen-lockfile` -> rc 0, "Lockfile is up to date"; `pnpm ignored-builds` -> None (R3/R5).
- `node_modules/.bin/lemony --version` -> 0.11.0 (R6). `seed/node_modules/@demo/model -> ../../../packages/model` (R16).
- Single lockfile `./pnpm-lock.yaml`; no package-lock.json, no front/pnpm-workspace.yaml (R2). `git diff main -- front/tsconfig.json` empty (R7). README diff: 0 removed lines (R44).
- Gate typecheck: `pnpm typecheck --force` -> 3/3 successful (front, @demo/model, @demo/seed) (R21).
- Gate build: `pnpm build --force` -> rc 0, 1/1, front/.output produced (R10/R22).
- R24 probe: appended `export const broken: number = "x"` to seed/src/index.ts -> TS2322, `Failed: @demo/seed#typecheck`; restored by EXIT trap, git status clean.
- Real run front: `pnpm dev` (root, turbo) -> 200 on :3002 (3000/3001 held by other projects; vite fell back); `front: pnpm preview` -> 200 (R11/R12/R23 on fallback port).
- Real run infra via COMPOSE_FILE=docker-compose.yml:<scratchpad>/ports-override.yml (mongo 37017, s3 19000/19001):
  - infra:up #1 rc 0; ps: mongo healthy, s3 healthy, s3-init exited 0 (R30). mongosh ping (in container, mongodb://localhost:27017/demo) -> 1 (R31).
  - get-bucket-policy: Principal "*", Action [s3:GetObject], Resource arn:aws:s3:::images/* (R29).
  - authed upload -> anon GET 200 (R32); anon PUT 403, anon LIST 403 (both list forms), anon DELETE 403 (R33); missing key 404; console /rustfs/console/ 200 (R27).
  - infra:up #2 rc 0, object still readable (R34). infra:down rc 0, 0 containers, both volumes kept; infra:up #3 rc 0, object still readable (R37).
  - `S3_BUCKET=Nombre_Invalido pnpm infra:up` -> rc 254, InvalidBucketName in s3-init log (R35). `S3_BUCKET=revotro` -> rc 0, bucket created (R42). Recovery up -> 0.
  - Forced-unhealthy s3 (extra override healthcheck `false`, 2 retries) -> infra:up rc 1 "container ... is unhealthy" (R36).
  - Cleanup: review-probe.txt deleted, bucket revotro deleted, `docker compose down` (no -v), volumes remain.
- No `.env` present during the runs (R41 defaults).
- Audit: `pnpm audit --audit-level=moderate` -> 1 moderate (GHSA-rj75-hqrm-r3gf, front>@tailwindcss/typography>postcss-selector-parser@6.0.10) — same version in anchor's front/pnpm-lock.yaml: pre-existing, not introduced.

### Mutation (hand-probe path; no test:mutation script)
- seed/src/index.ts: injected type error -> killed by typecheck gate.
- package.json:9 dropped `&& docker compose wait s3-init` -> invalid-bucket infra:up returned 0 -> killed by the R35 smoke check.
- docker-compose.yml:44 `/bin/sh -ec` -> `-c` -> invalid-bucket infra:up returned 0 -> killed by the R35 smoke check.
- Note: the "tests" killing these are Reviewer smoke commands; the project has no automated suite (spec: out of scope). Declaring a `test:mutation` script would enable the scripted path.

### Passes
- senior-review: no findings at >80% confidence; no logic-bearing TS (both index.ts are `export {}`).
- spec-compliance-check: 44/44 PASS by smoke verification (no automated tests by design, design.md §Pruebas); literal host ports 3000/27017/9000/9001 verified only via remap (env constraint) — compose file declares them literally.
- security-review (declared: G4 secrets; G5 auth, secrets, shell-process; G6 data-loss): no blocking issues. Low/hardening: published ports bind 0.0.0.0 — unauthenticated Mongo and RustFS with default rustfsadmin creds reachable from the LAN; `127.0.0.1:` prefixes would scope to localhost (spec did not specify interface). BUCKET interpolated unescaped into policy JSON heredoc (operator-controlled; S3 naming rules reject unusual names at create-bucket, but an already-existing bucket skips that) — negligible.
- silent-failure-hunter: `head-bucket ... >/dev/null 2>&1` swallows the reason, but any non-404 failure falls through to create-bucket, which fails loudly under `-e`; clean.
- test-gap-report: 0 logic-bearing files needing a spec; E2E N/A.
