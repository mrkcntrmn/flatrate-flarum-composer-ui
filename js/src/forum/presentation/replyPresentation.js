/**
 * Ephemeral reply presentation state. Not persisted with the post.
 * Expand/collapse must never remount ComposerBody / TextEditor.
 */

let replyExpanded = false;
let replyFocused = false;
let scrollAnchor = null;

export function getReplyExpanded() {
  return replyExpanded;
}

export function setReplyExpanded(value) {
  replyExpanded = !!value;
  return replyExpanded;
}

export function toggleReplyExpanded() {
  replyExpanded = !replyExpanded;
  return replyExpanded;
}

export function getReplyFocused() {
  return replyFocused;
}

export function setReplyFocused(value) {
  replyFocused = !!value;
  return replyFocused;
}

export function resetReplyPresentation() {
  replyExpanded = false;
  replyFocused = false;
  scrollAnchor = null;
}

export function captureScrollAnchor(scrollTop) {
  scrollAnchor = typeof scrollTop === 'number' ? scrollTop : null;
  return scrollAnchor;
}

export function consumeScrollAnchor() {
  const value = scrollAnchor;
  scrollAnchor = null;
  return value;
}

export function peekScrollAnchor() {
  return scrollAnchor;
}

/**
 * Docked reply height grows with content but stays bounded.
 * Never auto-expands into fullscreen from line count alone.
 */
export function computeDockedEditorMaxPx(viewportHeight) {
  const vh = typeof viewportHeight === 'number' ? viewportHeight : 800;
  return Math.min(Math.round(vh * 0.42), 360);
}
