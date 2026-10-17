import { normalizeTweetUrl } from '@/src/lib/tweetUrl';
import { SELECTORS } from './selectors';

export interface TweetData {
  tweetUrl: string;
  text: string;
  author: string;
}

/** First match inside `article` that isn't part of an embedded quote tweet. */
export function ownFirst(article: Element, selector: string): Element | null {
  for (const el of article.querySelectorAll(selector)) {
    const quote = el.closest(SELECTORS.quotedTweet);
    if (!quote || !article.contains(quote)) return el;
  }
  return null;
}

export function findActionBar(article: Element): Element | null {
  return ownFirst(article, SELECTORS.actionBar);
}

export function extractTweetUrl(article: Element): string | null {
  const link = ownFirst(article, SELECTORS.permalinkTime)?.closest('a');
  const href = link?.getAttribute('href');
  if (!href) return null;
  const url = normalizeTweetUrl(href);
  return url.startsWith('https://x.com/') ? url : null;
}

/** Text with emoji (rendered as <img alt="😀">) and line breaks preserved. */
function readText(node: Node): string {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? '';
    else if (child instanceof HTMLImageElement) out += child.alt;
    else if (child instanceof HTMLBRElement) out += '\n';
    else out += readText(child);
  }
  return out;
}

function extractAuthor(article: Element, tweetUrl: string): string {
  const userName = ownFirst(article, SELECTORS.userName);
  if (userName) {
    for (const span of userName.querySelectorAll('span')) {
      const text = span.textContent?.trim() ?? '';
      if (/^@\w{1,15}$/.test(text)) return text;
    }
  }
  // Fall back to the handle in the permalink.
  const handle = new URL(tweetUrl).pathname.split('/')[1];
  return handle ? `@${handle}` : '';
}

/** Returns null if the tweet can't be identified (e.g. X changed its markup). */
export function extractTweet(article: Element): TweetData | null {
  const tweetUrl = extractTweetUrl(article);
  if (!tweetUrl) return null;
  const textEl = ownFirst(article, SELECTORS.tweetText);
  return {
    tweetUrl,
    text: textEl ? readText(textEl).trim() : '',
    author: extractAuthor(article, tweetUrl),
  };
}
