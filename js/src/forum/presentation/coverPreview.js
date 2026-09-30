/**
 * Native FoF Upload -> discussion cover-preview helpers.
 *
 * Candidates are admitted only from FoF Upload's success event. Typed external
 * URLs are never promoted into the candidate set.
 */

export const COVER_MEDIA_HOST = 'media.flatrate.wiki';

export const COVER_IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function callStringMethod(target, name) {
  if (!target || typeof target[name] !== 'function') return '';
  const value = target[name]();
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeNativeUploadUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;

  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== COVER_MEDIA_HOST) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function candidateFromNativeUpload(file) {
  const type = callStringMethod(file, 'type').toLowerCase();
  if (!COVER_IMAGE_MIME_TYPES.includes(type)) return null;

  const url = normalizeNativeUploadUrl(callStringMethod(file, 'url'));
  const uuid = callStringMethod(file, 'uuid');
  if (!url || !uuid) return null;

  return { uuid, url, type };
}

export function appendCoverCandidate(candidates, candidate) {
  const current = Array.isArray(candidates) ? candidates : [];
  if (!candidate) return current;

  if (current.some((item) => item.uuid === candidate.uuid || item.url === candidate.url)) {
    return current;
  }

  return [...current, candidate];
}

export function candidateReferencedByContent(candidate, content) {
  if (!candidate || typeof content !== 'string') return false;
  return content.includes(candidate.uuid) || content.includes(candidate.url);
}

export function resolveActiveCoverCandidate(candidates, content) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  return candidates.find((candidate) => candidateReferencedByContent(candidate, content)) || null;
}
