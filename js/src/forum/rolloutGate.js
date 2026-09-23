/**
 * Client fail-closed gate for the mobile composer presentation shell.
 *
 * The forum payload attribute must be the JSON boolean true. Missing values,
 * string "true", and any other truthy-looking value keep the native composer.
 * This is a presentation rollout control, not a security boundary.
 */

/**
 * @param {{ attribute?: (name: string) => unknown } | null | undefined} forum
 * @returns {boolean}
 */
export function shouldInstallComposerPresentation(forum) {
  if (!forum || typeof forum.attribute !== 'function') {
    return false;
  }
  return forum.attribute('flatrateComposerUiEnabled') === true;
}

/**
 * @param {unknown} rawAttribute
 * @returns {boolean}
 */
export function isComposerPresentationAttributeEnabled(rawAttribute) {
  return rawAttribute === true;
}
