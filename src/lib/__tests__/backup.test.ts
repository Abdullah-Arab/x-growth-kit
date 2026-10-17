import { describe, expect, it } from 'vitest';
import { ImportError } from '../usecases';
import { setup } from './setup';

const { uc } = setup();

async function seed() {
  await uc.settings.updateTargets({ replies: 15 });
  await uc.dailyLog.increment('tweets', 2, '2026-10-01');
  await uc.swipes.saveSwipe({ tweetUrl: 'https://x.com/a/status/1', text: 'hi', author: '@a' });
  await uc.drafts.createDraft('build-in-public', 'Shipped storage today');
}

describe('export / import', () => {
  it('round-trips all data', async () => {
    await seed();
    const json = await uc.backup.exportDataAsJson();
    const before = (await uc.backup.exportData()).data;

    // wipe by importing an empty backup, then restore
    const empty = JSON.parse(json);
    empty.data = { ...empty.data, dailyLogs: [], swipes: [], drafts: [] };
    await uc.backup.importData(JSON.stringify(empty));
    expect(await uc.swipes.listSwipes()).toHaveLength(0);

    const result = await uc.backup.importData(json);
    expect(result).toEqual({ dailyLogs: 1, swipes: 1, drafts: 1 });
    expect((await uc.backup.exportData()).data).toEqual(before);
  });

  it.each([
    ['bad JSON', () => '{nope'],
    ['wrong app', (p: any) => JSON.stringify({ ...p, app: 'other' })],
    ['wrong schema version', (p: any) => JSON.stringify({ ...p, schemaVersion: 99 })],
    [
      'unknown template id',
      (p: any) =>
        JSON.stringify({
          ...p,
          data: { ...p.data, drafts: [{ ...p.data.drafts[0], templateType: 'nope' }] },
        }),
    ],
  ])('rejects %s and leaves data untouched', async (_, mutate) => {
    await seed();
    const payload = await uc.backup.exportData();
    await expect(uc.backup.importData(mutate(payload))).rejects.toBeInstanceOf(ImportError);
    expect((await uc.backup.exportData()).data).toEqual(payload.data);
  });
});
