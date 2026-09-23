/**
 * Scoped discussion stream bottom inset for docked reply.
 * Restores previous styles and scroll anchor on cleanup.
 */

const STYLE_ATTR = 'data-flatrate-composer-inset';

export function applyDiscussionInset(contentEl, heightPx) {
  if (!contentEl || typeof heightPx !== 'number' || heightPx < 0) {
    return null;
  }

  if (!contentEl.getAttribute(STYLE_ATTR)) {
    contentEl.setAttribute(STYLE_ATTR, contentEl.style.paddingBottom || '');
  }
  contentEl.style.paddingBottom = `${Math.round(heightPx)}px`;
  return heightPx;
}

export function clearDiscussionInset(contentEl) {
  if (!contentEl) {
    return;
  }
  const previous = contentEl.getAttribute(STYLE_ATTR);
  if (previous !== null) {
    contentEl.style.paddingBottom = previous;
    contentEl.removeAttribute(STYLE_ATTR);
  }
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
