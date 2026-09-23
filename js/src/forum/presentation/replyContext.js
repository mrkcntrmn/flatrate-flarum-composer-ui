/**
 * Targeted-reply presentation derived from canonical mention/quote text.
 * Never persists a separate reply-target model.
 *
 * Only a leading post-mention token (optional leading whitespace) qualifies.
 * Mentions later in ordinary prose are not reply context.
 *
 * Matches Flarum Mentions post tokens such as: @"Display Name"#p123
 */

const LEADING_POST_MENTION_RE = /^\s*(@"([^"]+)"#p(\d+))/;
const POST_MENTION_GLOBAL_RE = /@"([^"]+)"#p(\d+)/g;

/**
 * @param {string} content
 * @returns {{ username: string, postId: string, token: string, index: number } | null}
 */
export function deriveReplyContext(content) {
  if (typeof content !== 'string' || !content) {
    return null;
  }
  const match = LEADING_POST_MENTION_RE.exec(content);
  if (!match) {
    return null;
  }
  const leading = match[0];
  const token = match[1];
  return {
    username: match[2],
    postId: match[3],
    token,
    index: leading.length - token.length,
  };
}

/**
 * Lossless removal of the canonical leading reply token (+ one trailing space).
 *
 * @returns {{ next: string, removed: boolean }}
 */
export function removeReplyContextToken(content, context) {
  if (!context || typeof content !== 'string') {
    return { next: content, removed: false };
  }

  const live = deriveReplyContext(content);
  if (!live || live.token !== context.token || live.index !== context.index) {
    return { next: content, removed: false };
  }

  const match = LEADING_POST_MENTION_RE.exec(content);
  if (!match) {
    return { next: content, removed: false };
  }

  let end = match[0].length;
  if (content[end] === ' ') {
    end += 1;
  }

  return { next: content.slice(end), removed: true };
}

/**
 * True when the derived row still matches the live editor text exactly.
 */
export function isReplyContextInSync(content, context) {
  if (!context) {
    return false;
  }
  const live = deriveReplyContext(content);
  if (!live) {
    return false;
  }
  return live.token === context.token && live.username === context.username && live.postId === context.postId;
}

export function countPostMentionTokens(content) {
  if (typeof content !== 'string' || !content) {
    return 0;
  }
  const matches = content.match(POST_MENTION_GLOBAL_RE);
  return matches ? matches.length : 0;
}
