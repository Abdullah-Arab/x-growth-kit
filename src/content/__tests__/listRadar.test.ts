// @vitest-environment happy-dom
// @vitest-environment-options {"url": "https://x.com/i/lists/123"}
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createSettingsRepository } from '@/src/lib/storage';
import { createSettingsUseCases } from '@/src/lib/usecases/settings';
import { mountListRadarFeature } from '../listRadar';
import { formatAge, formatCount, parseCompactCount, replyCount, tweetTimestamp } from '../listRadar/parse';
import { isFresh, mountListRadar } from '../listRadar/radar';
import { OWN, SELECTORS } from '../selectors';

const FIXTURE = readFileSync(resolve(__dirname, '../../../fixtures/tweet.html'), 'utf8');
const POSTED = Date.parse('2026-10-17T12:02:01.000Z'); // the fixture's <time datetime>
const MIN = 60_000;
const tick = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const lifecycle = { onInvalidated() {} };

const article = () => document.querySelector(SELECTORS.tweet)!;
const badgeText = () => document.querySelector(OWN.radarBadge)?.shadowRoot?.querySelector('span')?.textContent ?? null;
const highlighted = () => article().hasAttribute(OWN.radarFreshAttr);
function setReplies(label: string, visible = '') {
  const button = article().querySelector('[data-testid="reply"]')!;
  button.setAttribute('aria-label', label);
  button.querySelector(SELECTORS.actionCount)!.textContent = visible;
}

describe('parse (fixture)', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
  });

  it('reads the timestamp and reply count', () => {
    expect(tweetTimestamp(article())).toBe(POSTED);
    expect(replyCount(article())).toBe(0); // "0 Replies. Reply"
  });

  it('reads exact counts with separators from the aria-label', () => {
    setReplies('1,234 Replies. Reply', '1.2K');
    expect(replyCount(article())).toBe(1234);
    setReplies('1 234 réponses. Répondre');
    expect(replyCount(article())).toBe(1234);
  });

  it('falls back to the visible counter, and gives up when unreadable', () => {
    setReplies('Reply', '7');
    expect(replyCount(article())).toBe(7);
    setReplies('Reply', '');
    expect(replyCount(article())).toBe(0);
    setReplies('Reply', 'lots');
    expect(replyCount(article())).toBeNull();
  });

  it('formats', () => {
    expect(parseCompactCount('2.5K')).toBe(2500);
    expect(parseCompactCount('1,5 M')).toBe(1_500_000);
    expect(formatAge(30_000)).toBe('now');
    expect(formatAge(14 * MIN)).toBe('14m');
    expect(formatAge(3 * 60 * MIN)).toBe('3h');
    expect(formatAge(50 * 60 * MIN)).toBe('2d');
    expect(formatCount(1234)).toBe('1.2K');
    expect(formatCount(25_000)).toBe('25K');
  });
});

describe('isFresh', () => {
  const t = { maxAgeMinutes: 15, maxReplies: 10 };
  it('requires both: younger than the age limit and fewer replies than the limit', () => {
    expect(isFresh(14 * MIN, 9, t)).toBe(true);
    expect(isFresh(15 * MIN, 9, t)).toBe(false);
    expect(isFresh(14 * MIN, 10, t)).toBe(false);
    expect(isFresh(1 * MIN, null, t)).toBe(false);
  });
});

describe('mountListRadar', () => {
  let clock = POSTED + 4 * MIN;
  const now = () => clock;
  let radar: ReturnType<typeof mountListRadar> | null;

  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    document.head.innerHTML = '';
    history.replaceState({}, '', '/i/lists/123');
    clock = POSTED + 4 * MIN;
    radar = null;
  });
  afterEach(() => radar?.unmount());

  it('badges and highlights a fresh tweet on a list page, right after the timestamp', async () => {
    radar = mountListRadar({ maxAgeMinutes: 15, maxReplies: 10 }, { now });
    expect(badgeText()).toBe('4m · 0 replies');
    expect(highlighted()).toBe(true);
    expect(article().querySelector(SELECTORS.permalinkTime)!.closest('a')!.nextElementSibling?.matches(OWN.radarBadge)).toBe(true);
    expect(document.getElementById(OWN.radarStyleId)).not.toBeNull();
  });

  it('un-highlights as the tweet ages past the threshold', () => {
    radar = mountListRadar({ maxAgeMinutes: 15, maxReplies: 10 }, { now });
    clock = POSTED + 16 * MIN;
    radar.refresh();
    expect(badgeText()).toBe('16m · 0 replies');
    expect(highlighted()).toBe(false);
  });

  it('does not highlight busy tweets or unreadable counts', () => {
    setReplies('12 Replies. Reply', '12');
    radar = mountListRadar({ maxAgeMinutes: 15, maxReplies: 10 }, { now });
    expect(badgeText()).toBe('4m · 12 replies');
    expect(highlighted()).toBe(false);

    setReplies('Reply', '??');
    radar.refresh();
    expect(badgeText()).toBe('4m · ? replies');
    expect(highlighted()).toBe(false);
  });

  it('applies new thresholds live', () => {
    setReplies('12 Replies. Reply');
    radar = mountListRadar({ maxAgeMinutes: 15, maxReplies: 10 }, { now });
    expect(highlighted()).toBe(false);
    radar.update({ maxAgeMinutes: 15, maxReplies: 20 });
    expect(highlighted()).toBe(true);
  });

  it('does nothing outside list timelines', () => {
    for (const path of ['/home', '/i/lists/123/members', '/digiminimalist']) {
      history.replaceState({}, '', path);
      radar?.unmount();
      radar = mountListRadar({ maxAgeMinutes: 15, maxReplies: 10 }, { now });
      expect(badgeText()).toBeNull();
      expect(highlighted()).toBe(false);
    }
  });

  it('cleans up when navigating away from the list (SPA)', async () => {
    radar = mountListRadar({ maxAgeMinutes: 15, maxReplies: 10 }, { now });
    expect(badgeText()).not.toBeNull();
    history.pushState({}, '', '/home');
    document.body.append(document.createElement('div')); // X re-renders on navigation
    await tick();
    expect(badgeText()).toBeNull();
    expect(highlighted()).toBe(false);
    expect(document.getElementById(OWN.radarStyleId)).toBeNull();
  });

  it('badges tweets that load later and never duplicates badges', async () => {
    radar = mountListRadar({ maxAgeMinutes: 15, maxReplies: 10 }, { now });
    document.body.insertAdjacentHTML('beforeend', FIXTURE);
    await tick();
    radar.refresh();
    expect(document.querySelectorAll(OWN.radarBadge)).toHaveLength(2);
  });

  it('leaves no trace after unmount', () => {
    radar = mountListRadar({ maxAgeMinutes: 15, maxReplies: 10 }, { now });
    radar.unmount();
    radar = null;
    expect(document.querySelector(OWN.radarBadge)).toBeNull();
    expect(highlighted()).toBe(false);
    expect(document.getElementById(OWN.radarStyleId)).toBeNull();
  });
});

describe('mountListRadarFeature (settings toggle)', () => {
  let unmount: () => void;

  beforeEach(() => {
    fakeBrowser.reset();
    document.body.innerHTML = FIXTURE;
    document.head.innerHTML = '';
    history.replaceState({}, '', '/i/lists/123');
  });
  afterEach(() => unmount?.());

  it('mounts when enabled and unmounts/remounts live when toggled', async () => {
    const settings = createSettingsUseCases({ settings: createSettingsRepository() });
    unmount = mountListRadarFeature(settings, lifecycle);
    await tick(20);
    expect(document.querySelector(OWN.radarBadge)).not.toBeNull();

    await settings.updateListRadar({ enabled: false });
    await tick(20);
    expect(document.querySelector(OWN.radarBadge)).toBeNull();

    await settings.updateListRadar({ enabled: true });
    await tick(20);
    expect(document.querySelector(OWN.radarBadge)).not.toBeNull();
  });

  it('stays off when disabled at startup', async () => {
    const settings = createSettingsUseCases({ settings: createSettingsRepository() });
    await settings.updateListRadar({ enabled: false });
    unmount = mountListRadarFeature(settings, lifecycle);
    await tick(20);
    expect(document.querySelector(OWN.radarBadge)).toBeNull();
  });
});
