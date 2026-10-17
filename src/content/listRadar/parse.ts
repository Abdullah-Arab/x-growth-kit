import { ownFirst } from '../extract';
import { PATTERNS, SELECTORS } from '../selectors';

/** When the tweet was posted (ms), from its permalink <time datetime>. */
export function tweetTimestamp(article: Element): number | null {
  const time = ownFirst(article, SELECTORS.permalinkTime);
  const ms = Date.parse(time?.getAttribute('datetime') ?? '');
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Reply count, or null if it can't be read reliably.
 * Prefers the reply button's aria-label (exact: "1,234 Replies. Reply"),
 * then falls back to the visible counter (rounded: "1.2K"; empty means 0).
 */
export function replyCount(article: Element): number | null {
  const button = ownFirst(article, SELECTORS.replyButton);
  if (!button) return null;

  const label = PATTERNS.leadingCount.exec(button.getAttribute('aria-label') ?? '');
  const digits = label?.[1]?.replace(/\D/g, '');
  if (digits) return Number(digits);

  const counter = button.querySelector(SELECTORS.actionCount);
  return counter ? parseCompactCount(counter.textContent ?? '') : null;
}

/** "" → 0, "12" → 12, "1.2K" → 1200, "3M" → 3000000; anything else → null. */
export function parseCompactCount(text: string): number | null {
  const t = text.trim();
  if (t === '') return 0;
  const m = /^(\d+(?:[.,]\d+)?)\s*([KkMm])?$/.exec(t);
  if (!m) return null;
  const n = parseFloat(m[1]!.replace(',', '.'));
  const mult = m[2] ? (m[2].toLowerCase() === 'k' ? 1_000 : 1_000_000) : 1;
  return Math.round(n * mult);
}

export function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}
