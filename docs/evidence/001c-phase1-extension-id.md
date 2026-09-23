# FORUM-MOBILE-COMPOSER-001C Phase 1 — extension ID correction

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001C
PHASE=1_extension_id
BASE=fc8c792aceca023ab221ccb883c4ca421d9b21f4
ADMIN_EXTENSION_ID=flatrate-composer-ui
MEMBER_CUTOVER_AUTHORIZED=false
```

## Fix

Flarum derives IDs via `Extension::nameToId()`:
`flatrate/flarum-composer-ui` → strip leading `flarum-` from package → `flatrate-composer-ui`.

Admin `extensionData.for(...)` now uses `flatrate-composer-ui`.
Helper `FlatRate\ComposerUi\ExtensionId` derives the ID from `composer.json` and is asserted
by `tests/run-rollout.php` / `MemberCutoverTest`.

## Not done in Phase 1

Disposable matrix, merge, and production canary remain gated on later phases.
