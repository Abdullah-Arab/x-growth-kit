import { useState } from 'react';

const TABS = ['Today', 'Streak', 'Library', 'Drafts', 'Weekly'] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>('Today');

  return (
    <div className="mx-auto min-h-screen max-w-3xl border-x border-border">
      <header className="sticky top-0 border-b border-border bg-bg/80 backdrop-blur">
        <h1 className="px-4 pt-3 text-xl font-bold">X Growth Kit</h1>
        <nav className="flex">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium hover:bg-surface ${
                t === tab ? 'border-b-2 border-accent text-text' : 'text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>
      <main className="p-4 text-muted">{tab} coming soon.</main>
    </div>
  );
}
