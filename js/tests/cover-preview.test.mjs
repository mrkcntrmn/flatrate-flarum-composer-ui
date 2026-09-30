import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COVER_IMAGE_MIME_TYPES,
  appendCoverCandidate,
  candidateFromNativeUpload,
  candidateReferencedByContent,
  normalizeNativeUploadUrl,
  resolveActiveCoverCandidate,
} from '../src/forum/presentation/coverPreview.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

function nativeFile({ type = 'image/jpeg', url = 'https://media.flatrate.wiki/2026/cover.jpg', uuid = '11111111-2222-4333-8444-555555555555' } = {}) {
  return {
    type: () => type,
    url: () => url,
    uuid: () => uuid,
  };
}

test('native upload candidate is narrow image + qualified media origin only', () => {
  assert.deepEqual(COVER_IMAGE_MIME_TYPES, ['image/jpeg', 'image/png', 'image/webp']);

  assert.deepEqual(candidateFromNativeUpload(nativeFile()), {
    type: 'image/jpeg',
    url: 'https://media.flatrate.wiki/2026/cover.jpg',
    uuid: '11111111-2222-4333-8444-555555555555',
  });

  assert.equal(candidateFromNativeUpload(nativeFile({ type: 'image/gif' })), null);
  assert.equal(candidateFromNativeUpload(nativeFile({ type: 'image/svg+xml' })), null);
  assert.equal(candidateFromNativeUpload(nativeFile({ url: 'https://example.com/cover.jpg' })), null);
  assert.equal(candidateFromNativeUpload(nativeFile({ url: 'http://media.flatrate.wiki/cover.jpg' })), null);
  assert.equal(candidateFromNativeUpload(nativeFile({ uuid: '' })), null);

  assert.equal(
    normalizeNativeUploadUrl('https://media.flatrate.wiki/a/b.webp'),
    'https://media.flatrate.wiki/a/b.webp'
  );
  assert.equal(normalizeNativeUploadUrl('https://evil.example/a.webp'), null);
});

test('first eligible native upload remains cover while its canonical token is present', () => {
  const first = candidateFromNativeUpload(nativeFile());
  const second = candidateFromNativeUpload(
    nativeFile({
      type: 'image/webp',
      url: 'https://media.flatrate.wiki/2026/second.webp',
      uuid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    })
  );

  let candidates = appendCoverCandidate([], first);
  candidates = appendCoverCandidate(candidates, second);
  candidates = appendCoverCandidate(candidates, first);
  assert.equal(candidates.length, 2);

  const both = `[upl-image-preview uuid=${first.uuid} url=${first.url}]
[upl-image-preview uuid=${second.uuid} url=${second.url}]`;

  assert.equal(resolveActiveCoverCandidate(candidates, both), first);
  assert.equal(candidateReferencedByContent(first, both), true);

  const firstRemoved = `[upl-image-preview uuid=${second.uuid} url=${second.url}]`;
  assert.equal(resolveActiveCoverCandidate(candidates, firstRemoved), second);
  assert.equal(resolveActiveCoverCandidate(candidates, 'plain text only'), null);
});

test('typed external URLs cannot create candidates', () => {
  const typed = '![external](https://example.com/image.jpg)';
  assert.equal(resolveActiveCoverCandidate([], typed), null);
  assert.equal(resolveActiveCoverCandidate(null, typed), null);
});

test('composer source subscribes to FoF success without invoking a second uploader', () => {
  const source = readFileSync(join(repoRoot, 'js/src/forum/extendComposer.js'), 'utf8');

  assert.match(source, /this\.uploader\.on\('success'/);
  assert.match(source, /addEventListener\('input'/);
  assert.match(source, /m\.redraw\(\)/);
  assert.doesNotMatch(source, /this\.uploader\.upload\(/);
  assert.match(source, /candidateFromNativeUpload\(file\)/);
  assert.match(source, /resolveActiveCoverCandidate/);
  assert.match(source, /FlatrateComposer-coverPreview/);

  // Existing invariants stay explicit: one native TextEditor view and one native
  // footer extraction/reflow path, rather than creating a second editor.
  assert.equal((source.match(/override\(TextEditor\.prototype, 'view'/g) || []).length, 1);
  assert.doesNotMatch(source, /new TextEditor/);
});

test('cover preview styling keeps 16:9 crop and mobile-only shell', () => {
  const less = readFileSync(join(repoRoot, 'resources/less/composer-shell.less'), 'utf8');
  assert.match(less, /\.FlatrateComposer-coverPreviewFrame/);
  assert.match(less, /aspect-ratio:\s*16 \/ 9/);
  assert.match(less, /object-fit:\s*cover/);
  assert.match(less, /@media @tablet-up[\s\S]*?\.FlatrateComposer-coverPreview/);
});
