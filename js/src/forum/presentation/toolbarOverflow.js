/**
 * Partition native TextEditor control/toolbar contributions for mobile.
 *
 * Production topology (Flarum 1.8.19):
 * - Markdown v1.8.1 contributes one `markdown` toolbar item with ~11 nested buttons.
 *   It must NEVER count as a single visible 44px action — always overflow.
 * - Mentions / Emoji contribute toolbar items.
 * - FoF Upload contributes `fof-upload` / `fof-upload-media` via controlItems().
 * - Preview is a control item; submit is excluded from partitioning.
 *
 * Visible budget: at most 4 ordinary actions (+ overflow trigger + submit outside).
 */

/** Preferred visible strip when authorized — markdown intentionally absent. */
export const VISIBLE_PRIORITY = ['upload', 'media', 'mention', 'emoji'];

/** Always overflow regardless of remaining visible slots. */
export const FORCE_OVERFLOW_CLASSES = ['markdown', 'preview'];

export const MAX_VISIBLE_ACTIONS = 4;
export const HIT_PX = 44;
export const INLINE_GAP_PX = 2;
export const EDGE_PADDING_PX = 16;

/**
 * Ordered keys from an ItemList, highest priority first (Flarum toArray order).
 * @param {{ items?: Record<string, { priority?: number }> } | null | undefined} itemList
 * @returns {string[]}
 */
export function orderedItemKeys(itemList) {
  if (!itemList || !itemList.items) {
    return [];
  }
  return Object.keys(itemList.items)
    .map((key) => ({
      key,
      priority: typeof itemList.items[key].priority === 'number' ? itemList.items[key].priority : 0,
    }))
    .sort((a, b) => b.priority - a.priority)
    .map((entry) => entry.key);
}

export function classifyActionKey(key) {
  const k = String(key || '').toLowerCase();
  if (!k) {
    return 'unknown';
  }
  if (k === 'submit') {
    return 'submit';
  }
  if (k.includes('upload') && k.includes('media')) {
    return 'media';
  }
  if (k.includes('upload') || k === 'fof-upload' || k === 'fof-upload-button') {
    return 'upload';
  }
  if (k.includes('media') || k.includes('my-media')) {
    return 'media';
  }
  if (k.includes('mention')) {
    return 'mention';
  }
  if (k === 'markdown' || k.includes('markdown')) {
    return 'markdown';
  }
  if (k === 'bold' || k.endsWith('-bold')) {
    return 'bold';
  }
  if (k === 'italic' || k.endsWith('-italic')) {
    return 'italic';
  }
  if (k === 'link' || k.endsWith('-link')) {
    return 'link';
  }
  if (k.includes('preview')) {
    return 'preview';
  }
  if (k.includes('emoji')) {
    return 'emoji';
  }
  return 'unknown';
}

/** @deprecated use classifyActionKey */
export function classifyToolbarKey(key) {
  return classifyActionKey(key);
}

/**
 * @typedef {{ source: 'control' | 'toolbar', key: string, vnode?: unknown }} ActionRef
 */

/**
 * @param {{ controlKeys?: string[], toolbarKeys?: string[] }} lists
 * @param {{ maxVisible?: number }} [options]
 * @returns {{ visible: ActionRef[], overflow: ActionRef[] }}
 */
export function partitionComposerActions(lists = {}, options = {}) {
  const maxVisible = typeof options.maxVisible === 'number' ? options.maxVisible : MAX_VISIBLE_ACTIONS;

  /** @type {ActionRef[]} */
  const ordered = [];
  for (const key of lists.controlKeys || []) {
    if (classifyActionKey(key) === 'submit') {
      continue;
    }
    ordered.push({ source: 'control', key });
  }
  for (const key of lists.toolbarKeys || []) {
    ordered.push({ source: 'toolbar', key });
  }

  const byClass = new Map();
  for (const ref of ordered) {
    const cls = classifyActionKey(ref.key);
    if (!byClass.has(cls)) {
      byClass.set(cls, []);
    }
    byClass.get(cls).push(ref);
  }

  /** @type {ActionRef[]} */
  const visible = [];
  const claimed = new Set();
  const claimKey = (ref) => `${ref.source}:${ref.key}`;

  for (const cls of VISIBLE_PRIORITY) {
    if (FORCE_OVERFLOW_CLASSES.includes(cls)) {
      continue;
    }
    if (visible.length >= maxVisible) {
      break;
    }
    for (const ref of byClass.get(cls) || []) {
      if (visible.length >= maxVisible) {
        break;
      }
      visible.push(ref);
      claimed.add(claimKey(ref));
    }
  }

  /** @type {ActionRef[]} */
  const overflow = [];
  for (const ref of ordered) {
    if (claimed.has(claimKey(ref))) {
      continue;
    }
    overflow.push(ref);
  }

  // Safety: never leave markdown/preview in the visible strip.
  for (let i = visible.length - 1; i >= 0; i -= 1) {
    const cls = classifyActionKey(visible[i].key);
    if (FORCE_OVERFLOW_CLASSES.includes(cls)) {
      overflow.unshift(visible.splice(i, 1)[0]);
    }
  }

  return { visible, overflow };
}

export function partitionToolbarKeys(keys, options = {}) {
  const { visible, overflow } = partitionComposerActions({ toolbarKeys: keys }, options);
  return {
    visible: visible.map((ref) => ref.key),
    overflow: overflow.map((ref) => ref.key),
  };
}

/**
 * Estimate docked footer width using real action slot widths (not markdown key count).
 * Assumes list-item margin-right has been reset to 0.
 */
export function estimateDockedFooterWidthPx(options = {}) {
  const visibleActionCount = typeof options.visibleActionCount === 'number' ? options.visibleActionCount : 0;
  const hasOverflow = !!options.hasOverflow;
  const hasSubmit = options.hasSubmit !== false;
  const hit = typeof options.hit === 'number' ? options.hit : HIT_PX;
  const gap = typeof options.gap === 'number' ? options.gap : INLINE_GAP_PX;
  const edgePadding = typeof options.edgePadding === 'number' ? options.edgePadding : EDGE_PADDING_PX;
  const itemMarginRight = typeof options.itemMarginRight === 'number' ? options.itemMarginRight : 0;

  const buttons = visibleActionCount + (hasOverflow ? 1 : 0) + (hasSubmit ? 1 : 0);
  const gaps = Math.max(0, buttons - 1) * gap;
  const margins = buttons * itemMarginRight;
  return edgePadding * 2 + buttons * hit + gaps + margins;
}

export function assertFitsViewport(widthPx, viewportPx = 360) {
  return widthPx <= viewportPx;
}

export function assertNoHorizontalScrollbarIntent(visibleCount, maxVisible = MAX_VISIBLE_ACTIONS) {
  return visibleCount <= maxVisible;
}
