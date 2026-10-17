# X Growth Kit
Chrome extension (Manifest V3) that organizes a daily X growth routine.
No AI features. No X API. No backend. No auto-posting or auto-replying.

## Stack
WXT + React + TypeScript + Tailwind. pnpm.
All data in chrome.storage.local via a typed storage layer (src/lib/storage).

## Architecture
- entrypoints/dashboard: full-page React app (Today, Streak, Library, Drafts, Weekly)
- entrypoints/popup: quick view of today's progress + manual +1 buttons
- entrypoints/content: injected on x.com; save-to-swipe button, reply counter
- src/lib: storage repositories + use cases (Repository + UseCase pattern), types
- Content script DOM selectors live ONLY in src/content/selectors.ts

## Rules
- Content script features must fail silently if selectors break; never crash the page
- Every feature that auto-detects something also has a manual fallback
- Settings: daily targets (tweets, replies, question tweets, list checks)
- JSON export/import of all data (local storage is the only copy)
- Dark mode by default, matches X's look