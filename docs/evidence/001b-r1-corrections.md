# FORUM-MOBILE-COMPOSER-001B-R1 notes

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001B-R1
BASE_REVIEWED_HEAD=4413aaa9c85f4c3c38ddb39e2be1885a37b3f79c
STATUS=PARTIAL
PRODUCTION_MUTATION=false
DONE_PROVEN=false
```

## Corrections landed

1. TextEditor view always starts from `original()`; mobile only replaces the controls list, keeping `TextEditor-editorContainer` as the first child.
2. Overflow uses Flarum `Dropdown` with toolbar `overflow: visible` (no clipped absolute menu inside `overflow-x: hidden`).
3. Inset snapshot uses `hasAttribute` so empty original padding survives repeated applies.
4. ItemList keys use priority order; partition covers controlItems (FoF Upload, preview) + toolbarItems (markdown, mention, emoji).
5. Fullscreen app bar is one CSS-composed row: native close + centered title + native Post.
6. Reply context only matches a leading `@\"…\"#pN` token (optional leading whitespace).

## Still open for PASS

- Networked disposable Flarum with FoF Upload 1.9.0 + Polls 2.3.5
- Browser matrix 360/390/430/767/768, keyboard, rotation, safe-area
- Admin vs member upload affordance
- Live TextEditor DOM identity across 767→768 and docked↔expanded
- Disable-extension rollback on a booted instance
