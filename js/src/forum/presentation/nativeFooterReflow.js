/**
 * Reflow the native TextEditor footer using VNodes already produced by one
 * `original()` / `view()` evaluation. Does not call controlItems() or
 * toolbarItems() again.
 */

import {
  classifyActionKey,
  partitionComposerActions,
  MAX_VISIBLE_ACTIONS,
} from './toolbarOverflow.js';

/**
 * @param {unknown} value
 * @returns {any[]}
 */
export function normalizeChildren(value) {
  if (value == null || value === false) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.reduce((acc, child) => acc.concat(normalizeChildren(child)), []);
  }
  // Mithril fragment / trusted text nodes — unwrap so ItemList rows stay siblings.
  if (typeof value === 'object' && (value.tag === '[' || value.tag === '#')) {
    return normalizeChildren(value.children);
  }
  return [value];
}

export function classNameOf(vnode) {
  if (!vnode || typeof vnode !== 'object') {
    return '';
  }
  const attrs = vnode.attrs || {};
  return String(attrs.className || attrs.class || '');
}

export function itemKeyFromClassName(className) {
  const match = String(className || '').match(/(?:^|\s)item-([^\s]+)/);
  return match ? match[1] : null;
}

export function actionKeyFromVnode(vnode) {
  if (!vnode || typeof vnode !== 'object') {
    return null;
  }

  // Flarum 1.8.19 ItemList.toArray() stamps the item key on the content proxy
  // as vnode.itemName — inspect that before attrs/classes. Do not mutate vnode.
  if (Object.prototype.hasOwnProperty.call(vnode, 'itemName') && vnode.itemName != null && vnode.itemName !== '') {
    return String(vnode.itemName);
  }

  const attrs = vnode.attrs || {};
  if (attrs.key != null) {
    return String(attrs.key);
  }
  if (attrs.itemName != null) {
    return String(attrs.itemName);
  }
  const fromClass = itemKeyFromClassName(classNameOf(vnode));
  if (fromClass && fromClass !== 'flatrateOverflow') {
    return fromClass;
  }
  return null;
}

/**
 * Parse the native `.TextEditor-controls` footer into keyed action refs that
 * retain the original VNodes created during the single native view evaluation.
 *
 * @returns {{
 *   submitLi: any | null,
 *   actions: Array<{ source: 'control' | 'toolbar', key: string, vnode: any, wrapLi: boolean }>
 * }}
 */
export function extractNativeFooterActions(footerVnode) {
  const actions = [];
  let submitLi = null;

  for (const child of normalizeChildren(footerVnode && footerVnode.children)) {
    const cls = classNameOf(child);
    if (cls.includes('TextEditor-toolbar')) {
      for (const toolbarChild of normalizeChildren(child.children)) {
        const key = actionKeyFromVnode(toolbarChild);
        if (!key) {
          // Unknown unlabeled contribution — keep reachable in overflow.
          actions.push({
            source: 'toolbar',
            key: `unknown-${actions.length}`,
            vnode: toolbarChild,
            wrapLi: true,
          });
          continue;
        }
        actions.push({
          source: 'toolbar',
          key,
          vnode: toolbarChild,
          wrapLi: true,
        });
      }
      continue;
    }

    const key = itemKeyFromClassName(cls) || actionKeyFromVnode(child);
    if (!key) {
      actions.push({
        source: 'control',
        key: `unknown-${actions.length}`,
        vnode: child,
        wrapLi: false,
      });
      continue;
    }

    if (classifyActionKey(key) === 'submit' || key === 'submit') {
      submitLi = child;
      continue;
    }

    actions.push({
      source: 'control',
      key,
      vnode: child,
      wrapLi: false,
    });
  }

  return { submitLi, actions };
}

/**
 * Partition extracted footer actions without re-querying ItemLists.
 */
export function partitionExtractedActions(extracted, options = {}) {
  const maxVisible = typeof options.maxVisible === 'number' ? options.maxVisible : MAX_VISIBLE_ACTIONS;
  const controlKeys = [];
  const toolbarKeys = [];
  const byRef = new Map();

  for (const action of extracted.actions || []) {
    const id = `${action.source}:${action.key}`;
    byRef.set(id, action);
    if (action.source === 'control') {
      controlKeys.push(action.key);
    } else {
      toolbarKeys.push(action.key);
    }
  }

  const { visible, overflow } = partitionComposerActions(
    { controlKeys, toolbarKeys },
    { maxVisible }
  );

  const hydrate = (refs) =>
    refs
      .map((ref) => byRef.get(`${ref.source}:${ref.key}`))
      .filter(Boolean);

  return {
    visible: hydrate(visible),
    overflow: hydrate(overflow),
    submitLi: extracted.submitLi || null,
  };
}

/**
 * Count submit list items among footer children (for tests / runtime asserts).
 */
export function countSubmitVnodes(footerChildren) {
  return normalizeChildren(footerChildren).filter((child) => {
    const key = itemKeyFromClassName(classNameOf(child)) || actionKeyFromVnode(child);
    return key === 'submit' || classifyActionKey(key || '') === 'submit';
  }).length;
}

/**
 * Locate the native `.TextEditor-controls` footer among TextEditor root children.
 */
export function findNativeControlsFooter(textEditorVnode) {
  for (const child of normalizeChildren(textEditorVnode && textEditorVnode.children)) {
    if (classNameOf(child).includes('TextEditor-controls')) {
      return child;
    }
  }
  return null;
}

/**
 * Pure reflow of a native TextEditor VNode for mobile.
 * Consumes only the already-built tree from one `original()` / `view()` call.
 * Never evaluates controlItems() or toolbarItems().
 *
 * @param {any} nativeVnode
 * @param {{ maxVisible?: number }} [options]
 * @returns {{
 *   editorContainer: any,
 *   partitioned: ReturnType<typeof partitionExtractedActions>,
 *   footerChildren: any[],
 *   submitCount: number
 * } | null}
 */
export function reflowMobileTextEditorView(nativeVnode, options = {}) {
  const children = normalizeChildren(nativeVnode && nativeVnode.children);
  if (!children.length) {
    return null;
  }

  const editorContainer = children[0];
  const footer = findNativeControlsFooter(nativeVnode);
  if (!footer) {
    return null;
  }

  const extracted = extractNativeFooterActions(footer);
  const partitioned = partitionExtractedActions(extracted, options);

  const footerChildren = [];
  for (const action of partitioned.visible) {
    if (action.wrapLi) {
      footerChildren.push({
        tag: 'li',
        attrs: { className: `item-${action.key}` },
        children: [action.vnode],
      });
    } else {
      footerChildren.push(action.vnode);
    }
  }

  if (partitioned.overflow.length) {
    footerChildren.push({
      tag: 'li',
      attrs: { className: 'item-flatrateOverflow FlatrateComposer-overflow' },
      children: partitioned.overflow.map((action) =>
        action.wrapLi ? action.vnode : normalizeChildren(action.vnode.children)
      ),
    });
  }

  if (partitioned.submitLi) {
    footerChildren.push(partitioned.submitLi);
  }

  return {
    editorContainer,
    partitioned,
    footerChildren,
    submitCount: countSubmitVnodes(footerChildren),
  };
}
