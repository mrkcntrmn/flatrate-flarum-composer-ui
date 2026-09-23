# FORUM-MOBILE-COMPOSER-001C — qualify/deploy status

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001C
STATUS=PARTIAL
CORRECTION_HEAD=6d842d2878a7f57dcc4f0232e3e911a5ac3fd4f4
IMPLEMENTATION_BASE=fc8c792aceca023ab221ccb883c4ca421d9b21f4
PRODUCTION_MUTATION_AUTHORIZED=true
AUTHORIZED_SCOPE=admin_only_canary
MEMBER_CUTOVER_AUTHORIZED=false
PUBLIC_CUTOVER_AUTHORIZED=false
PRODUCTION_MUTATED=false
PR_MERGED=false
```

R1 disposable repair notes: see `docs/evidence/001c-r1-disposable-qualify.md`.
Phase 1 SHA correction verified. Disposable platform/extensions/payloads/
editor-identity/rollback progressed; Job Breakdown mirror still open → PARTIAL.

## Phase 1 — PASS

- Admin `extensionData.for('flatrate-composer-ui')` corrected.
- `FlatRate\ComposerUi\ExtensionId` derives ID from `composer.json` matching Flarum
  `Extension::nameToId()` (`flatrate/flarum-composer-ui` → `flatrate-composer-ui`).
- `tests/run-rollout.php` + `MemberCutoverTest` assert derived ID on source and admin bundle.
- Static verification:
  - `node --test js/tests/presentation.test.mjs` → 13/13 pass
  - `php tests/run-rollout.php` → all assertions passed
  - `npm run build` → forum.js + admin.js success
  - `composer validate --strict` → valid
  - `php -l extend.php` → clean
  - `git diff --check` → clean
  - `composer test` → **unavailable** (`phpunit` not on PATH; PHPUnit also needs
    `dom`/`mbstring`/`xmlwriter`). Do not treat as PHPUnit PASS.

## Phase 2 — static merge criteria

```text
ADMIN_EXTENSION_ID=flatrate-composer-ui
ROLLOUT_DEFAULT=ADMIN_ONLY
MEMBER_CUTOVER_DEFAULT=false
FORUM_ATTRIBUTE_TYPE=boolean (static/source)
CLIENT_GATE_EXACT_TRUE_ONLY=true
ITEMLIST_SINGLE_EVALUATION=true (unit)
SUBMIT_COUNT=1 (unit)
SCHEMA_CHANGES=none
```

Closed review threads for R1–R3 and the extension-ID P1 were resolved on PR #1.
**Merge not performed** — Phase 3 disposable qualification is a hard gate.

## Phase 3 — BLOCKED / NOT_RUN

Attempted disposable boot under `/tmp/forum-mobile-composer-001b/flarum`:

- MariaDB 10.11 Docker container started (`forum-composer-001c-db`, port 13306).
- `php flarum install -f install.yml` refused:
  - PHP extension `dom` required
  - PHP extension `gd` required
  - PHP extension `mbstring` required
- FoF Upload 1.9.0 / FoF Polls 2.3.5 not present in disposable vendor; Packagist install
  not attempted after the PHP extension hard-stop.
- Actor payload/DOM/viewport/identity matrices: **NOT_RUN**

Stop condition hit: disposable Flarum cannot boot; FoF Upload/Polls unavailable.

## Phases 4–8 — NOT_RUN

Merge, production pin, admin-only canary deploy, production proof, and rollback drill are
blocked until disposable qualification PASSes. `member_cutover` remains unauthorized for
production true.

## Next decision

```text
NEXT_DECISION=repair_and_requalify
```

Provide a disposable host with PHP `dom`/`gd`/`mbstring` (and PHPUnit extensions if
`composer test` is required), install FoF Upload 1.9.0 + Polls 2.3.5, then resume Phase 3.
