# FORUM-MOBILE-COMPOSER-001C-R2 — canary blocker corrections

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001C-R2
STATUS=PASS
QUALIFIED_IMPLEMENTATION_SHA=284258e6e384198f7e8edc4ab23842afb944e363
EVIDENCE_COMMIT=3fcb34bc66aba8575a6d5231e7ff1569bd0e7692
BASE_SHA=76d5f971409fc69f31491041471301df98848209
BRANCH=feat/forum-mobile-composer-001b
PR=https://github.com/mrkcntrmn/flatrate-flarum-composer-ui/pull/1
REVIEW=https://github.com/mrkcntrmn/flatrate-flarum-composer-ui/pull/1#pullrequestreview-5297602947
DURABLE_EVIDENCE=docs/evidence/001c-r2/
MEMBER_CUTOVER_VALUE=0
PRODUCTION_MUTATED=false
PR_MERGED=false
DEPLOYED=false
PUBLIC_CUTOVER_AUTHORIZED=false
TECHNICIAN_PROMPTS_ENABLED=false
```

## Corrections

1. **ItemList Proxy `itemName`** — `actionKeyFromVnode` reads `vnode.itemName`
   directly (no `hasOwnProperty`). Fixtures stamp Proxy-shaped mocks where
   `hasOwnProperty('itemName') === false`. Live admin toolbar:
   mention/emoji visible, markdown overflow, `unknownCount=0`.

2. **Extension VNode trees** — removed recursive `stripVnodeKey`. Boundary-only
   keys on newly created sibling `<li>` wrappers; nested Markdown buttons and
   FoF/Mentions/Emoji children retain keys and VNode references. Unit proofs in
   `js/tests/presentation.test.mjs`.

3. **Lifecycle side effects** — decorator registration stays at init; exact-true
   actor gate wraps `Composer.oncreate` resize, `Composer.onupdate` presentation
   sync, `ReplyComposer.oncreate` focus, and related inset/scroll mutations.
   Disposable beacons:
   `data-flatrate-lifecycle-resize|focus` are set only for enabled actors.

## Static verification

```text
node --test js/tests/presentation.test.mjs   → 14/14 pass
npm run build (js/)                          → webpack production ok
composer validate --strict                   → valid
php tests/run-rollout.php                    → all backend rollout assertions passed
phpunit                                      → 29/29 (55 assertions)
git diff --check                             → clean
```

## Disposable matrix (cutover `0`)

| Actor | `flatrateComposerUiEnabled` | FlatRate classes | Lifecycle beacons |
|-------|-----------------------------|------------------|-------------------|
| admin | true | yes (mobile) | resize=1; focus=1 on reply |
| moderator | false | no | null |
| member | false | no | null |
| guest | false | no | null |

Additional proofs:

- FoF Upload present for admin; absent for member
- Mentions + emoji visible strip; markdown via overflow
- FoF Polls / Tags controls reachable on discussion composer
- Job Breakdown toggle mirrored via `flatrate-wiki-supabase-oauth`:
  marker preserved across dock/expand; clearing marker keeps unrelated probe +
  content; submit uses native `POST /api/posts` with `flatRateJobBreakdown` on
  model `data()`; no technician prompt UX
- Editor identity survives `767 ↔ 768` (same textarea node + value;
  FlatRate off at ≥768)
- Instrumented keyboard/safe-area (vv height 480, sat/sab CSS): Post visible,
  toolbar/editor not beneath simulated keyboard, no horizontal overflow
- Portrait→landscape (844×390): native at width≥768, Post visible, no overflow
- Rollback: disable + cache clear → attribute absent; re-enable restores admin
  true / guest false with cutover still `0`

Durable browser artifacts and checksums:
[`docs/evidence/001c-r2/MANIFEST.md`](./001c-r2/MANIFEST.md).

Real iOS/Android DVH evidence remains follow-up canary observation work.

## Stop conditions

None of the R2 stop conditions were observed on the corrected candidate.
