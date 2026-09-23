# FORUM-MOBILE-COMPOSER-001C-R1 — disposable qualification

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001C-R1
STATUS=PARTIAL
BASE_SHA=6d842d2878a7f57dcc4f0232e3e911a5ac3fd4f4
HEAD_SHA=18ca40fc782b97c70385f402841c23809f82b26f
CORRECTION_HEAD=6d842d2878a7f57dcc4f0232e3e911a5ac3fd4f4
PLATFORM_REQUIREMENTS=PASS
DISPOSABLE_PHP=8.2.33
FOF_UPLOAD_VERSION=1.9.0
FOF_POLLS_VERSION=2.3.5
ADMIN_PAYLOAD=true
MODERATOR_PAYLOAD=false
MEMBER_PAYLOAD=false
GUEST_PAYLOAD=false
MEMBER_CUTOVER_VALUE=0
EDITOR_IDENTITY=PASS
ROLLBACK=PASS
PRODUCTION_MUTATED=false
PR_MERGED=false
DEPLOYED=false
PUBLIC_CUTOVER_AUTHORIZED=false
TECHNICIAN_PROMPTS_ENABLED=false
```

## Phase 1 — Evidence SHA

`docs/evidence/001c-qualify-deploy-status.md` records
`CORRECTION_HEAD=6d842d2878a7f57dcc4f0232e3e911a5ac3fd4f4` (not intermediate `fc054df`).

## Phase 2 — Platform

Disposable container `forum-composer-001c-r1-web` (PHP 8.2.33).
`composer check-platform-reqs` PASS without `--ignore-platform-reqs`.
Required modules present: dom, gd, mbstring, xml, xmlwriter, intl, zip.

## Phase 3 — Extension mirror

Enabled: FoF Upload 1.9.0, FoF Polls 2.3.5, Tags, Mentions, Emoji, Markdown.
Job Breakdown / custom reply decorator: **not mirrored** (SSO package not fully enabled for password actors) → keeps qualification PARTIAL.
Drafts: not installed on disposable (authority did not confirm production enablement).

## Phase 4 — Candidate install

Extension ID `flatrate-composer-ui`. `member_cutover` default/`0`.
Forum attribute `flatrateComposerUiEnabled` is JSON boolean.
Cutover `0`: admin `true`; moderator/member/guest `false`.

## Boot-order gate fix (blocks disposable UI)

Flarum `Application.boot()` runs initializers **before** `app.forum` exists.
Init-time `shouldInstallComposerPresentation(app.forum)` always failed closed.
Fix: always register decorators; gate at decoration/render time.

Also fixed Mithril crash: `normalizeChildren` must unwrap fragment tag `[`
so TextEditor `listItems()` rows stay siblings; otherwise the mobile footer
wrapped a fragment as one `item-unknown-*` and crashed keyed children.

## Phase 5–8 — Disposable browser

- Admin cutover `0` @ mobile: Flatrate shell + single submit + upload + overflow.
- Member cutover `0`: native composer; no Flatrate classes; upload absent.
- Editor identity: same `textarea.TextEditor-editor` across mobile↔desktop;
  desktop (≥768 via visualViewport) restores native footer.
- Rollback: `extension:disable flatrate-composer-ui` + cache clear → native
  composer; attribute absent from payload.

## Remaining PARTIAL

- Job Breakdown reply marker not mirrored on disposable.
- Toolbar partition still classifies some toolbar ItemList rows as
  `unknown-*` into overflow (mention/emoji reachable but not in the
  preferred visible strip). Follow-up, not a hard stop for canary gate review.
- Full viewport/keyboard/safe-area matrix not exhaustively screenshot-archived
  in this pass (390/767/768/900 exercised; iOS safe-area / Android keyboard
  DVH not instrumented beyond CSS presence in compiled `forum.css`).

## Next decision

```text
NEXT_DECISION=admin-only production canary authorization review after Job Breakdown mirror or accept PARTIAL with documented gap
```
