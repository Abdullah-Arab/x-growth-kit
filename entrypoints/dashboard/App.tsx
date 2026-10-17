import { useState } from 'react';
import { DraftsView } from './components/DraftsView';
import { LibraryView } from './components/LibraryView';
import { SettingsView } from './components/SettingsView';
import { StreakView } from './components/StreakView';
import { TodayView } from './components/TodayView';
import { WeeklyView } from './components/WeeklyView';

const TABS = ['Today', 'Streak', 'Library', 'Drafts', 'Weekly'] as const;
type View = (typeof TABS)[number] | 'Settings';

export default function App() {
  const [view, setView] = useState<View>('Today');

  return (
    <div className="mx-auto min-h-screen max-w-3xl border-x border-border">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 pt-3">
          <h1 className="text-xl font-bold">X Growth Kit</h1>
          <button
            type="button"
            onClick={() => setView(view === 'Settings' ? 'Today' : 'Settings')}
            aria-label="Settings"
            aria-pressed={view === 'Settings'}
            title="Settings"
            className={`flex size-9 items-center justify-center rounded-full hover:bg-surface ${
              view === 'Settings' ? 'text-accent' : 'text-muted'
            }`}
          >
            <GearIcon />
          </button>
        </div>
        <nav className="flex" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setView(t)}
              aria-current={t === view ? 'page' : undefined}
              className={`flex-1 py-3 text-sm font-medium hover:bg-surface ${
                t === view ? 'border-b-2 border-accent text-text' : 'text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {view === 'Today' && <TodayView />}
        {view === 'Streak' && <StreakView />}
        {view === 'Library' && <LibraryView />}
        {view === 'Drafts' && <DraftsView />}
        {view === 'Weekly' && <WeeklyView />}
        {view === 'Settings' && <SettingsView />}
      </main>
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
