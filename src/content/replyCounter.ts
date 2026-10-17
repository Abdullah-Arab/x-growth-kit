import type { createDailyLogUseCases } from '@/src/lib/usecases/dailyLog';
import { toDateKey } from '@/src/lib/date';
import { mountReplyDetector } from './replyDetector';
import { dismissToast, showToast } from './toast';

interface Lifecycle {
  onInvalidated(callback: () => void): void;
}

/** Auto-counts confirmed replies toward today's target, with an on-page Undo. */
export function mountReplyCounter(
  dailyLog: ReturnType<typeof createDailyLogUseCases>,
  lifecycle: Lifecycle,
) {
  const unmount = mountReplyDetector(
    {
      async onReplyConfirmed() {
        const date = toDateKey();
        try {
          const log = await dailyLog.increment('replies', 1, date);
          const { metrics } = await dailyLog.getProgress(date);
          const target = metrics.find((m) => m.metric === 'replies')?.target ?? 0;
          showToast(`Reply counted · ${log.counts.replies}/${target} today`, {
            label: 'Undo',
            run: () => {
              dailyLog.increment('replies', -1, date).catch(() => {});
            },
          });
        } catch {
          // extension reloaded or storage unavailable; the popup's +1 is the fallback
        }
      },
    },
    lifecycle,
  );
  lifecycle.onInvalidated(dismissToast);
  return () => {
    unmount();
    dismissToast();
  };
}
