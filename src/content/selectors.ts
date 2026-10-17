// All x.com DOM selectors live here and nowhere else.
// When X changes its markup, this is the only file that should need updating.
// Entries are verified against fixtures/tweet.html unless marked UNVERIFIED.

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

  // --- Reply detection ---
  /** Reply icon in a tweet's action bar; opens the reply composer. */
  replyButton: '[data-testid="reply"]',
  /** UNVERIFIED (no fixture): composer modal, used for replies opened from a timeline. */
  dialog: '[role="dialog"]',
  /** UNVERIFIED (no fixture): Reply/Post submit — modal and inline composers respectively. */
  composerSubmit: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
  /** UNVERIFIED (no fixture): a composer text box; threads have _0, _1, … */
  composerEditor: '[data-testid^="tweetTextarea_"]',
  /** UNVERIFIED (no fixture): X's "Your post was sent. View" toast. */
  toast: '[data-testid="toast"]',
  statusLink: 'a[href*="/status/"]',
} as const;

/** Patterns that go with the selectors above. */
export const PATTERNS = {
  /** Editor test ids are tweetTextarea_0, tweetTextarea_1 …; excludes helpers like tweetTextarea_0_label. */
  composerEditorTestId: /^tweetTextarea_\d+$/,
  /** A tweet detail page, where the inline composer replies to the open tweet. */
  statusPagePath: /^\/[A-Za-z0-9_]{1,15}\/status\/\d+\/?$/,
  statusIdInHref: /\/status\/(\d+)/,
} as const;

/** Attribute on our own injected elements (not an X selector, but kept here with the rest). */
export const OWN = {
  saveHostAttr: 'data-xgk-save',
  saveHost: '[data-xgk-save]',
  pickerHostAttr: 'data-xgk-picker',
  toastHostAttr: 'data-xgk-toast',
} as const;
