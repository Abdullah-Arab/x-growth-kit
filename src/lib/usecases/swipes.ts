import type { SwipeRepository } from '../storage';
import { normalizeTweetUrl } from '../tweetUrl';
import type { FormatTag, SwipeItem } from '../types';

export type NewSwipe = Pick<SwipeItem, 'tweetUrl' | 'text' | 'author'> &
  Partial<Pick<SwipeItem, 'formatTag' | 'note'>>;

export type SwipePatch = Partial<Pick<SwipeItem, 'text' | 'author' | 'formatTag' | 'note'>>;

export function createSwipeUseCases(deps: { swipes: SwipeRepository }) {
  const { swipes } = deps;

  async function getByUrl(tweetUrl: string): Promise<SwipeItem | null> {
    const url = normalizeTweetUrl(tweetUrl);
    return (await swipes.list()).find((s) => s.tweetUrl === url) ?? null;
  }

  /** Saving the same tweet URL twice returns the existing item instead of duplicating it. */
  async function saveSwipe(input: NewSwipe): Promise<SwipeItem> {
    const tweetUrl = normalizeTweetUrl(input.tweetUrl);
    const existing = await getByUrl(tweetUrl);
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

  /** Newest first. `query` matches text, author, and note (case-insensitive, all words). */
  async function listSwipes(filter?: { formatTag?: FormatTag; query?: string }): Promise<SwipeItem[]> {
    const words = (filter?.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const all = await swipes.list();
    return all
      .filter((s) => !filter?.formatTag || s.formatTag === filter.formatTag)
      .filter((s) => {
        if (words.length === 0) return true;
        const haystack = `${s.text}\n${s.author}\n${s.note}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      })
      .sort((a, b) => b.savedAt - a.savedAt);
  }

  return {
    saveSwipe,
    listSwipes,
    getByUrl,
    isSaved: async (tweetUrl: string) => (await getByUrl(tweetUrl)) !== null,
    /** Fires with the full list whenever swipes change anywhere in the extension. */
    watchSwipes: (callback: (items: SwipeItem[]) => void) => swipes.watch(callback),
    updateSwipe: (id: string, patch: SwipePatch) => swipes.update(id, patch),
    deleteSwipe: (id: string) => swipes.remove(id),
  };
}
