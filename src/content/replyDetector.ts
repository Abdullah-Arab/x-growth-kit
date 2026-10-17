import { debug } from './debug';
import { PATTERNS, SELECTORS } from './selectors';

/** How long after submitting we accept X's success toast as confirmation. */
export const CONFIRM_WINDOW_MS = 15_000;
/** How long after clicking a tweet's reply icon we wait for its composer to open. */
const DIALOG_OPEN_WAIT_MS = 5_000;
const SCAN_THROTTLE_MS = 150;

interface Lifecycle {
  onInvalidated(callback: () => void): void;
}

interface Options {
  onReplyConfirmed(newTweetId: string): void;
  now?: () => number;
}

/**
 * Detects replies you successfully post on x.com, using only what's on screen.
 *
 * Built to miss rather than double-count. A reply is counted only when ALL of these hold:
 *  1. You submit a reply composer: either the modal opened from a tweet's reply icon,
 *     or the inline composer on a tweet's detail page. New posts, quotes, and threads
 *     (more than one text box) never count.
 *  2. Within CONFIRM_WINDOW_MS, X shows its "Your post was sent" toast.
 *  3. That toast links to a tweet id we haven't seen before (each id counts at most once).
 */
export function mountReplyDetector(options: Options, lifecycle: Lifecycle) {
  const now = options.now ?? Date.now;

  /** Set when a tweet's reply icon is clicked; cleared when that composer closes unused. */
  let replyIntent: { at: number; sawDialog: boolean } | null = null;
  /** Timestamps of submitted replies still waiting for X's success toast. */
  let pending: number[] = [];
  /** Every tweet id seen in a toast, so a lingering or re-rendered toast never counts twice. */
  const seenToastIds = new Set<string>();

  function composerDialog(): Element | null {
    for (const dialog of document.querySelectorAll(SELECTORS.dialog)) {
      if (dialog.querySelector(SELECTORS.composerSubmit)) return dialog;
    }
    return null;
  }

  function editorCount(root: Element): number {
    return [...root.querySelectorAll(SELECTORS.composerEditor)].filter((el) =>
      PATTERNS.composerEditorTestId.test(el.getAttribute('data-testid') ?? ''),
    ).length;
  }

  function isDisabled(button: Element): boolean {
    return (
      (button as HTMLButtonElement).disabled === true ||
      button.getAttribute('aria-disabled') === 'true'
    );
  }

  /** Decide whether a submit from this button is a reply we should wait to confirm. */
  function onSubmit(button: Element) {
    if (isDisabled(button)) return debug('submit ignored: button disabled');

    const dialog = button.closest(SELECTORS.dialog);
    const root = dialog ?? composerRootOf(button);
    if (root && editorCount(root) > 1) return debug('submit ignored: thread composer');

    let isReply: boolean;
    if (dialog) {
      isReply = replyIntent !== null;
      debug(isReply ? 'reply submitted (modal)' : 'submit ignored: modal not opened from a reply icon');
    } else {
      isReply = PATTERNS.statusPagePath.test(location.pathname);
      debug(isReply ? 'reply submitted (inline, detail page)' : 'submit ignored: inline composer off a detail page');
    }
    if (!isReply) return;

    replyIntent = null;
    pending.push(now());
    schedule();
  }

  /** Nearest ancestor of an inline composer's button that also holds its editor. */
  function composerRootOf(el: Element): Element | null {
    let node: Element | null = el;
    for (let depth = 0; node && depth < 20; depth++, node = node.parentElement) {
      if (node.querySelector(SELECTORS.composerEditor)) return node;
    }
    return null;
  }

  function scan() {
    const t = now();
    pending = pending.filter((at) => t - at <= CONFIRM_WINDOW_MS);

    if (replyIntent) {
      const open = composerDialog() !== null;
      if (open) replyIntent.sawDialog = true;
      else if (replyIntent.sawDialog || t - replyIntent.at > DIALOG_OPEN_WAIT_MS) {
        debug('reply intent cleared: composer closed or never opened');
        replyIntent = null;
      }
    }

    for (const toast of document.querySelectorAll(SELECTORS.toast)) {
      const href = toast.querySelector(SELECTORS.statusLink)?.getAttribute('href') ?? '';
      const id = PATTERNS.statusIdInHref.exec(href)?.[1];
      if (!id || seenToastIds.has(id)) continue;
      seenToastIds.add(id);
      if (pending.length === 0) {
        debug('toast ignored: no reply awaiting confirmation', id);
        continue;
      }
      pending.shift();
      debug('reply confirmed', id);
      try {
        options.onReplyConfirmed(id);
      } catch {
        // counting failed; don't retry (prefer missing over double-counting)
      }
    }
  }

  // Capture phase so we see the click even if X stops propagation.
  const onClick = (e: Event) => {
    try {
      const target = e.target as Element | null;
      if (!target?.closest) return;
      const submit = target.closest(SELECTORS.composerSubmit);
      if (submit) return onSubmit(submit);
      const reply = target.closest(SELECTORS.replyButton);
      if (reply && reply.closest(SELECTORS.tweet) && !reply.closest(SELECTORS.dialog)) {
        replyIntent = { at: now(), sawDialog: false };
        debug('reply icon clicked');
        schedule();
      }
    } catch {
      // never break the page
    }
  };

  // Cmd/Ctrl+Enter submits from the editor.
  const onKeyDown = (e: KeyboardEvent) => {
    try {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      const target = e.target as Element | null;
      if (!target?.closest?.(SELECTORS.composerEditor)) return;
      const root = target.closest(SELECTORS.dialog) ?? composerRootOf(target);
      const submit = root?.querySelector(SELECTORS.composerSubmit);
      if (submit) onSubmit(submit);
    } catch {
      // never break the page
    }
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  function schedule() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      try {
        scan();
      } catch {
        // never break the page
      }
    }, SCAN_THROTTLE_MS);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  // Record toasts already on screen so they can't confirm a later submit.
  scan();

  function unmount() {
    observer.disconnect();
    clearTimeout(timer);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }
  lifecycle.onInvalidated(unmount);
  return unmount;
}
