# FORUM-MOBILE-COMPOSER-001B-R2 notes

```text
WORK_ORDER=FORUM-MOBILE-COMPOSER-001B-R2
BASE_REVIEWED_HEAD=0b72595530bdbd9f937ada2789bb39e2b822e4f6
STATUS=PARTIAL
PRODUCTION_MUTATION=false
DONE_PROVEN=false
```

## Corrections landed

1. **Single ItemList evaluation.** Mobile `TextEditor.view` keeps the VNode from one `original()` call, locates the native `.TextEditor-controls` footer, and rearranges already-created control/toolbar VNodes via `nativeFooterReflow.js`. It does not call `controlItems()` or `toolbarItems()` again. Instrumental unit test proves each hook runs once per render.
2. **Markdown always overflows.** `FORCE_OVERFLOW_CLASSES = ['markdown', 'preview']`; `VISIBLE_PRIORITY = ['upload', 'media', 'mention', 'emoji']`; `MAX_VISIBLE_ACTIONS = 4`. The intact MarkdownToolbar VNode (eleven nested buttons) moves into Flarum’s native `Dropdown` — never duplicated or counted as one 44px visible slot.
3. **Submit once, outside partitioning.** Native submit `<li>` is extracted and appended once after visible actions + overflow trigger.
4. **360px natural fit.** Docked footer budget = edge padding + hits + gaps with `margin-right: 0` on `.FlatrateComposer-toolbar > li` (no clipping to fake width). Estimate: 306px ≤ 360px for 4 + overflow + submit.
5. **Dropdown comments corrected.** LESS documents Flarum Dropdown as the phone bottom-sheet pattern, not a portal.

## Retained R1 fixes

- Stable first-child `.TextEditor-editorContainer`
- Inset snapshots via `hasAttribute`
- Empty original padding restored after repeated inset updates
- Leading-only canonical reply-context detection
- One CSS-composed close/title/Post app bar
- Priority-aware ordering
- Desktop and EditPostComposer remain native

## Static verification (this pass)

```text
node --test js/tests/presentation.test.mjs  → 12/12 pass
cd js && npm run build                      → webpack success (forum.js)
git diff --check                            → clean
```

`js/dist/forum.js` includes `item-flatrateOverflow` / `FlatrateComposer-overflowDropdown` / `TextEditor--flatrateMobile` and no second TextEditor `toolbarItems()` evaluation path.

## Still NOT_RUN (runtime / browser)

- 360 / 390 / 430 / 767 / 768px screenshots
- live 767↔768 textarea identity/content
- docked↔expanded reply identity
- iOS / Android keyboard, `100dvh`, safe-area, rotation, reduced motion
- horizontal-overflow browser proof
- FoF Upload admin vs ordinary-member
- FoF Polls, Job Breakdown decorator
- disable-extension rollback

Do not claim browser validation from unit tests.
