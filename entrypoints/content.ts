import { createSwipeRepository } from '@/src/lib/storage';
import { createSwipeUseCases } from '@/src/lib/usecases/swipes';
import { mountSwipeSaver } from '@/src/content/swipeSaver';

export default defineContentScript({
  matches: ['*://x.com/*'],
  main(ctx) {
    try {
      // Wire only what's needed here; importing the full `app` would pull zod etc. into every x.com page.
      mountSwipeSaver(createSwipeUseCases({ swipes: createSwipeRepository() }), ctx);
    } catch {
      // never crash the page
    }
  },
});
