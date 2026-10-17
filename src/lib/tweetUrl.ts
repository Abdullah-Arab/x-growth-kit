const STATUS_RE = /^(?:https?:\/\/)?(?:(?:www\.|mobile\.)?(?:x|twitter)\.com)?\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/;

/**
 * Canonical form of a tweet permalink: https://x.com/<handle>/status/<id>.
 * Accepts full URLs (x.com or twitter.com, with ?s=20, /photo/1, /analytics …) and bare paths.
 * Anything that isn't a tweet URL is returned trimmed and otherwise untouched.
 */
export function normalizeTweetUrl(input: string): string {
  const trimmed = input.trim();
  const match = STATUS_RE.exec(trimmed);
  if (!match) return trimmed;
  const [, handle, id] = match;
  return `https://x.com/${handle!.toLowerCase()}/status/${id}`;
}
