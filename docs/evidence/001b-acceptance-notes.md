# FORUM-MOBILE-COMPOSER-001B disposable acceptance notes

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001B
PACKAGE=flatrate/flarum-composer-ui
EXTENSION_ID=flatrate-composer-ui
SCHEMA=none
PRODUCTION_MUTATION=false
```

## Environment constraints observed during 001B

- Host canonical paths under `/home/ilove/dev/{flatrate-flarum-*,_runtime,_worktrees}` were not writable from this agent sandbox.
- Package source therefore lives at:
  `flatrate-wiki/_scratch-composer-001b/flatrate-flarum-composer-ui`
  with GitHub remote `mrkcntrmn/flatrate-flarum-composer-ui`.
- Disposable Flarum tree copied to `/tmp/forum-mobile-composer-001b/flarum` from forum-ui-reg-001 (core `1.8.19`, Tags/Mentions/Emoji/Markdown versions match qualified inventory).
- Packagist HTTPS was unreachable in this environment; `fof/upload@1.9.0` and `fof/polls@2.3.5` were **not** installed into the disposable tree.
- No database `config.php` / running web UI was available for browser screenshot qualification in this turn.

## Automated proof completed

- `npm run build` → `js/dist/forum.js`
- `node --test js/tests/presentation.test.mjs` → 8/8 pass
- `extend.php` loads without migrations

## Still required for PASS

- Disposable boot with FoF Upload 1.9.0 + Polls 2.3.5 enabled
- Admin vs member upload affordance browser proof
- Viewport screenshots at 360/390/430/767/768/desktop
- iOS/Android keyboard/safe-area/rotation
- Live TextEditor DOM identity through expand/collapse in a running forum
- Disable-extension rollback against a booted disposable instance
