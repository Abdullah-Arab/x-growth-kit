// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createRepositories } from '@/src/lib/storage';
import { createUseCases } from '@/src/lib/usecases';
import { extractTweet, findActionBar } from '../extract';
import { OWN, SELECTORS } from '../selectors';
import { mountSwipeSaver } from '../swipeSaver';

const FIXTURE = readFileSync(resolve(__dirname, '../../../fixtures/tweet.html'), 'utf8');
const URL = 'https://x.com/digiminimalist/status/2111427511687242152';

const tick = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const lifecycle = { onInvalidated() {} };

function addTweets(n = 1) {
  for (let i = 0; i < n; i++) document.body.insertAdjacentHTML('beforeend', FIXTURE);
}

describe('extractTweet (fixture)', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
  });

  it('reads url, text, and author', () => {
    const article = document.querySelector(SELECTORS.tweet)!;
    expect(extractTweet(article)).toEqual({
      tweetUrl: URL,
      text: "Apps that won't rot your brain:",
      author: '@digiminimalist',
    });
  });

  it('finds the action bar', () => {
    const bar = findActionBar(document.querySelector(SELECTORS.tweet)!);
    expect(bar?.querySelector('[data-testid="like"]')).not.toBeNull();
  });

  it('keeps emoji and ignores an embedded quote tweet', () => {
    const article = document.querySelector(SELECTORS.tweet)!;
    const text = article.querySelector(SELECTORS.tweetText)!;
    text.insertAdjacentHTML('beforeend', '<img alt="🔥" src="x.png">');
    article.querySelector(SELECTORS.actionBar)!.insertAdjacentHTML(
      'beforebegin',
      '<div role="link"><div data-testid="tweetText">quoted text</div></div>',
    );
    expect(extractTweet(article)?.text).toBe("Apps that won't rot your brain:🔥");
  });

  it('returns null instead of throwing when markup changes', () => {
    document.body.innerHTML = '<article data-testid="tweet"><div>no permalink</div></article>';
    expect(extractTweet(document.querySelector(SELECTORS.tweet)!)).toBeNull();
  });
});

describe('mountSwipeSaver', () => {
  let unmount: () => void;
  let uc: ReturnType<typeof createUseCases>;

  beforeEach(() => {
    fakeBrowser.reset();
    document.body.innerHTML = '';
    uc = createUseCases(createRepositories());
  });
  afterEach(() => unmount?.());

  const hosts = () => document.querySelectorAll(OWN.saveHost);
  const shadowButton = (host: Element) => host.shadowRoot!.querySelector('button')!;
  const picker = () => document.querySelector(`[${OWN.pickerHostAttr}]`)?.shadowRoot ?? null;

  it('injects one button per tweet, before Share, and is idempotent', async () => {
    addTweets(2);
    unmount = mountSwipeSaver(uc.swipes, lifecycle);
    await tick();
    expect(hosts()).toHaveLength(2);
    const bar = document.querySelector(SELECTORS.actionBar)!;
    expect(bar.lastElementChild?.previousElementSibling?.matches(OWN.saveHost)).toBe(true);

    document.body.append(document.createElement('div')); // unrelated mutation
    await tick();
    expect(hosts()).toHaveLength(2);
  });

  it('picks up tweets added later (infinite scroll)', async () => {
    addTweets(1);
    unmount = mountSwipeSaver(uc.swipes, lifecycle);
    await tick();
    addTweets(3);
    await tick();
    expect(hosts()).toHaveLength(4);
  });

  it('re-injects if X re-renders the action bar', async () => {
    addTweets(1);
    unmount = mountSwipeSaver(uc.swipes, lifecycle);
    await tick();
    hosts()[0]!.remove();
    await tick();
    expect(hosts()).toHaveLength(1);
  });

  it('saves with format tag and note via the picker, then shows saved state', async () => {
    addTweets(1);
    unmount = mountSwipeSaver(uc.swipes, lifecycle);
    await tick();

    shadowButton(hosts()[0]!).click();
    await tick(20);
    const root = picker()!;
    expect(root).not.toBeNull();
    (root.querySelector('select') as HTMLSelectElement).value = 'helpful-tip';
    (root.querySelector('textarea') as HTMLTextAreaElement).value = '  great list format  ';
    (root.querySelector('button.primary') as HTMLButtonElement).click();
    await tick();

    expect(picker()).toBeNull();
    expect(await uc.swipes.listSwipes()).toEqual([
      expect.objectContaining({
        tweetUrl: URL,
        author: '@digiminimalist',
        formatTag: 'helpful-tip',
        note: 'great list format',
      }),
    ]);
    expect(shadowButton(hosts()[0]!).getAttribute('aria-pressed')).toBe('true');
  });

  it('opens prefilled for an already-saved tweet and can remove it', async () => {
    await uc.swipes.saveSwipe({ tweetUrl: URL, text: 't', author: '@d', formatTag: 'before-after', note: 'n' });
    addTweets(1);
    unmount = mountSwipeSaver(uc.swipes, lifecycle);
    await tick();
    expect(shadowButton(hosts()[0]!).getAttribute('aria-pressed')).toBe('true');

    shadowButton(hosts()[0]!).click();
    await tick(20);
    const root = picker()!;
    expect((root.querySelector('select') as HTMLSelectElement).value).toBe('before-after');
    (root.querySelector('[data-action="remove"]') as HTMLButtonElement).click();
    await tick();
    expect(await uc.swipes.listSwipes()).toHaveLength(0);
    expect(shadowButton(hosts()[0]!).getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps keystrokes in the picker away from X shortcuts', async () => {
    addTweets(1);
    unmount = mountSwipeSaver(uc.swipes, lifecycle);
    await tick();
    shadowButton(hosts()[0]!).click();
    await tick(20);
    let leaked = 0;
    document.addEventListener('keydown', () => leaked++);
    picker()!.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true, composed: true }));
    expect(leaked).toBe(0);
  });

  it('does not let save-button clicks reach the tweet', async () => {
    addTweets(1);
    unmount = mountSwipeSaver(uc.swipes, lifecycle);
    await tick();
    let navigated = 0;
    document.querySelector(SELECTORS.tweet)!.addEventListener('click', () => navigated++);
    shadowButton(hosts()[0]!).click();
    expect(navigated).toBe(0);
  });

  it('survives tweets with broken markup and cleans up on unmount', async () => {
    document.body.innerHTML = '<article data-testid="tweet"><div role="group"></div></article>';
    addTweets(1);
    unmount = mountSwipeSaver(uc.swipes, lifecycle);
    await tick();
    expect(hosts()).toHaveLength(1);
    unmount();
    expect(hosts()).toHaveLength(0);
  });
});
