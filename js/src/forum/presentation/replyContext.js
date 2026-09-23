/**
 * Targeted-reply presentation derived from canonical mention/quote text.
 * Never persists a separate reply-target model.
 *
 * Matches Flarum Mentions post tokens such as: @"Display Name"#p123
 */

const POST_MENTION_RE = /@"([^"]+)"#p(\d+)/;
const POST_MENTION_GLOBAL_RE = /@"([^"]+)"#p(\d+)/g;

/**
 * @param {string} content
 * @returns {{ username: string, postId: string, token: string, index: number } | null}
 */
export function deriveReplyContext(content) {
  if (typeof content !== 'string' || !content) {
    return null;
  }
  const match = POST_MENTION_RE.exec(content);
  if (!match) {
    return null;
  }
  return {
    username: match[1],
    postId: match[2],
    token: match[0],
    index: match.index,
  };
}

/**
 * Lossless removal: only remove the exact leading/first token plus one
 * trailing space when present, and only when that is the sole matched token
 * at the derived index.
 *
 * @returns {{ next: string, removed: boolean }}
 */
export function removeReplyContextToken(content, context) {
  if (!context || typeof content !== 'string') {
    return { next: content, removed: false };
  }

  const at = content.indexOf(context.token);
  if (at !== context.index || at < 0) {
    return { next: content, removed: false };
  }

  let end = at + context.token.length;
  if (content[end] === ' ') {
    end += 1;
  }

  const next = content.slice(0, at) + content.slice(end);
  return { next, removed: true };
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
