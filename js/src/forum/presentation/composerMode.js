/**
 * Mobile boundary matches Flarum @phone: max-width 767.98px.
 * Desktop/tablet at 768px+ stays native.
 */

export const MOBILE_MAX_WIDTH_PX = 767.98;

export function isMobileViewport(width) {
  const w = typeof width === 'number' ? width : getViewportWidth();
  return w < 768;
}

export function getViewportWidth() {
  if (typeof window === 'undefined') {
    return 1024;
  }
  if (window.visualViewport && typeof window.visualViewport.width === 'number') {
    return window.visualViewport.width;
  }
  return window.innerWidth || document.documentElement.clientWidth || 1024;
}

/**
 * @param {object|null} body - ComposerState.body
 * @param {{ DiscussionComposer?: Function, ReplyComposer?: Function, EditPostComposer?: Function }} types
 */
export function resolveComposerKind(body, types) {
  const componentClass = body && body.componentClass;
  if (!componentClass) {
    return 'none';
  }

  if (types.EditPostComposer && isSameOrSubclass(componentClass, types.EditPostComposer)) {
    return 'edit';
  }
  if (types.DiscussionComposer && isSameOrSubclass(componentClass, types.DiscussionComposer)) {
    return 'discussion';
  }
  if (types.ReplyComposer && isSameOrSubclass(componentClass, types.ReplyComposer)) {
    return 'reply';
  }
  return 'other';
}

function isSameOrSubclass(candidate, base) {
  if (!candidate || !base) {
    return false;
  }
  if (candidate === base) {
    return true;
  }
  return typeof candidate.prototype === 'object' && candidate.prototype instanceof base;
}

/**
 * Presentation mode for FlatRate mobile shell.
 * EditPostComposer remains native even on mobile.
 */
export function resolvePresentationMode({ kind, mobile, replyExpanded }) {
  if (!mobile || kind === 'none' || kind === 'edit' || kind === 'other') {
    return 'native';
  }
  if (kind === 'discussion') {
    return 'discussion-fullscreen';
  }
  if (kind === 'reply') {
    return replyExpanded ? 'reply-expanded' : 'reply-docked';
  }
  return 'native';
}

export function modeClassNames(mode) {
  const classes = ['Composer--flatrateMobile'];
  switch (mode) {
    case 'discussion-fullscreen':
      classes.push('Composer--flatrateDiscussion');
      break;
    case 'reply-docked':
      classes.push('Composer--flatrateReplyDocked');
      break;
    case 'reply-expanded':
      classes.push('Composer--flatrateReplyExpanded');
      break;
    default:
      return [];
  }
  return classes;
}
