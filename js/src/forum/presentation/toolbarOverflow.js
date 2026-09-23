/**
 * Partition native TextEditor toolbar ItemList keys into visible + overflow.
 * Unknown keys fail open into overflow (never disappear).
 */

export const VISIBLE_PRIORITY = ['upload', 'media', 'mention', 'bold', 'italic', 'link'];

/**
 * Heuristic key classifiers for common Flarum / FoF toolbar contributions.
 */
export function classifyToolbarKey(key) {
  const k = String(key || '').toLowerCase();
  if (!k) {
    return 'unknown';
  }
  if (k.includes('upload') || k === 'fof-upload' || k === 'fof-upload-button') {
    return 'upload';
  }
  if (k.includes('media') || k.includes('my-media') || k === 'fof-upload-media') {
    return 'media';
  }
  if (k.includes('mention')) {
    return 'mention';
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

/**
 * @param {string[]} keys - ItemList keys in original order
 * @param {{ maxVisible?: number, narrow?: boolean }} [options]
 * @returns {{ visible: string[], overflow: string[] }}
 */
export function partitionToolbarKeys(keys, options = {}) {
  const maxVisible = typeof options.maxVisible === 'number' ? options.maxVisible : 5;
  const narrow = !!options.narrow;
  const list = Array.isArray(keys) ? keys.slice() : [];

  const byClass = new Map();
  for (const key of list) {
    const cls = classifyToolbarKey(key);
    if (!byClass.has(cls)) {
      byClass.set(cls, []);
    }
    byClass.get(cls).push(key);
  }

  const visible = [];
  const claimed = new Set();

  for (const cls of VISIBLE_PRIORITY) {
    if (visible.length >= maxVisible) {
      break;
    }
    const bucket = byClass.get(cls) || [];
    for (const key of bucket) {
      if (visible.length >= maxVisible) {
        break;
      }
      visible.push(key);
      claimed.add(key);
    }
  }

  const overflow = [];
  for (const key of list) {
    if (claimed.has(key)) {
      continue;
    }
    // On narrow screens, push preview into overflow preferentially.
    if (narrow && classifyToolbarKey(key) === 'preview') {
      overflow.push(key);
      continue;
    }
    overflow.push(key);
  }

  // If preview was selected into visible on narrow, move it.
  if (narrow) {
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      if (classifyToolbarKey(visible[i]) === 'preview') {
        overflow.unshift(visible.splice(i, 1)[0]);
      }
    }
  }

  return { visible, overflow };
}

/**
 * Prove no native horizontal scrollbar intent: visible count is capped.
 */
export function assertNoHorizontalScrollbarIntent(visibleCount, maxVisible = 5) {
  return visibleCount <= maxVisible;
}
