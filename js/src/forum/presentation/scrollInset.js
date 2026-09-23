/**
 * Scoped discussion stream bottom inset for docked reply.
 * Restores previous styles and scroll anchor on cleanup.
 */

const STYLE_ATTR = 'data-flatrate-composer-inset';

function hasInsetMarker(contentEl) {
  if (!contentEl) {
    return false;
  }
  if (typeof contentEl.hasAttribute === 'function') {
    return contentEl.hasAttribute(STYLE_ATTR);
  }
  // Test doubles may only implement getAttribute.
  return contentEl.getAttribute(STYLE_ATTR) !== null;
}

export function applyDiscussionInset(contentEl, heightPx) {
  if (!contentEl || typeof heightPx !== 'number' || heightPx < 0) {
    return null;
  }

  // Marker presence (not value truthiness) — empty string is a valid original.
  if (!hasInsetMarker(contentEl)) {
    const original = contentEl.style && typeof contentEl.style.paddingBottom === 'string' ? contentEl.style.paddingBottom : '';
    contentEl.setAttribute(STYLE_ATTR, original);
  }
  contentEl.style.paddingBottom = `${Math.round(heightPx)}px`;
  return heightPx;
}

export function clearDiscussionInset(contentEl) {
  if (!contentEl) {
    return;
  }
  if (!hasInsetMarker(contentEl)) {
    return;
  }
  const previous = contentEl.getAttribute(STYLE_ATTR);
  contentEl.style.paddingBottom = previous === null ? '' : previous;
  contentEl.removeAttribute(STYLE_ATTR);
}

export function measureDockHeight(composerEl, safeAreaBottom = 0) {
  if (!composerEl) {
    return 0;
  }
  const rect = composerEl.getBoundingClientRect();
  const height = rect && typeof rect.height === 'number' ? rect.height : 0;
  return Math.max(0, Math.round(height + (safeAreaBottom || 0)));
}

export function restoreScrollTop(scrollEl, scrollTop) {
  if (!scrollEl || typeof scrollTop !== 'number') {
    return false;
  }
  scrollEl.scrollTop = scrollTop;
  return true;
}
