import type { createSwipeUseCases } from '@/src/lib/usecases/swipes';
import { extractTweet, extractTweetUrl, findActionBar } from './extract';
import { createPicker } from './picker';
import { createSaveButton, type SaveButton } from './saveButton';
import { OWN, SELECTORS } from './selectors';

const SCAN_THROTTLE_MS = 150;

interface Lifecycle {
  onInvalidated(callback: () => void): void;
}

/**
 * Adds a "Save to swipe file" button to every tweet's action bar, including tweets
 * that arrive later via infinite scroll. Every step is guarded: if X's markup changes,
 * tweets are simply skipped and the page is never affected.
 */
export function mountSwipeSaver(swipes: ReturnType<typeof createSwipeUseCases>, lifecycle: Lifecycle) {
  const picker = createPicker();
  const buttons = new WeakMap<Element, SaveButton>();
  let savedUrls = new Set<string>();

  function scan() {
    for (const article of document.querySelectorAll(SELECTORS.tweet)) {
      try {
        syncTweet(article);
      } catch {
        // skip this tweet; never break the page
      }
    }
  }

  function syncTweet(article: Element) {
    const bar = findActionBar(article);
    const url = extractTweetUrl(article);
    if (!bar || !url) return;

    // X re-renders action bars and recycles article nodes, so re-check every scan.
    let host = bar.querySelector(OWN.saveHost);
    if (!host) {
      const button = createSaveButton(onButtonClick);
      // Sit just before the last item (Share), next to Bookmark.
      bar.insertBefore(button.host, bar.lastElementChild);
      buttons.set(button.host, button);
      host = button.host;
    }
    buttons.get(host)?.setSaved(savedUrls.has(url));
  }

  async function onButtonClick(button: SaveButton) {
    try {
      if (picker.isOpen()) return picker.close();
      const article = button.host.closest(SELECTORS.tweet);
      const tweet = article && extractTweet(article);
      if (!tweet) return;
      const existing = await swipes.getByUrl(tweet.tweetUrl);

      picker.open({
        anchor: button.host,
        returnFocus: button.button,
        preview: tweet,
        initial: existing ? { formatTag: existing.formatTag, note: existing.note } : undefined,
        async onSave({ formatTag, note }) {
          if (existing) await swipes.updateSwipe(existing.id, { formatTag, note });
          else await swipes.saveSwipe({ ...tweet, formatTag, note });
          button.setSaved(true);
        },
        onRemove: existing
          ? async () => {
              await swipes.deleteSwipe(existing.id);
              button.setSaved(false);
            }
          : undefined,
      });
    } catch {
      // e.g. extension context invalidated before the picker opened
    }
  }

  // Throttle scans: X mutates the DOM constantly (timestamps, counters, virtualization).
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      scan();
    }, SCAN_THROTTLE_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const unwatch = swipes.watchSwipes((items) => {
    savedUrls = new Set(items.map((s) => s.tweetUrl));
    scan();
  });
  swipes
    .listSwipes()
    .then((items) => {
      savedUrls = new Set(items.map((s) => s.tweetUrl));
      scan();
    })
    .catch(() => {});
  scan();

  function unmount() {
    observer.disconnect();
    clearTimeout(timer);
    try {
      unwatch();
    } catch {
      // storage API may already be gone
    }
    picker.destroy();
    document.querySelectorAll(OWN.saveHost).forEach((el) => el.remove());
  }

  lifecycle.onInvalidated(unmount);
  return unmount;
}
