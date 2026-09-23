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
  partitionToolbarKeys,
  classifyToolbarKey,
  assertNoHorizontalScrollbarIntent,
} from '../src/forum/presentation/toolbarOverflow.js';
import {
  applyDiscussionInset,
  clearDiscussionInset,
  measureDockHeight,
  restoreScrollTop,
} from '../src/forum/presentation/scrollInset.js';

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

test('reply context derives from canonical mention token', () => {
  const content = '@"tech_119"#p587 hello';
  const ctx = deriveReplyContext(content);
  assert.equal(ctx.username, 'tech_119');
  assert.equal(ctx.postId, '587');
  assert.equal(isReplyContextInSync(content, ctx), true);
  assert.equal(isReplyContextInSync('changed', ctx), false);

  const removed = removeReplyContextToken(content, ctx);
  assert.equal(removed.removed, true);
  assert.equal(removed.next, 'hello');
  assert.equal(countPostMentionTokens(content), 1);
  assert.equal(deriveReplyContext('no token'), null);
});

test('toolbar partition keeps unknowns in overflow', () => {
  const keys = ['fof-upload', 'mention', 'bold', 'italic', 'link', 'emoji', 'spoiler', 'preview'];
  const { visible, overflow } = partitionToolbarKeys(keys, { maxVisible: 5, narrow: true });
  assert.ok(visible.includes('fof-upload'));
  assert.ok(visible.includes('mention'));
  assert.ok(overflow.includes('emoji'));
  assert.ok(overflow.includes('spoiler'));
  assert.ok(overflow.includes('preview'));
  assert.equal(classifyToolbarKey('mystery-widget'), 'unknown');
  assert.equal(assertNoHorizontalScrollbarIntent(visible.length, 5), true);
});

test('discussion inset applies and clears without clobbering prior padding', () => {
  const el = {
    style: { paddingBottom: '12px' },
    attrs: {},
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

  applyDiscussionInset(el, 180);
  assert.equal(el.style.paddingBottom, '180px');
  clearDiscussionInset(el);
  assert.equal(el.style.paddingBottom, '12px');

  assert.equal(measureDockHeight({ getBoundingClientRect: () => ({ height: 120 }) }, 10), 130);

  const scroller = { scrollTop: 0 };
  assert.equal(restoreScrollTop(scroller, 99), true);
  assert.equal(scroller.scrollTop, 99);
});
