import type { ListRadarSettings } from '@/src/lib/types';
import { ownFirst } from '../extract';
import { OWN, PATTERNS, SELECTORS } from '../selectors';
import { createRadarBadge, type RadarBadge } from './badge';
import { formatAge, formatCount, replyCount, tweetTimestamp } from './parse';

export type RadarThresholds = Pick<ListRadarSettings, 'maxAgeMinutes' | 'maxReplies'>;

const SCAN_THROTTLE_MS = 150;
/** Re-scan even without DOM changes so ages tick and highlights expire. */
const REFRESH_MS = 30_000;

const HIGHLIGHT_CSS = `
article[${OWN.radarFreshAttr}] {
  box-shadow: inset 3px 0 0 rgb(29, 155, 240);
  background-color: rgba(29, 155, 240, .08);
}`;

/** A tweet is fresh when it's younger than maxAgeMinutes AND has fewer than maxReplies replies. */
export function isFresh(ageMs: number, replies: number | null, t: RadarThresholds): boolean {
  // Unknown reply count never highlights.
  return replies !== null && ageMs < t.maxAgeMinutes * 60_000 && replies < t.maxReplies;
}

/**
 * On List timelines only, badges every tweet with its age and reply count and
 * highlights fresh ones. Leaves no trace off list pages or after unmount.
 */
export function mountListRadar(initial: RadarThresholds, options: { now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  let thresholds = initial;
  let active = false; // whether anything of ours is currently on the page
  const badges = new WeakMap<Element, RadarBadge>();

  function isListPage() {
    return PATTERNS.listPagePath.test(location.pathname);
  }

  function ensureStyle() {
    if (document.getElementById(OWN.radarStyleId)) return;
    const style = document.createElement('style');
    style.id = OWN.radarStyleId;
    style.textContent = HIGHLIGHT_CSS;
    document.head.append(style);
  }

  function clearAll() {
    if (!active) return;
    document.querySelectorAll(OWN.radarBadge).forEach((el) => el.remove());
    document.querySelectorAll(`[${OWN.radarFreshAttr}]`).forEach((el) => el.removeAttribute(OWN.radarFreshAttr));
    document.getElementById(OWN.radarStyleId)?.remove();
    active = false;
  }

  function syncTweet(article: Element) {
    const posted = tweetTimestamp(article);
    const timeLink = ownFirst(article, SELECTORS.permalinkTime)?.closest('a');
    if (posted === null || !timeLink) {
      article.querySelector(OWN.radarBadge)?.remove();
      article.removeAttribute(OWN.radarFreshAttr);
      return;
    }

    const ageMs = Math.max(0, now() - posted);
    const replies = replyCount(article);
    const fresh = isFresh(ageMs, replies, thresholds);

    let host = article.querySelector(OWN.radarBadge);
    if (!host) {
      const badge = createRadarBadge();
      timeLink.after(badge.host);
      badges.set(badge.host, badge);
      host = badge.host;
    }

    const age = formatAge(ageMs);
    const repliesText = replies === null ? '? replies' : `${formatCount(replies)} ${replies === 1 ? 'reply' : 'replies'}`;
    const label =
      `Posted ${age === 'now' ? 'just now' : `${age} ago`} · ${repliesText}` +
      (fresh ? ` · fresh: under ${thresholds.maxAgeMinutes}m with fewer than ${thresholds.maxReplies} replies` : '');
    badges.get(host)?.update(`${age} · ${repliesText}`, label, fresh);
    article.toggleAttribute(OWN.radarFreshAttr, fresh);
  }

  function scan() {
    if (!isListPage()) return clearAll();
    ensureStyle();
    active = true;
    for (const article of document.querySelectorAll(SELECTORS.tweet)) {
      try {
        syncTweet(article);
      } catch {
        // skip this tweet; never break the page
      }
    }
  }

  function safeScan() {
    try {
      scan();
    } catch {
      // never break the page
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      safeScan();
    }, SCAN_THROTTLE_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const interval = setInterval(safeScan, REFRESH_MS);
  safeScan();

  return {
    update(next: RadarThresholds) {
      thresholds = next;
      safeScan();
    },
    /** Re-scan now (exposed for tests). */
    refresh: safeScan,
    unmount() {
      observer.disconnect();
      clearTimeout(timer);
      clearInterval(interval);
      active = true; // force cleanup
      clearAll();
    },
  };
}
