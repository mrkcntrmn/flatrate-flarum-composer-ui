import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import Composer from 'flarum/forum/components/Composer';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';
import ReplyComposer from 'flarum/forum/components/ReplyComposer';
import TextEditor from 'flarum/common/components/TextEditor';
import Button from 'flarum/common/components/Button';
import classList from 'flarum/common/utils/classList';
import icon from 'flarum/common/helpers/icon';

import {
  isMobileViewport,
  resolveComposerKind,
  resolvePresentationMode,
  modeClassNames,
} from './presentation/composerMode';
import {
  getReplyExpanded,
  setReplyExpanded,
  getReplyFocused,
  setReplyFocused,
  resetReplyPresentation,
  captureScrollAnchor,
  consumeScrollAnchor,
  computeDockedEditorMaxPx,
} from './presentation/replyPresentation';
import {
  deriveReplyContext,
  removeReplyContextToken,
  isReplyContextInSync,
} from './presentation/replyContext';
import { partitionToolbarKeys } from './presentation/toolbarOverflow';
import {
  applyDiscussionInset,
  clearDiscussionInset,
  measureDockHeight,
  restoreScrollTop,
} from './presentation/scrollInset';

function resolveEditPostComposer() {
  // Optional — do not hard-require; missing compat must not crash boot.
  const compat = typeof flarum !== 'undefined' && flarum.core && flarum.core.compat;
  if (!compat) {
    return null;
  }
  const candidate = compat['forum/components/EditPostComposer'];
  return candidate && (candidate.default || candidate);
}

function composerTypes() {
  return {
    DiscussionComposer,
    ReplyComposer,
    EditPostComposer: resolveEditPostComposer(),
  };
}

function currentKind(composerComponent) {
  const state = composerComponent && composerComponent.state;
  return resolveComposerKind(state && state.body, composerTypes());
}

function currentMode(composerComponent) {
  return resolvePresentationMode({
    kind: currentKind(composerComponent),
    mobile: isMobileViewport(),
    replyExpanded: getReplyExpanded(),
  });
}

function contentElement() {
  return document.getElementById('content') || document.querySelector('.App-content');
}

function syncDiscussionInset(composerComponent) {
  const mode = currentMode(composerComponent);
  const el = contentElement();
  if (mode !== 'reply-docked') {
    clearDiscussionInset(el);
    return;
  }
  const height = measureDockHeight(composerComponent.$()[0], 0);
  applyDiscussionInset(el, height);
}

function captureStreamScroll() {
  captureScrollAnchor(window.pageYOffset || document.documentElement.scrollTop || 0);
}

function restoreStreamScroll() {
  const top = consumeScrollAnchor();
  if (typeof top === 'number') {
    window.scrollTo(0, top);
    restoreScrollTop(document.documentElement, top);
  }
}

function getViewportWidthSafe() {
  if (typeof window === 'undefined') return 1024;
  return (window.visualViewport && window.visualViewport.width) || window.innerWidth || 1024;
}

function getViewportHeightSafe() {
  if (typeof window === 'undefined') return 800;
  return (window.visualViewport && window.visualViewport.height) || window.innerHeight || 800;
}

/**
 * Count native submit controls under a composer root.
 * Fullscreen CSS repositions the same .item-submit node — it must not duplicate.
 */
export function countSubmitControls(root) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return 0;
  }
  return root.querySelectorAll('.item-submit').length;
}

/**
 * Read the live editor DOM node (textarea or contenteditable surface).
 */
export function findEditorNode(root) {
  if (!root || typeof root.querySelector !== 'function') {
    return null;
  }
  return (
    root.querySelector('textarea.TextEditor-editor') ||
    root.querySelector('.TextEditor-editor') ||
    root.querySelector('.TextEditor-editorContainer textarea')
  );
}

export default function extendComposer() {
  // --- Composer root classes + height/padding overrides ---
  extend(Composer.prototype, 'view', function (vnode) {
    const mode = currentMode(this);
    const extras = modeClassNames(mode);
    if (!extras.length) {
      return;
    }
    vnode.attrs = vnode.attrs || {};
    vnode.attrs.className = classList(vnode.attrs.className, ...extras);
    vnode.attrs['data-flatrate-composer-mode'] = mode;
  });

  override(Composer.prototype, 'updateHeight', function (original) {
    const mode = currentMode(this);
    if (mode === 'native') {
      return original();
    }

    const $composer = this.$();
    if (!$composer.length) {
      return;
    }

    if (mode === 'discussion-fullscreen' || mode === 'reply-expanded') {
      $composer.css({ height: '', maxHeight: '', top: '', bottom: '0' });
      $composer.find('.Composer-flexible').css({ height: '', maxHeight: '' });
      return;
    }

    const max = computeDockedEditorMaxPx(getViewportHeightSafe());
    $composer.find('.Composer-flexible').css({ height: 'auto', maxHeight: `${max}px` });
    $composer.css({ height: 'auto', maxHeight: 'none', top: 'auto', bottom: '0' });
    syncDiscussionInset(this);
  });

  override(Composer.prototype, 'updateBodyPadding', function (original) {
    const mode = currentMode(this);
    if (mode === 'reply-docked') {
      syncDiscussionInset(this);
      return;
    }
    if (mode === 'discussion-fullscreen' || mode === 'reply-expanded') {
      clearDiscussionInset(contentElement());
      return;
    }
    return original();
  });

  override(Composer.prototype, 'showBackdrop', function (original) {
    if (currentMode(this) === 'reply-docked') {
      this.hideBackdrop();
      return;
    }
    return original();
  });

  extend(Composer.prototype, 'oncreate', function () {
    this._flatrateOnResize = () => {
      if (typeof this.updateHeight === 'function') {
        this.updateHeight();
      }
      m.redraw();
    };
    window.addEventListener('resize', this._flatrateOnResize);
  });

  extend(Composer.prototype, 'onremove', function () {
    if (this._flatrateOnResize) {
      window.removeEventListener('resize', this._flatrateOnResize);
      this._flatrateOnResize = null;
    }
    clearDiscussionInset(contentElement());
    resetReplyPresentation();
  });

  extend(Composer.prototype, 'onupdate', function () {
    const kind = currentKind(this);
    if (kind !== 'reply') {
      if (getReplyExpanded() || getReplyFocused()) {
        resetReplyPresentation();
      }
      if (currentMode(this) !== 'discussion-fullscreen') {
        clearDiscussionInset(contentElement());
      }
      return;
    }
    syncDiscussionInset(this);
  });

  extend(Composer.prototype, 'controlItems', function (items) {
    if (currentMode(this) === 'native') {
      return;
    }
    ['minimize', 'fullScreen', 'exitFullScreen'].forEach((key) => {
      if (items.items && items.items[key]) {
        items.remove(key);
      }
    });
  });

  // --- Discussion placeholders; native title/body streams retained ---
  const originalDiscussionInitAttrs = DiscussionComposer.initAttrs;
  DiscussionComposer.initAttrs = function (attrs) {
    originalDiscussionInitAttrs.call(this, attrs);
    if (!isMobileViewport()) {
      return;
    }
    attrs.placeholder = app.translator.trans('flatrate-composer-ui.forum.discussion_body_placeholder');
    attrs.titlePlaceholder = app.translator.trans('flatrate-composer-ui.forum.discussion_title_placeholder');
  };

  // Centered app-bar title for Start Discussion (presentation only).
  extend(DiscussionComposer.prototype, 'headerItems', function (items) {
    if (!isMobileViewport()) {
      return;
    }
    items.add(
      'flatrateAppTitle',
      <div className="FlatrateComposer-appTitle" aria-hidden="false">
        {app.translator.trans('flatrate-composer-ui.forum.start_discussion')}
      </div>,
      200
    );
  });

  // --- Reply expand + derived context (same ReplyComposer / TextEditor instances) ---
  extend(ReplyComposer.prototype, 'headerItems', function (items) {
    if (!isMobileViewport()) {
      return;
    }

    const content = this.composer.fields.content();
    const context = deriveReplyContext(content);
    if (context && isReplyContextInSync(content, context)) {
      items.add(
        'flatrateReplyContext',
        <div className="FlatrateComposer-replyContext" role="status">
          <span className="FlatrateComposer-replyContextLabel">
            {app.translator.trans('flatrate-composer-ui.forum.reply_context', {
              username: context.username,
            })}
          </span>
          <Button
            className="Button Button--icon FlatrateComposer-replyContextClear"
            aria-label={app.translator.trans('flatrate-composer-ui.forum.remove_reply_context')}
            onclick={(e) => {
              e.preventDefault();
              const result = removeReplyContextToken(this.composer.fields.content(), context);
              if (!result.removed) {
                return;
              }
              this.composer.fields.content(result.next);
              if (this.composer.editor) {
                if (typeof this.composer.editor.setValue === 'function') {
                  this.composer.editor.setValue(result.next);
                } else if (typeof this.composer.editor.value === 'function') {
                  this.composer.editor.value(result.next);
                }
              }
              m.redraw();
            }}
          >
            {icon('fas fa-times')}
          </Button>
        </div>,
        90
      );
    }

    if (getReplyFocused() || getReplyExpanded()) {
      items.add(
        'flatrateReplyExpand',
        <Button
          className="Button Button--icon FlatrateComposer-expand"
          aria-label={
            getReplyExpanded()
              ? app.translator.trans('flatrate-composer-ui.forum.collapse_reply')
              : app.translator.trans('flatrate-composer-ui.forum.expand_reply')
          }
          aria-pressed={getReplyExpanded() ? 'true' : 'false'}
          onclick={(e) => {
            e.preventDefault();
            const root = this.$()[0] && this.$()[0].closest('.Composer');
            const editorBefore = findEditorNode(root || this.$()[0]);

            if (!getReplyExpanded()) {
              captureStreamScroll();
            }

            setReplyExpanded(!getReplyExpanded());
            m.redraw.sync();

            const editorAfter = findEditorNode(root || this.$()[0]);
            this._flatrateEditorIdentityOk = !!(editorBefore && editorAfter && editorBefore === editorAfter);

            if (!getReplyExpanded()) {
              restoreStreamScroll();
            }

            if (app.composer && app.composer.component && typeof app.composer.component.updateHeight === 'function') {
              app.composer.component.updateHeight();
            }
          }}
        >
          {icon(getReplyExpanded() ? 'fas fa-compress' : 'fas fa-expand')}
        </Button>,
        80
      );
    }
  });

  extend(ReplyComposer.prototype, 'oncreate', function () {
    const root = this.$()[0];
    if (!root) {
      return;
    }
    this._flatrateFocusIn = () => {
      setReplyFocused(true);
      m.redraw();
    };
    root.addEventListener('focusin', this._flatrateFocusIn);
  });

  extend(ReplyComposer.prototype, 'onremove', function () {
    const root = this.$()[0];
    if (root && this._flatrateFocusIn) {
      root.removeEventListener('focusin', this._flatrateFocusIn);
    }
    resetReplyPresentation();
    clearDiscussionInset(contentElement());
  });

  // --- Toolbar: keep native TextEditor view/DOM; reflow via partitioned ItemList + CSS ---
  extend(TextEditor.prototype, 'oninit', function () {
    this.flatrateOverflowOpen = false;
  });

  override(TextEditor.prototype, 'view', function (original) {
    if (!isMobileViewport()) {
      return original();
    }

    const composerState = this.attrs.composer;
    const kind = resolveComposerKind(composerState && composerState.body, composerTypes());
    const mode = resolvePresentationMode({
      kind,
      mobile: true,
      replyExpanded: getReplyExpanded(),
    });
    if (mode === 'native') {
      return original();
    }

    // Stable tree: editorContainer position never changes across docked/expanded.
    const controls = this.controlItems();
    const toolbar = this.toolbarItems();
    const toolbarKeys = Object.keys((toolbar && toolbar.items) || {});
    const { visible, overflow } = partitionToolbarKeys(toolbarKeys, {
      maxVisible: 5,
      narrow: getViewportWidthSafe() < 400,
    });

    const renderKeyed = (key) => {
      const item = toolbar.items[key];
      return item ? <li className={`item-${key}`}>{item.content}</li> : null;
    };

    const submitItem = controls.items.submit ? (
      <li className="item-submit App-primaryControl">{controls.items.submit.content}</li>
    ) : null;

    const extraControls = Object.keys(controls.items || {})
      .filter((key) => key !== 'submit')
      .map((key) => <li className={`item-${key}`}>{controls.items[key].content}</li>);

    return (
      <div className={classList('TextEditor', 'TextEditor--flatrateMobile')}>
        <div className="FlatrateComposer-topBar" role="banner">
          <div className="FlatrateComposer-topBarMain" />
          <ul className="FlatrateComposer-topBarActions">{submitItem}</ul>
        </div>

        <div className="TextEditor-editorContainer" />

        <ul className="TextEditor-controls Composer-footer FlatrateComposer-toolbar" role="toolbar">
          {visible.map(renderKeyed)}
          {overflow.length ? (
            <li className="FlatrateComposer-overflow item-flatrateOverflow">
              <Button
                className="Button Button--icon FlatrateComposer-overflowToggle"
                aria-expanded={this.flatrateOverflowOpen ? 'true' : 'false'}
                aria-haspopup="true"
                aria-label={app.translator.trans('flatrate-composer-ui.forum.toolbar_overflow')}
                onclick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  this.flatrateOverflowOpen = !this.flatrateOverflowOpen;
                  m.redraw();
                }}
              >
                {icon('fas fa-ellipsis-h')}
              </Button>
              {this.flatrateOverflowOpen ? (
                <ul className="FlatrateComposer-overflowMenu" role="menu">
                  {overflow.map(renderKeyed)}
                </ul>
              ) : null}
            </li>
          ) : null}
          {extraControls}
        </ul>
      </div>
    );
  });
}
