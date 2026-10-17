import {
  createDailyLogRepository,
  createSettingsRepository,
  createSwipeRepository,
} from '@/src/lib/storage';
import { createDailyLogUseCases } from '@/src/lib/usecases/dailyLog';
import { createSwipeUseCases } from '@/src/lib/usecases/swipes';
import { mountReplyCounter } from '@/src/content/replyCounter';
import { mountSwipeSaver } from '@/src/content/swipeSaver';

export default defineContentScript({
  matches: ['*://x.com/*'],
  main(ctx) {
    // Wire only what's needed here; importing the full `app` would pull zod etc. into every x.com page.
    // Each feature is mounted independently so one failing can't take down the other.
    try {
      mountSwipeSaver(createSwipeUseCases({ swipes: createSwipeRepository() }), ctx);
    } catch {
      // never crash the page
    }
    try {
      const dailyLog = createDailyLogUseCases({
        dailyLogs: createDailyLogRepository(),
        settings: createSettingsRepository(),
      });
      mountReplyCounter(dailyLog, ctx);
    } catch {
      // never crash the page
    }
  },
});
