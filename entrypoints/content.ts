export default defineContentScript({
  matches: ['*://x.com/*'],
  main() {
    try {
      // Content features (save-to-swipe, reply counter) mount here.
      // They must fail silently if selectors break.
    } catch {
      // never crash the page
    }
  },
});
