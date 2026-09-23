import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  estimateDockedFooterWidthPx,
  assertFitsViewport,
  MAX_VISIBLE_ACTIONS,
  HIT_PX,
  INLINE_GAP_PX,
  EDGE_PADDING_PX,
} from '../src/forum/presentation/toolbarOverflow.js';
import {
  extractNativeFooterActions,
  partitionExtractedActions,
  reflowMobileTextEditorView,
  countSubmitVnodes,
  actionKeyFromVnode,
  normalizeChildren,
} from '../src/forum/presentation/nativeFooterReflow.js';
import {
  shouldInstallComposerPresentation,
  isComposerPresentationAttributeEnabled,
} from '../src/forum/rolloutGate.js';
import {
  applyDiscussionInset,
  clearDiscussionInset,
  measureDockHeight,
  restoreScrollTop,
} from '../src/forum/presentation/scrollInset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

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

/**
 * Production-shaped native TextEditor footer VNode after one ItemList evaluation.
 * Flarum 1.x ItemList.toArray() exposes `itemName` through a Proxy get trap —
 * not as an own property (hasOwnProperty('itemName') === false).
 */
function stampItemListProxy(vnode, key) {
  return new Proxy(vnode, {
    get(target, prop, receiver) {
      if (prop === 'itemName') {
        return key;
      }
      return Reflect.get(target, prop, receiver);
    },
    has(target, prop) {
      if (prop === 'itemName') {
        return true;
      }
      return Reflect.has(target, prop);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop === 'itemName') {
        return undefined;
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
  });
}

function buildNativeTextEditorVnode(hooks) {
  const controlItems = hooks.controlItems();
  const toolbarItems = hooks.toolbarItems();

  const toolbarChildren = Object.keys(toolbarItems.items)
    .sort((a, b) => (toolbarItems.items[b].priority || 0) - (toolbarItems.items[a].priority || 0))
    .map((key) => {
      const entry = toolbarItems.items[key];
      let vnode;
      if (entry.children) {
        vnode = {
          tag: entry.tag || 'div',
          attrs: entry.attrs ? { ...entry.attrs } : {},
          children: entry.children,
        };
      } else if (entry.content && typeof entry.content === 'object' && entry.content.tag) {
        // Content proxy is the VNode itself (Mentions / Emoji buttons).
        vnode = entry.content;
      } else {
        vnode = {
          tag: entry.tag || 'div',
          attrs: entry.attrs ? { ...entry.attrs } : {},
          children: [entry.content],
        };
      }
      return stampItemListProxy(vnode, key);
    });

  const controlChildren = Object.keys(controlItems.items)
    .sort((a, b) => (controlItems.items[b].priority || 0) - (controlItems.items[a].priority || 0))
    .map((key) => {
      const content = controlItems.items[key].content;
      const stamped = content && typeof content === 'object' ? stampItemListProxy(content, key) : content;
      return {
        tag: 'li',
        attrs: {
          className:
            key === 'submit'
              ? `item-${key} App-primaryControl`
              : `item-${key}`,
          key,
        },
        children: [stamped],
      };
    });

  return {
    tag: 'div',
    attrs: { className: 'TextEditor' },
    children: [
      {
        tag: 'div',
        attrs: { className: 'TextEditor-editorContainer' },
        children: [{ tag: 'textarea', attrs: { className: 'TextEditor-editor' }, children: [] }],
      },
      {
        tag: 'ul',
        attrs: { className: 'TextEditor-controls Composer-footer' },
        children: [
          {
            tag: 'li',
            attrs: { className: 'TextEditor-toolbar' },
            children: toolbarChildren,
          },
          ...controlChildren,
        ],
      },
    ],
  };
}

function productionHooks() {
  let controlCalls = 0;
  let toolbarCalls = 0;

  // Eleven nested Markdown buttons — must travel as one intact toolbar VNode.
  const markdownButtons = Array.from({ length: 11 }, (_, i) => ({
    tag: 'button',
    attrs: { className: 'Button Button--icon', type: 'button', 'data-md': i, key: `md-${i}` },
    children: [],
  }));

  return {
    controlCalls: () => controlCalls,
    toolbarCalls: () => toolbarCalls,
    controlItems() {
      controlCalls += 1;
      return {
        items: {
          submit: { content: { tag: 'button', attrs: { type: 'submit' }, children: ['Post'] }, priority: 0 },
          preview: { content: { tag: 'button', attrs: { className: 'Button' }, children: ['Preview'] }, priority: 10 },
          'fof-upload': { content: { tag: 'button', attrs: { className: 'Button' }, children: ['Upload'] }, priority: 50 },
          'fof-upload-media': { content: { tag: 'button', attrs: { className: 'Button' }, children: ['Media'] }, priority: 40 },
        },
      };
    },
    toolbarItems() {
      toolbarCalls += 1;
      return {
        items: {
          // No attrs.key / attrs.itemName / item-* class — only vnode.itemName after toArray.
          markdown: {
            content: 'MarkdownToolbar',
            attrs: { className: 'MarkdownToolbar' },
            children: markdownButtons,
            priority: 100,
          },
          mention: {
            content: { tag: 'button', attrs: { className: 'Button' }, children: ['@'] },
            attrs: {},
            priority: 50,
          },
          emoji: {
            content: { tag: 'button', attrs: { className: 'Button' }, children: [':)'] },
            attrs: {},
            priority: 40,
          },
          'mystery-ext': {
            content: { tag: 'button', attrs: { className: 'Button' }, children: ['?'] },
            attrs: {},
            priority: 0,
          },
        },
      };
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

test('markdown is always overflow; upload/media/mention/emoji visible; submit once', () => {
  const controlKeys = ['submit', 'preview', 'fof-upload', 'fof-upload-media'];
  const toolbarKeys = ['markdown', 'mention', 'emoji', 'mystery-ext'];

  assert.equal(classifyActionKey('markdown'), 'markdown');
  assert.equal(classifyActionKey('fof-upload'), 'upload');
  assert.equal(classifyActionKey('fof-upload-media'), 'media');
  assert.equal(classifyActionKey('submit'), 'submit');

  const { visible, overflow } = partitionComposerActions(
    { controlKeys, toolbarKeys },
    { maxVisible: MAX_VISIBLE_ACTIONS }
  );

  const visibleKeys = visible.map((r) => r.key);
  const overflowKeys = overflow.map((r) => r.key);

  assert.deepEqual(visibleKeys, ['fof-upload', 'fof-upload-media', 'mention', 'emoji']);
  assert.ok(!visibleKeys.includes('markdown'), 'markdown must never be a top-level visible action');
  assert.ok(overflowKeys.includes('markdown'));
  assert.ok(overflowKeys.includes('preview'));
  assert.ok(overflowKeys.includes('mystery-ext'));
  assert.ok(!visibleKeys.includes('submit'));
  assert.ok(!overflowKeys.includes('submit'));
  assert.equal(visible.length, 4);
  assert.equal(assertNoHorizontalScrollbarIntent(visible.length, MAX_VISIBLE_ACTIONS), true);

  const toolbarList = {
    items: {
      emoji: { priority: 10 },
      mention: { priority: 50 },
      markdown: { priority: 100 },
    },
  };
  assert.deepEqual(orderedItemKeys(toolbarList), ['markdown', 'mention', 'emoji']);

  const legacy = partitionToolbarKeys(['markdown', 'mention', 'emoji', 'spoiler'], {
    maxVisible: MAX_VISIBLE_ACTIONS,
  });
  assert.ok(!legacy.visible.includes('markdown'));
  assert.ok(legacy.overflow.includes('markdown'));
  assert.ok(legacy.overflow.includes('spoiler'));
  assert.ok(legacy.visible.includes('mention'));
  assert.ok(legacy.visible.includes('emoji'));
});

test('360px docked budget includes buttons, gaps, padding, and zero list-item margins', () => {
  // 4 visible + overflow trigger + submit = 6 hits
  const width = estimateDockedFooterWidthPx({
    visibleActionCount: 4,
    hasOverflow: true,
    hasSubmit: true,
    hit: HIT_PX,
    gap: INLINE_GAP_PX,
    edgePadding: EDGE_PADDING_PX,
    itemMarginRight: 0,
  });
  // 16*2 + 6*44 + 5*2 = 32 + 264 + 10 = 306
  assert.equal(width, 306);
  assert.equal(assertFitsViewport(width, 360), true);

  const withInheritedMargins = estimateDockedFooterWidthPx({
    visibleActionCount: 4,
    hasOverflow: true,
    hasSubmit: true,
    itemMarginRight: 10,
  });
  assert.equal(assertFitsViewport(withInheritedMargins, 360), false);

  const lessSource = readFileSync(join(repoRoot, 'resources/less/composer-toolbar.less'), 'utf8');
  assert.ok(lessSource.includes('.FlatrateComposer-toolbar'));
  assert.match(lessSource, /> li \{[\s\S]*?margin-right:\s*0;/);
});

test('instrumented controlItems/toolbarItems each run once per mobile render', () => {
  const hooks = productionHooks();
  const nativeVnode = buildNativeTextEditorVnode(hooks);

  assert.equal(hooks.controlCalls(), 1, 'native view evaluates controlItems once');
  assert.equal(hooks.toolbarCalls(), 1, 'native view evaluates toolbarItems once');

  const toolbarChildren = nativeVnode.children[1].children[0].children;
  const originalMarkdown = toolbarChildren.find((v) => v.itemName === 'markdown');
  const originalMention = toolbarChildren.find((v) => v.itemName === 'mention');
  const originalEmoji = toolbarChildren.find((v) => v.itemName === 'emoji');

  assert.equal(actionKeyFromVnode(originalMarkdown), 'markdown');
  assert.equal(actionKeyFromVnode(originalMention), 'mention');
  assert.equal(actionKeyFromVnode(originalEmoji), 'emoji');
  assert.equal(Object.prototype.hasOwnProperty.call(originalMarkdown, 'itemName'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(originalMention, 'itemName'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(originalEmoji, 'itemName'), false);
  assert.equal(originalMarkdown.attrs.key, undefined);
  assert.equal(originalMention.attrs.itemName, undefined);
  assert.ok(!String(originalMarkdown.attrs.className || '').includes('item-markdown'));
  assert.equal(classifyActionKey(actionKeyFromVnode(originalMention)), 'mention');
  assert.equal(classifyActionKey(actionKeyFromVnode(originalEmoji)), 'emoji');
  assert.equal(classifyActionKey(actionKeyFromVnode(originalMarkdown)), 'markdown');

  const reflowed = reflowMobileTextEditorView(nativeVnode, { maxVisible: MAX_VISIBLE_ACTIONS });
  assert.ok(reflowed);
  assert.equal(hooks.controlCalls(), 1, 'reflow must not re-call controlItems');
  assert.equal(hooks.toolbarCalls(), 1, 'reflow must not re-call toolbarItems');

  assert.equal(
    reflowed.editorContainer.attrs.className,
    'TextEditor-editorContainer',
    'editorContainer remains first-child source'
  );

  const visibleKeys = reflowed.partitioned.visible.map((a) => a.key);
  const overflowKeys = reflowed.partitioned.overflow.map((a) => a.key);

  assert.deepEqual(visibleKeys, ['fof-upload', 'fof-upload-media', 'mention', 'emoji']);
  assert.ok(overflowKeys.includes('markdown'));
  assert.ok(overflowKeys.includes('preview'));
  assert.ok(overflowKeys.includes('mystery-ext'));
  assert.equal(reflowed.submitCount, 1);

  const markdownAction = reflowed.partitioned.overflow.find((a) => a.key === 'markdown');
  const mentionAction = reflowed.partitioned.visible.find((a) => a.key === 'mention');
  const emojiAction = reflowed.partitioned.visible.find((a) => a.key === 'emoji');
  assert.ok(markdownAction);
  assert.equal(normalizeChildrenCount(markdownAction.vnode), 11, 'MarkdownToolbar stays intact with 11 buttons');
  assert.equal(markdownAction.vnode, originalMarkdown, 'markdown VNode identity preserved');
  assert.equal(mentionAction.vnode, originalMention, 'mention VNode identity preserved');
  assert.equal(emojiAction.vnode, originalEmoji, 'emoji VNode identity preserved');

  assert.ok(
    !reflowed.partitioned.visible.some((a) => String(a.key).startsWith('unknown-')),
    'no known visible control classified as unknown-*'
  );
  assert.ok(
    !reflowed.partitioned.overflow
      .filter((a) => ['markdown', 'mention', 'emoji', 'preview', 'mystery-ext'].includes(a.key))
      .some((a) => String(a.key).startsWith('unknown-')),
    'named toolbar keys are not unknown-*'
  );

  // Nested Markdown button keys and references survive reflow (no recursive clone).
  const mdButtonsBefore = normalizeChildren(originalMarkdown.children);
  const mdButtonsAfter = normalizeChildren(markdownAction.vnode.children);
  assert.equal(mdButtonsAfter.length, 11);
  for (let i = 0; i < 11; i += 1) {
    assert.equal(mdButtonsAfter[i], mdButtonsBefore[i], `markdown button ${i} reference preserved`);
    assert.equal(mdButtonsAfter[i].attrs.key, `md-${i}`, `markdown button ${i} key preserved`);
  }

  const uploadAction = reflowed.partitioned.visible.find((a) => a.key === 'fof-upload');
  assert.ok(uploadAction);
  assert.equal(uploadAction.vnode, nativeVnode.children[1].children.find((c) => (c.attrs?.className || '').includes('item-fof-upload')));
});

test('ItemList Proxy itemName is readable without own property', () => {
  const target = { tag: 'button', attrs: {}, children: [] };
  const proxied = stampItemListProxy(target, 'mention');
  assert.equal(proxied.itemName, 'mention');
  assert.equal(Object.prototype.hasOwnProperty.call(proxied, 'itemName'), false);
  assert.equal(actionKeyFromVnode(proxied), 'mention');
  assert.equal(classifyActionKey(actionKeyFromVnode(proxied)), 'mention');

  const emoji = stampItemListProxy({ tag: 'button', attrs: {}, children: [] }, 'emoji');
  assert.equal(actionKeyFromVnode(emoji), 'emoji');
  assert.equal(classifyActionKey('emoji'), 'emoji');

  const markdown = stampItemListProxy({ tag: 'div', attrs: { className: 'MarkdownToolbar' }, children: [] }, 'markdown');
  assert.equal(actionKeyFromVnode(markdown), 'markdown');
  assert.equal(classifyActionKey('markdown'), 'markdown');
});

test('native footer extract preserves submit once and keeps markdown overflow', () => {
  const hooks = productionHooks();
  const native = buildNativeTextEditorVnode(hooks);
  const footer = native.children[1];
  const extracted = extractNativeFooterActions(footer);
  const partitioned = partitionExtractedActions(extracted);

  assert.ok(extracted.submitLi);
  assert.equal(countSubmitVnodes([...partitioned.visible.map((a) => a.vnode), partitioned.submitLi]), 1);

  assert.ok(!partitioned.visible.some((a) => a.key === 'markdown'));
  assert.ok(partitioned.overflow.some((a) => a.key === 'markdown'));
  assert.equal(partitioned.visible.length, 4);
});

test('client rollout gate fails closed except exact boolean true', () => {
  const forum = (value) => ({
    attribute(name) {
      assert.equal(name, 'flatrateComposerUiEnabled');
      return value;
    },
  });

  assert.equal(shouldInstallComposerPresentation(forum(true)), true);
  assert.equal(shouldInstallComposerPresentation(forum(false)), false);
  assert.equal(shouldInstallComposerPresentation(forum(undefined)), false);
  assert.equal(shouldInstallComposerPresentation(forum(null)), false);
  assert.equal(shouldInstallComposerPresentation(forum('true')), false);
  assert.equal(shouldInstallComposerPresentation(forum('1')), false);
  assert.equal(shouldInstallComposerPresentation(forum(1)), false);
  assert.equal(shouldInstallComposerPresentation(null), false);
  assert.equal(shouldInstallComposerPresentation({}), false);

  assert.equal(isComposerPresentationAttributeEnabled(true), true);
  assert.equal(isComposerPresentationAttributeEnabled('true'), false);

  // Flarum Application.boot runs initializers before app.forum exists, so the
  // fail-closed gate must be decoration-time (extendComposer), not init-time.
  const indexSrc = readFileSync(join(repoRoot, 'js/src/forum/index.js'), 'utf8');
  assert.ok(indexSrc.includes('extendComposer()'));
  assert.equal((indexSrc.match(/extendComposer\(\)/g) || []).length, 1);
  assert.doesNotMatch(indexSrc, /if \(!shouldInstallComposerPresentation/);

  const extendSrc = readFileSync(join(repoRoot, 'js/src/forum/extendComposer.js'), 'utf8');
  assert.match(extendSrc, /shouldInstallComposerPresentation\(app\.forum\)/);
  assert.match(extendSrc, /function isRolloutMobile/);
  assert.doesNotMatch(extendSrc, /function stripVnodeKey/);
  assert.doesNotMatch(extendSrc, /hasOwnProperty\.call\(vnode,\s*['"]itemName['"]\)/);
  // Lifecycle side effects must re-check the exact-true actor gate.
  assert.match(extendSrc, /extend\(Composer\.prototype,\s*'oncreate'/);
  assert.match(
    extendSrc,
    /oncreate[\s\S]*?if\s*\(\s*!shouldInstallComposerPresentation\(app\.forum\)\s*\)/
  );
  assert.match(
    extendSrc,
    /onupdate[\s\S]*?if\s*\(\s*!shouldInstallComposerPresentation\(app\.forum\)\s*\)/
  );
  assert.match(
    extendSrc,
    /ReplyComposer\.prototype,\s*'oncreate'[\s\S]*?if\s*\(\s*!shouldInstallComposerPresentation\(app\.forum\)\s*\)/
  );
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

function normalizeChildrenCount(vnode) {
  if (!vnode) return 0;
  if (Array.isArray(vnode.children)) return vnode.children.length;
  return 0;
}
