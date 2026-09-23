import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isMobileViewport,
  resolveComposerKind,
  resolvePresentationMode,
  modeClassNames,
} from '../src/forum/presentation/composerMode.js';
import {
  setReplyExpanded,
  getReplyExpanded,
  toggleReplyExpanded,
  resetReplyPresentation,
  computeDockedEditorMaxPx,
  captureScrollAnchor,
  consumeScrollAnchor,
} from '../src/forum/presentation/replyPresentation.js';
import {
  deriveReplyContext,
  removeReplyContextToken,
  isReplyContextInSync,
  countPostMentionTokens,
} from '../src/forum/presentation/replyContext.js';
import {
  orderedItemKeys,
  partitionComposerActions,
  partitionToolbarKeys,
  classifyActionKey,
  assertNoHorizontalScrollbarIntent,
} from '../src/forum/presentation/toolbarOverflow.js';
import {
  applyDiscussionInset,
  clearDiscussionInset,
  measureDockHeight,
  restoreScrollTop,
} from '../src/forum/presentation/scrollInset.js';

function mockEl(initialPadding = '') {
  return {
    style: { paddingBottom: initialPadding },
    attrs: {},
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
  };
}

test('mobile boundary is below 768px', () => {
  assert.equal(isMobileViewport(767.98), true);
  assert.equal(isMobileViewport(767), true);
  assert.equal(isMobileViewport(768), false);
  assert.equal(isMobileViewport(1024), false);
});

test('composer kind detection keeps edit native', () => {
  class DiscussionComposer {}
  class ReplyComposer {}
  class EditPostComposer {}
  const types = { DiscussionComposer, ReplyComposer, EditPostComposer };

  assert.equal(resolveComposerKind({ componentClass: DiscussionComposer }, types), 'discussion');
  assert.equal(resolveComposerKind({ componentClass: ReplyComposer }, types), 'reply');
  assert.equal(resolveComposerKind({ componentClass: EditPostComposer }, types), 'edit');
  assert.equal(resolveComposerKind({}, types), 'none');
});

test('presentation modes', () => {
  assert.equal(resolvePresentationMode({ kind: 'discussion', mobile: true, replyExpanded: false }), 'discussion-fullscreen');
  assert.equal(resolvePresentationMode({ kind: 'reply', mobile: true, replyExpanded: false }), 'reply-docked');
  assert.equal(resolvePresentationMode({ kind: 'reply', mobile: true, replyExpanded: true }), 'reply-expanded');
  assert.equal(resolvePresentationMode({ kind: 'edit', mobile: true, replyExpanded: false }), 'native');
  assert.equal(resolvePresentationMode({ kind: 'discussion', mobile: false, replyExpanded: false }), 'native');
  assert.deepEqual(modeClassNames('reply-docked'), ['Composer--flatrateMobile', 'Composer--flatrateReplyDocked']);
  assert.deepEqual(modeClassNames('native'), []);
});

test('reply expand is explicit and reversible', () => {
  resetReplyPresentation();
  assert.equal(getReplyExpanded(), false);
  assert.equal(toggleReplyExpanded(), true);
  assert.equal(setReplyExpanded(false), false);
  assert.equal(computeDockedEditorMaxPx(1000), 360);
  assert.equal(computeDockedEditorMaxPx(400), 168);
});

test('scroll anchor capture/restore', () => {
  resetReplyPresentation();
  captureScrollAnchor(420);
  assert.equal(consumeScrollAnchor(), 420);
  assert.equal(consumeScrollAnchor(), null);
});

test('reply context only matches canonical leading token', () => {
  const leading = '@"tech_119"#p587 hello';
  const ctx = deriveReplyContext(leading);
  assert.equal(ctx.username, 'tech_119');
  assert.equal(ctx.postId, '587');
  assert.equal(isReplyContextInSync(leading, ctx), true);

  const withWhitespace = '  @"tech_119"#p587 body';
  const ws = deriveReplyContext(withWhitespace);
  assert.ok(ws);
  assert.equal(ws.token, '@"tech_119"#p587');

  assert.equal(deriveReplyContext('see @"tech_119"#p587 later'), null);
  assert.equal(deriveReplyContext('hello @"a"#p1 and @"b"#p2'), null);

  const multi = '@"first"#p1 then @"second"#p2';
  const firstOnly = deriveReplyContext(multi);
  assert.equal(firstOnly.postId, '1');
  assert.equal(countPostMentionTokens(multi), 2);

  const removed = removeReplyContextToken(leading, ctx);
  assert.equal(removed.removed, true);
  assert.equal(removed.next, 'hello');

  const stale = removeReplyContextToken('@"other"#p9 x', ctx);
  assert.equal(stale.removed, false);
  assert.equal(isReplyContextInSync('changed', ctx), false);
  assert.equal(deriveReplyContext('no token'), null);
});

test('ItemList keys are ordered by priority', () => {
  const list = {
    items: {
      low: { content: 'L', priority: 0 },
      high: { content: 'H', priority: 100 },
      mid: { content: 'M', priority: 50 },
    },
  };
  assert.deepEqual(orderedItemKeys(list), ['high', 'mid', 'low']);
});

test('production-shaped Markdown / Mentions / Emoji / FoF Upload / preview partition', () => {
  // Flarum 1.8 topology fixtures
  const controlKeys = ['submit', 'preview', 'fof-upload', 'fof-upload-media'];
  const toolbarKeys = ['markdown', 'mention', 'emoji', 'mystery-ext'];

  assert.equal(classifyActionKey('markdown'), 'markdown');
  assert.equal(classifyActionKey('fof-upload'), 'upload');
  assert.equal(classifyActionKey('fof-upload-media'), 'media');
  assert.equal(classifyActionKey('submit'), 'submit');

  const { visible, overflow } = partitionComposerActions(
    { controlKeys, toolbarKeys },
    { maxVisible: 5, narrow: true }
  );

  const visibleKeys = visible.map((r) => r.key);
  const overflowKeys = overflow.map((r) => r.key);

  assert.ok(visibleKeys.includes('fof-upload'));
  assert.ok(visibleKeys.includes('fof-upload-media'));
  assert.ok(visibleKeys.includes('mention'));
  assert.ok(visibleKeys.includes('markdown'));
  assert.ok(!visibleKeys.includes('submit'));
  assert.ok(overflowKeys.includes('preview'));
  assert.ok(overflowKeys.includes('mystery-ext'));
  assert.ok(overflowKeys.includes('emoji') || visibleKeys.includes('emoji'));
  assert.equal(assertNoHorizontalScrollbarIntent(visible.length, 5), true);

  // Priority order within toolbar source is preserved relative to input order
  // when priorities are equal — use orderedItemKeys at the call site.
  const toolbarList = {
    items: {
      emoji: { priority: 10 },
      mention: { priority: 50 },
      markdown: { priority: 100 },
    },
  };
  assert.deepEqual(orderedItemKeys(toolbarList), ['markdown', 'mention', 'emoji']);

  const legacy = partitionToolbarKeys(['markdown', 'mention', 'emoji', 'spoiler'], { maxVisible: 3 });
  assert.ok(legacy.visible.includes('markdown'));
  assert.ok(legacy.overflow.includes('spoiler'));
});

test('discussion inset preserves empty original padding across repeated applies', () => {
  const el = mockEl('');

  applyDiscussionInset(el, 180);
  assert.equal(el.style.paddingBottom, '180px');
  assert.equal(el.getAttribute('data-flatrate-composer-inset'), '');

  applyDiscussionInset(el, 220);
  assert.equal(el.style.paddingBottom, '220px');
  assert.equal(el.getAttribute('data-flatrate-composer-inset'), '');

  clearDiscussionInset(el);
  assert.equal(el.style.paddingBottom, '');
  assert.equal(el.hasAttribute('data-flatrate-composer-inset'), false);

  const withPrior = mockEl('12px');
  applyDiscussionInset(withPrior, 180);
  applyDiscussionInset(withPrior, 200);
  clearDiscussionInset(withPrior);
  assert.equal(withPrior.style.paddingBottom, '12px');

  assert.equal(measureDockHeight({ getBoundingClientRect: () => ({ height: 120 }) }, 10), 130);
  const scroller = { scrollTop: 0 };
  assert.equal(restoreScrollTop(scroller, 99), true);
  assert.equal(scroller.scrollTop, 99);
});
