import { useState, type FormEvent } from 'react';
import { app, normalizeTweetUrl, POST_TEMPLATES, type FormatTag, type SwipeItem } from '@/src/lib';
import { FormatSelect } from '@/src/ui/FormatSelect';
import { formatTagLabel, plural, shortDate } from '@/src/ui/labels';
import { useLiveQuery } from '@/src/ui/useLiveQuery';

const TAG_ORDER: FormatTag[] = [...POST_TEMPLATES.map((t) => t.id), 'other'];

export function LibraryView() {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<FormatTag | 'all'>('all');
  const [adding, setAdding] = useState(false);

  const all = useLiveQuery(() => app.swipes.listSwipes(), []);
  const visible = useLiveQuery(
    () => app.swipes.listSwipes({ formatTag: tag === 'all' ? undefined : tag, query }),
    [tag, query],
  );

  if (!all || !visible) return null;

  const counts = new Map<FormatTag, number>();
  for (const s of all) counts.set(s.formatTag, (counts.get(s.formatTag) ?? 0) + 1);
  const chips = TAG_ORDER.filter((t) => counts.has(t) || t === tag);

  return (
    <section>
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text, author, notes"
            aria-label="Search saved tweets"
            className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setAdding(!adding)}
            aria-expanded={adding}
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-surface"
          >
            {adding ? 'Close' : 'Add tweet'}
          </button>
        </div>

        {adding && <AddSwipeForm onDone={() => setAdding(false)} />}

        {all.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Filter by format">
            <Chip active={tag === 'all'} onClick={() => setTag('all')} label="All" count={all.length} />
            {chips.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(t)} label={formatTagLabel(t)} count={counts.get(t) ?? 0} />
            ))}
          </div>
        )}
      </div>

      {all.length === 0 ? (
        <Empty
          title="Your swipe file is empty"
          body="On x.com, click the save icon in any tweet's action bar, or add a tweet by URL above."
        />
      ) : visible.length === 0 ? (
        <Empty title="No matches" body="Try a different search or format." />
      ) : (
        <>
          <p className="px-4 pt-3 text-xs text-muted">{plural(visible.length, 'tweet')}</p>
          <ul>
            {visible.map((s) => (
              <SwipeCard key={s.id} swipe={s} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Chip(props: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.active}
      onClick={props.onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
        props.active ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted hover:bg-surface hover:text-text'
      }`}
    >
      {props.label} <span className="tabular-nums opacity-70">{props.count}</span>
    </button>
  );
}

function SwipeCard({ swipe }: { swipe: SwipeItem }) {
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(swipe.note);
  const handle = swipe.author.replace(/^@/, '');

  async function saveNote() {
    await app.swipes.updateSwipe(swipe.id, { note: note.trim() });
    setEditingNote(false);
  }

  return (
    <li className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        {handle ? (
          <a href={`https://x.com/${handle}`} target="_blank" rel="noreferrer" className="truncate font-bold hover:underline">
            {swipe.author}
          </a>
        ) : (
          <span className="font-bold text-muted">Unknown author</span>
        )}
        <span className="shrink-0 text-muted">· {shortDate(swipe.savedAt)}</span>
        <FormatSelect
          value={swipe.formatTag}
          onChange={(formatTag) => app.swipes.updateSwipe(swipe.id, { formatTag })}
          aria-label="Format"
          className="ml-auto max-w-44 shrink-0 py-1 text-xs"
        />
      </div>

      {swipe.text ? (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-5">{swipe.text}</p>
      ) : (
        <p className="mt-1.5 text-sm italic text-muted">No text saved</p>
      )}

      {editingNote ? (
        <div className="mt-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
            rows={2}
            placeholder="Why is this worth stealing?"
            aria-label="Note"
            className="field-sizing-content min-h-16 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote();
              if (e.key === 'Escape') {
                setNote(swipe.note);
                setEditingNote(false);
              }
            }}
          />
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={saveNote} className="rounded-full bg-text px-3 py-1 text-xs font-bold text-bg">
              Save note
            </button>
            <button
              type="button"
              onClick={() => {
                setNote(swipe.note);
                setEditingNote(false);
              }}
              className="px-2 py-1 text-xs text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        swipe.note && (
          <p className="mt-2 rounded-lg border-l-2 border-accent bg-surface px-3 py-2 text-sm text-text/90">{swipe.note}</p>
        )
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-muted">
        <a href={swipe.tweetUrl} target="_blank" rel="noreferrer" className="hover:text-accent">
          Open on X ↗
        </a>
        {!editingNote && (
          <button
            type="button"
            onClick={() => {
              setNote(swipe.note);
              setEditingNote(true);
            }}
            className="hover:text-text"
          >
            {swipe.note ? 'Edit note' : 'Add note'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm('Remove this tweet from your swipe file?')) app.swipes.deleteSwipe(swipe.id);
          }}
          className="ml-auto hover:text-danger"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

/** Manual fallback for the x.com save button. */
function AddSwipeForm({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [formatTag, setFormatTag] = useState<FormatTag>('other');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const tweetUrl = normalizeTweetUrl(url);
    const match = /^https:\/\/x\.com\/([^/]+)\/status\/\d+$/.exec(tweetUrl);
    if (!match) return setError('Paste a tweet link like https://x.com/user/status/123…');
    if (await app.swipes.isSaved(tweetUrl)) return setError('That tweet is already in your swipe file.');
    await app.swipes.saveSwipe({ tweetUrl, text: text.trim(), author: `@${match[1]}`, formatTag, note: note.trim() });
    onDone();
  }

  const field = 'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-2xl border border-border p-3" noValidate>
      <input
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError(null);
        }}
        placeholder="Tweet URL"
        aria-label="Tweet URL"
        aria-invalid={!!error}
        autoFocus
        className={`${field} aria-[invalid=true]:border-danger`}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tweet text (paste it in, optional)"
        aria-label="Tweet text"
        rows={3}
        className={`${field} field-sizing-content min-h-20`}
      />
      <div className="flex flex-wrap gap-2">
        <FormatSelect value={formatTag} onChange={setFormatTag} aria-label="Format" />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className={`${field} min-w-40 flex-1`}
        />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="rounded-full bg-text px-4 py-1.5 text-sm font-bold text-bg hover:bg-text/90">
          Save tweet
        </button>
        {error && (
          <span role="alert" className="text-sm text-danger">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-8 py-16 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}
