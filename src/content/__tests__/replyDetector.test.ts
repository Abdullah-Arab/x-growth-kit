// @vitest-environment happy-dom
// @vitest-environment-options {"url": "https://x.com/home"}
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createDailyLogRepository, createSettingsRepository } from '@/src/lib/storage';
import { createDailyLogUseCases } from '@/src/lib/usecases/dailyLog';
import { mountReplyCounter } from '../replyCounter';
import { CONFIRM_WINDOW_MS, mountReplyDetector } from '../replyDetector';
import { OWN } from '../selectors';

// Tweet markup is the real fixture. Composer + toast markup is synthesized (no fixture yet)
// to match the UNVERIFIED selectors in selectors.ts.
const FIXTURE = readFileSync(resolve(__dirname, '../../../fixtures/tweet.html'), 'utf8');
const lifecycle = { onInvalidated() {} };
const tick = (ms = 200) => new Promise((r) => setTimeout(r, ms));

let clock = 1_000_000;
const now = () => clock;

function click(selector: string) {
  const el = document.querySelector(selector) as HTMLElement;
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
}

function openComposerDialog({ editors = 1, disabled = false } = {}) {
  const textareas = Array.from(
    { length: editors },
    (_, i) => `<div data-testid="tweetTextarea_${i}_label"><div data-testid="tweetTextarea_${i}" contenteditable="true"></div></div>`,
  ).join('');
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div role="dialog">${textareas}<button data-testid="tweetButton" ${disabled ? 'disabled aria-disabled="true"' : ''}>Reply</button></div>`,
  );
}
const closeDialog = () => document.querySelector('[role="dialog"]')?.remove();

function addInlineComposer() {
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div id="inline"><div><div data-testid="tweetTextarea_0" contenteditable="true"></div></div><div><button data-testid="tweetButtonInline">Reply</button></div></div>`,
  );
}

function showXToast(id: string) {
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div data-testid="toast" role="alert"><span>Your post was sent.</span><a href="/me/status/${id}">View</a></div>`,
  );
}
const removeXToast = () => document.querySelector('[data-testid="toast"]')?.remove();

/** Reply icon → composer opens → submit → composer closes → toast. */
async function replyViaModal(id: string) {
  click('[data-testid="reply"]');
  await tick();
  openComposerDialog();
  await tick();
  click('[data-testid="tweetButton"]');
  closeDialog();
  showXToast(id);
  await tick();
}

describe('mountReplyDetector', () => {
  let onReplyConfirmed: ReturnType<typeof vi.fn<(id: string) => void>>;
  let unmount: () => void;

  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    history.replaceState({}, '', '/home');
    clock = 1_000_000;
    onReplyConfirmed = vi.fn<(id: string) => void>();
    unmount = mountReplyDetector({ onReplyConfirmed, now }, lifecycle);
  });
  afterEach(() => unmount());

  it('counts a reply posted from the modal once X confirms it', async () => {
    await replyViaModal('555');
    expect(onReplyConfirmed).toHaveBeenCalledExactlyOnceWith('555');
  });

  it('never counts the same toast twice (lingers, re-renders)', async () => {
    await replyViaModal('555');
    removeXToast();
    showXToast('555');
    document.body.append(document.createElement('div'));
    await tick();
    expect(onReplyConfirmed).toHaveBeenCalledTimes(1);
  });

  it('one submit confirms at most one reply, even with two toasts', async () => {
    await replyViaModal('555');
    showXToast('556');
    await tick();
    expect(onReplyConfirmed).toHaveBeenCalledTimes(1);
  });

  it('does not count without the success toast', async () => {
    click('[data-testid="reply"]');
    await tick();
    openComposerDialog();
    click('[data-testid="tweetButton"]');
    await tick();
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });

  it('does not count a toast that arrives after the confirmation window', async () => {
    click('[data-testid="reply"]');
    await tick();
    openComposerDialog();
    click('[data-testid="tweetButton"]');
    closeDialog();
    clock += CONFIRM_WINDOW_MS + 1;
    await tick();
    showXToast('555');
    await tick();
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });

  it('ignores a toast already on screen before the submit', async () => {
    unmount();
    showXToast('111');
    unmount = mountReplyDetector({ onReplyConfirmed, now }, lifecycle);
    click('[data-testid="reply"]');
    await tick();
    openComposerDialog();
    click('[data-testid="tweetButton"]');
    await tick();
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });

  it('does not count a new post from a composer not opened by a reply icon', async () => {
    openComposerDialog();
    click('[data-testid="tweetButton"]');
    closeDialog();
    showXToast('555');
    await tick();
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });

  it('forgets a cancelled reply, so the next new post is not counted', async () => {
    click('[data-testid="reply"]');
    await tick();
    openComposerDialog();
    await tick();
    closeDialog(); // cancelled
    await tick();
    openComposerDialog(); // e.g. sidebar "Post" button
    click('[data-testid="tweetButton"]');
    closeDialog();
    showXToast('555');
    await tick();
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });

  it('ignores clicks on a disabled submit button', async () => {
    click('[data-testid="reply"]');
    await tick();
    openComposerDialog({ disabled: true });
    click('[data-testid="tweetButton"]');
    showXToast('555');
    await tick();
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });

  it('does not count thread composers (multiple text boxes)', async () => {
    click('[data-testid="reply"]');
    await tick();
    openComposerDialog({ editors: 2 });
    click('[data-testid="tweetButton"]');
    closeDialog();
    showXToast('555');
    await tick();
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });

  it('counts Cmd/Ctrl+Enter submits', async () => {
    click('[data-testid="reply"]');
    await tick();
    openComposerDialog();
    await tick();
    document
      .querySelector('[data-testid="tweetTextarea_0"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }));
    closeDialog();
    showXToast('555');
    await tick();
    expect(onReplyConfirmed).toHaveBeenCalledExactlyOnceWith('555');
  });

  it('counts the inline composer on a tweet detail page', async () => {
    history.replaceState({}, '', '/digiminimalist/status/2111427511687242152');
    addInlineComposer();
    click('[data-testid="tweetButtonInline"]');
    showXToast('777');
    await tick();
    expect(onReplyConfirmed).toHaveBeenCalledExactlyOnceWith('777');
  });

  it('does not count the inline composer on the home timeline', async () => {
    addInlineComposer();
    click('[data-testid="tweetButtonInline"]');
    showXToast('777');
    await tick();
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', async () => {
    unmount();
    await replyViaModal('555');
    expect(onReplyConfirmed).not.toHaveBeenCalled();
  });
});

describe('mountReplyCounter', () => {
  let unmount: () => void;
  const dailyLog = () =>
    createDailyLogUseCases({ dailyLogs: createDailyLogRepository(), settings: createSettingsRepository() });

  beforeEach(() => {
    fakeBrowser.reset();
    document.body.innerHTML = FIXTURE;
    history.replaceState({}, '', '/home');
  });
  afterEach(() => unmount?.());

  const ourToast = () => document.querySelector(`[${OWN.toastHostAttr}]`)?.shadowRoot ?? null;

  it("increments today's replies, shows a toast, and Undo reverts it", async () => {
    const uc = dailyLog();
    unmount = mountReplyCounter(uc, lifecycle);
    await replyViaModal('555');
    await tick(50);

    expect((await uc.getTodayProgress()).metrics.find((m) => m.metric === 'replies')?.count).toBe(1);
    expect(ourToast()?.textContent).toContain('Reply counted · 1/10 today');

    (ourToast()!.querySelector('button') as HTMLButtonElement).click();
    await tick(50);
    expect((await uc.getTodayProgress()).metrics.find((m) => m.metric === 'replies')?.count).toBe(0);
    expect(ourToast()).toBeNull();
  });
});
