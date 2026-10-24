# Progress — task #5

Mode: all-at-once
Auto-commit: off

## Step log

- group 1/1 (whole tasks.md) — anchor 3fd7edb602a251f1e6b44e818de91e45b22d56b3 — review ×1 (0 rejects) → checkpoint: ok

## Status

All 8 tasks (T1–T8) implemented and green; everything staged (auto-commit OFF, zero commits). progress.md deliberately left unstaged (on disk only).

Active subtask: none — done, awaiting review.

## Decision log

- Manifest generated programmatically from handoff `design/data/villa.json` (photos[0..6], contactPhotos.desktop/mobile, illustration — D6 order) so alts are byte-literal copies.
- `villaImages: readonly VillaImage[] = data` with no `as` (D-design): tsc checks JSON shape.
- Validation (T4) runs before S3 client creation; collects all problems; a non-flat key skips the ext/exists checks for that key (avoids resolving paths outside assets/).
- Upload errors: `describeError` composes name, S3 Code (if different from name), HTTP status, message, and AggregateError inner `code`s (deduped). Observed: `AggregateError: ECONNREFUSED` (S3 down), `NoSuchBucket: HTTP 404: The specified bucket does not exist` (.env bucket override).
- Failure path uses `process.exitCode = 1` (no summary); validation failure uses `process.exit(1)`.
- README: only a new `### Imágenes de la Villa (pnpm seed:images)` subsection before "Aviso: borrar los datos" (+12/-0 lines).

## Verification (smoke, design §Pruebas)

1. typecheck/build (forced, uncached) → 0; temp type error in upload-images.ts → typecheck fails (probe restored).
2. shasum of all 11 assets match handoff; manifest alts generated from villa.json; `grep -rn http packages/model/src` → empty.
3. buildImageUrl with base `/images`, `/images/`, `/images///` → `http://localhost:9000/images/salon.jpg`.
4–6. infra:up; foreign probe object put; seed:images → 0, 10 `subida` lines + summary; 9 jpg → 200 image/jpeg, png → 200 image/png; CREDITOS.md → 404; probe → 200; second run → 0; png bytes from bucket match local shasum.
7. missing 2 files → exit 1 naming both, no `subida`; key `fotos/salon.jpg`, `..`, `bano.gif` → exit 1 naming each.
8. infra:down → exit 1, `No se pudo subir terraza-mar.jpg: AggregateError: ECONNREFUSED`, no summary; infra:up again.
9. temp .env S3_BUCKET=no-existe → exit 1 NoSuchBucket; .env removed; no output contains `rustfsadmin`.
Cleanup: own probe object `probe-ajeno-task5.txt` deleted (404). The 10 Villa images remain in the bucket (intended seeded state). Infra left running.

## Next action

Orchestrator: review / human checkpoint, then commit.

## Review evidence — full pass (pre-gate, auto-commit OFF)

Verdict: APPROVE. Anchor 3fd7edb602a251f1e6b44e818de91e45b22d56b3. Ledger: `.claude/state/tasks/5/review-ledger/full-pass.json` (validate green: criteria 30/30, gates 2/2, passes 5/5).

Gates (fresh, uncached): `pnpm typecheck --force` 3/3 exit 0; `pnpm build --force` exit 0. Temporary type error in upload-images.ts -> typecheck exit 2 (restored).

Content: all 10 images + CREDITOS.md byte-identical to handoff (cmp). Manifest: 10 entries, 10 distinct keys, only key/alt, 0 alt mismatches vs villa.json. `grep -rn http packages/model/src` empty. buildImageUrl with `/images`, `/images/`, `/images///` -> `http://localhost:9000/images/salon.jpg`.

Real run (live RustFS, no .env): run 1 exit 0, 10 `subida` lines + summary; HEAD: 9 jpg image/jpeg, png image/png, CREDITOS.md 404; png bytes from bucket == local; foreign object `reviewer-probe-task5.txt` kept (200) across runs; run 2 exit 0; empty S3_* vars -> defaults. Error paths: S3_ENDPOINT=http://127.0.0.1:1 -> `No se pudo subir terraza-mar.jpg: Error: connect ECONNREFUSED 127.0.0.1:1` exit 1 no summary; .env S3_BUCKET=no-existe -> NoSuchBucket exit 1; bad creds -> InvalidAccessKeyId, injected key/secret not echoed; 2 files missing -> both named, exit 1, nothing uploaded; keys `fotos/salon.jpg`, `..`, `a\b.jpg`, `bano.GIF` -> each named, exit 1. `rustfsadmin` absent from all output.

Mutation (hand probes, smoke checks as oracle): upload-images.ts — drop `return false` (l.96) killed; forcePathStyle false (l.64) killed; `&&`->`||` in isPlainFileName (l.19) killed; drop ContentType (l.92) killed (bucket re-seeded after). villa-images.ts — `/\/+$/`->`/\/$/` killed by the design's `///` smoke case, survives the spec's single-slash acceptance alone.

Advisories (non-blocking): README l.64-65 still says model/seed "vacío de momento"; README l.112 variable list omits S3_PUBLIC_URL (mentioned in the new subsection); Node prints `../.env not found. Continuing without it.` on stderr when no .env (design said no warning; harmless); bare `catch` at upload-images.ts:34 labels any access() error as missing file; `new URL(key, assetsDir)` would treat `#`/`?` in a key as fragment/query (trusted manifest, low). No automated tests by PRD decision.

Cleanup: own probe object deleted (404); worktree == index in scope; no .bak/.rev left; .env absent; infra left running with the 10 seeded images.
