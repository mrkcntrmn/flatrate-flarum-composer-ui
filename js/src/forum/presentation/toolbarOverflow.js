/**
 * Partition native TextEditor control/toolbar ItemList contributions.
 * Respects Flarum ItemList priority order and production topology:
 * - Markdown v1.8.1 contributes one `markdown` toolbar item (nested buttons).
 * - Mentions / Emoji contribute toolbar items.
 * - FoF Upload contributes `fof-upload` / `fof-upload-media` via controlItems().
 * - Preview is a control item; submit is excluded from overflow partitioning.
 */

export const VISIBLE_PRIORITY = ['upload', 'media', 'mention', 'markdown', 'emoji'];

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

/**
 * Heuristic classifiers for Flarum / FoF action keys.
 */
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
 * @typedef {{ source: 'control' | 'toolbar', key: string }} ActionRef
 */

/**
 * Partition control + toolbar keys into visible primary actions and overflow.
 * Preserves ItemList priority order within each source, then merges by priority class.
 *
 * @param {{ controlKeys?: string[], toolbarKeys?: string[] }} lists
 * @param {{ maxVisible?: number, narrow?: boolean }} [options]
 * @returns {{ visible: ActionRef[], overflow: ActionRef[] }}
 */
export function partitionComposerActions(lists = {}, options = {}) {
  const maxVisible = typeof options.maxVisible === 'number' ? options.maxVisible : 5;
  const narrow = !!options.narrow;

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

  // Narrow screens: move preview out of the primary strip if it was claimed.
  if (narrow) {
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      if (classifyActionKey(visible[i].key) === 'preview') {
        overflow.unshift(visible.splice(i, 1)[0]);
      }
    }
  }

  return { visible, overflow };
}

/**
 * Legacy key-only partition (tests / callers that only have toolbar keys).
 */
export function partitionToolbarKeys(keys, options = {}) {
  const { visible, overflow } = partitionComposerActions({ toolbarKeys: keys }, options);
  return {
    visible: visible.map((ref) => ref.key),
    overflow: overflow.map((ref) => ref.key),
  };
}

export function assertNoHorizontalScrollbarIntent(visibleCount, maxVisible = 5) {
  return visibleCount <= maxVisible;
}
