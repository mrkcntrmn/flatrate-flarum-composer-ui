# FORUM-MOBILE-COMPOSER-001B-R3 rollout gate

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001B-R3-ROLLOUT-GATE
BASE_REVIEWED_HEAD=268ef6710b1162bbb140c668ab3a6bd85075b13e
STATUS=PARTIAL
PRODUCTION_DEPLOYMENT_AUTHORIZED=false
PRODUCTION_MUTATION=false
DONE_PROVEN=false
```

## Default behavior (extension enabled)

| Actor | `member_cutover` absent/false/malformed | `member_cutover` = `1` |
|------|------------------------------------------|-------------------------|
| Admin (`isAdmin()`) | custom mobile composer | custom |
| Moderator | native | custom (presentation only) |
| Member | native | custom (presentation only) |
| Guest | native | presentation flag may be true; native permissions still gate opening a composer |

Setting key: `flatrate-composer-ui.member_cutover`
Forum attribute: `flatrateComposerUiEnabled` (JSON boolean, actor-resolved)
Admin extension ID: `flatrate-composer-ui` (derived from `flatrate/flarum-composer-ui`)

## Fail-closed parsing

- Missing / empty / `"0"` / malformed (`"true"`, `"yes"`, …) → cutover false
- Canonical persisted true → `"1"` (Flarum boolean setting)
- Administrators remain enabled whenever the extension is enabled
- Client installs decorators only when `app.forum.attribute('flatrateComposerUiEnabled') === true`
  (string `"true"` fails closed)

## Presentation-only / non-security

- The flag does not grant posting, upload, tagging, polling, or moderation
- The JS bundle may still be downloadable; gated actors simply never call `extendComposer()`
- Emergency rollback: disable the extension (all actors → native)

## Fresh page requirement

Toggling cutover off/on applies on subsequent forum payloads. Open tabs may require a full
reload. Documented intentionally — no live settings push is claimed.

## ItemList contract (R3)

`actionKeyFromVnode` reads `vnode.itemName` first (Flarum 1.8.19 `ItemList.toArray()`).
Fixtures no longer invent `attrs.key` for Markdown / Mention / Emoji.

## Disposable evidence still required

Payload + DOM proof for admin/moderator/member/guest with cutover off and on, FoF Upload
role control, Tags/Polls/Mentions/Emoji/Markdown/Job Breakdown, and toggle-back-off
reload — **NOT_RUN** in this work order.

Production deployment remains unauthorized here.
