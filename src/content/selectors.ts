// All x.com DOM selectors live here and nowhere else.
// When X changes its markup, this is the only file that should need updating.
// Verified against fixtures/tweet.html.

export const SELECTORS = {
  /** One tweet in any timeline, thread, or detail view. */
  tweet: 'article[data-testid="tweet"]',
  /** Reply / repost / like / views / bookmark / share row. */
  actionBar: '[role="group"]',
  /** The timestamp inside the tweet's permalink: <a href="/user/status/123"><time/></a>. */
  permalinkTime: 'a[href*="/status/"] time',
  tweetText: '[data-testid="tweetText"]',
  userName: '[data-testid="User-Name"]',
  /** An embedded quote tweet; its fields must not be mistaken for the outer tweet's. */
  quotedTweet: 'div[role="link"]',
} as const;

/** Attribute on our own injected elements (not an X selector, but kept here with the rest). */
export const OWN = {
  saveHostAttr: 'data-xgk-save',
  saveHost: '[data-xgk-save]',
  pickerHostAttr: 'data-xgk-picker',
} as const;
