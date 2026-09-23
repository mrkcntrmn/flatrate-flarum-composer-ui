# FORUM-MOBILE-COMPOSER-001C-R2 — durable evidence manifest

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001C-R2
QUALIFIED_IMPLEMENTATION_SHA=284258e6e384198f7e8edc4ab23842afb944e363
EVIDENCE_COMMIT=3fcb34bc66aba8575a6d5231e7ff1569bd0e7692
DURABLE_BUNDLE_PARENT=3fcb34bc66aba8575a6d5231e7ff1569bd0e7692
IMPLEMENTATION_PR=https://github.com/mrkcntrmn/flatrate-flarum-composer-ui/pull/1
REVIEW_RESOLVING_BLOCKERS=https://github.com/mrkcntrmn/flatrate-flarum-composer-ui/pull/1#pullrequestreview-5297602947
RELEASE_EVIDENCE_REVIEW=https://github.com/mrkcntrmn/flatrate-flarum-composer-ui/pull/1#pullrequestreview-5297904199
MEMBER_CUTOVER_VALUE=0
PUBLIC_CUTOVER_AUTHORIZED=false
TECHNICIAN_PROMPTS_ENABLED=false
PRODUCTION_MUTATED=false
```

## Platform (disposable qualifier)

Captured from disposable container `forum-composer-001c-r1-web` during R2 requal.
Full `php flarum info` text: [`disposable-flarum-info.txt`](./disposable-flarum-info.txt).

```text
FLARUM_CORE=1.8.19
PHP=8.2.33
MARIADB=10.11.19
FOF_UPLOAD=1.9.0
FOF_POLLS=2.3.5
FLARUM_TAGS=v1.8.8
FLARUM_MENTIONS=v1.8.6
FLARUM_MARKDOWN=v1.8.1
FLARUM_EMOJI=v1.8.1
FLATRATE_COMPOSER_UI=dev-main (candidate under test)
FLATRATE_WIKI_SUPABASE_OAUTH=dev-main (Job Breakdown reply decorator mirror)
BASE_URL=http://127.0.0.1:8299
```

## Artifacts

| File | Actor | Viewport / context | Purpose | SHA-256 |
|------|-------|--------------------|---------|---------|
| `r2-admin-390-discussion.png` | admin (`reg001admin`) | 390×844 mobile,touch; discussion composer after R2 re-enable | Visual proof of FlatRate discussion-fullscreen shell | `ed35c04cf216ef7ae48d1c983850e99227af273e63d9eb02c122a67967493fc8` |
| `r2-disposable-matrix.json` | multi-actor summary | cutover `0` disposable matrix | Lifecycle beacons, toolbar partition, JB, identity, KB, rollback flags | `e195d0cd95177bb308a04e35ee6a2baa99ae2328a2ccb810547be63a63d9b540` |
| `actor-payloads-cutover0.json` | guest/admin/moderator/member | forum attribute payloads | `flatrateComposerUiEnabled` boolean matrix at cutover `0` | `dcb1b80d9ab577d80a7dcc7356562708718491836e450444f614018e9d8ac0a0` |
| `disposable-flarum-info.txt` | n/a | disposable platform | Flarum/PHP/extension inventory for the qualifier | see `SHA256SUMS` after add |
| `SHA256SUMS` | n/a | n/a | Checksums for binary/json artifacts | n/a |

Also see narrative closeout:
[`../001c-r2-canary-blocker-corrections.md`](../001c-r2-canary-blocker-corrections.md).

## Keyboard / safe-area simulation parameters

Instrumented browser (not physical iOS/Android). Parameters used during R2:

```text
PORTRAIT_VIEWPORT=390x844x2,mobile,touch
MOBILE_BOUNDARY=767x844x2,mobile,touch
NATIVE_BOUNDARY=768x844x1,touch
LANDSCAPE=844x390x2,mobile,touch,landscape
SIMULATED_VISUAL_VIEWPORT_HEIGHT_PX=480
SIMULATED_SAFE_AREA_INSET_TOP_PX=47
SIMULATED_SAFE_AREA_INSET_BOTTOM_PX=34
METHOD=override visualViewport.height getter + CSS padding on .Composer--flatrateMobile
ASSERTIONS=Post button visible within simulated height; toolbar/editor not beneath fold; no horizontal overflow
REAL_IOS_ANDROID=FOLLOW_UP_CANARY
```

## Job Breakdown result

Mirrored via disposable-enabled `flatrate-wiki-supabase-oauth` reply decorator
(`flatrate-wiki-reply-job-breakdown`).

```text
JOB_BREAKDOWN=PASS
TOGGLE_PRESENT=true
DOCK_EXPAND_PRESERVES_MARKER=true
CLEAR_PRESERVES_UNRELATED_PROBE=true
CLEAR_PRESERVES_CONTENT=true
NATIVE_SUBMIT_PATH=POST /api/posts
ATTRIBUTE_SHAPE=data.attributes.flatRateJobBreakdown via Model.save / data()
TECHNICIAN_PROMPTS=false
```

## Lifecycle beacons (cutover `0`)

```text
ADMIN_FLATRATE_RESIZE_LISTENER=true
ADMIN_FLATRATE_FOCUS_LISTENER=true_when_reply_created
MODERATOR_FLATRATE_LISTENER_STATE=false
MEMBER_FLATRATE_LISTENER_STATE=false
GUEST_FLATRATE_LISTENER_STATE=false
```

Beacon attributes used for disposable proof only:
`data-flatrate-lifecycle-resize`, `data-flatrate-lifecycle-focus`.

## Timestamps

```text
MATRIX_CAPTURED_AT=2026-09-23T23:12:24Z
SCREENSHOT_MTIME_LOCAL=2026-09-23T18:11:00-05:00
BUNDLE_ASSEMBLED_AT=2026-09-23T23:38:00Z
```

## Secrets policy

This bundle contains **no** cookies, tokens, authorization headers, passwords,
`.env` values, or personally identifying member data beyond disposable
usernames already used in qualification docs.
