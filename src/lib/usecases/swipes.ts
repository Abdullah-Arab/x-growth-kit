import type { SwipeRepository } from '../storage';
import type { FormatTag, SwipeItem } from '../types';

export type NewSwipe = Pick<SwipeItem, 'tweetUrl' | 'text' | 'author'> &
  Partial<Pick<SwipeItem, 'formatTag' | 'note'>>;

export type SwipePatch = Partial<Pick<SwipeItem, 'text' | 'author' | 'formatTag' | 'note'>>;

export function createSwipeUseCases(deps: { swipes: SwipeRepository }) {
  const { swipes } = deps;

  /** Saving the same tweet URL twice returns the existing item instead of duplicating it. */
  async function saveSwipe(input: NewSwipe): Promise<SwipeItem> {
    const tweetUrl = input.tweetUrl.trim();
    const existing = (await swipes.list()).find((s) => s.tweetUrl === tweetUrl);
    if (existing) return existing;

    const item: SwipeItem = {
      id: crypto.randomUUID(),
      tweetUrl,
      text: input.text,
      author: input.author,
      formatTag: input.formatTag ?? 'other',
      note: input.note ?? '',
      savedAt: Date.now(),
    };
    await swipes.add(item);
    return item;
  }

  /** Newest first. */
  async function listSwipes(filter?: { formatTag?: FormatTag }): Promise<SwipeItem[]> {
    const all = await swipes.list();
    return all
      .filter((s) => !filter?.formatTag || s.formatTag === filter.formatTag)
      .sort((a, b) => b.savedAt - a.savedAt);
  }

  return {
    saveSwipe,
    listSwipes,
    isSaved: async (tweetUrl: string) =>
      (await swipes.list()).some((s) => s.tweetUrl === tweetUrl.trim()),
    updateSwipe: (id: string, patch: SwipePatch) => swipes.update(id, patch),
    deleteSwipe: (id: string) => swipes.remove(id),
  };
}
