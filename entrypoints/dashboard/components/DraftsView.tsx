import { useEffect, useRef, useState } from 'react';
import { app, DRAFT_STATUSES, POST_TEMPLATES, type Draft, type DraftStatus, type PostTemplate } from '@/src/lib';
import { DRAFT_STATUS_LABELS, shortDate } from '@/src/ui/labels';
import { useLiveQuery } from '@/src/ui/useLiveQuery';

const MAX_CHARS = 280;
const SAVE_DEBOUNCE_MS = 400;

type Filter = 'active' | DraftStatus | 'all';
const FILTERS: { id: Filter; label: string; matches: (d: Draft) => boolean }[] = [
  { id: 'active', label: 'In progress', matches: (d) => d.status !== 'posted' },
  ...DRAFT_STATUSES.map((s) => ({ id: s as Filter, label: DRAFT_STATUS_LABELS[s], matches: (d: Draft) => d.status === s })),
  { id: 'all', label: 'All', matches: () => true },
];

export function DraftsView() {
  const drafts = useLiveQuery(() => app.drafts.listDrafts(), []);
  const [filter, setFilter] = useState<Filter>('active');
  const [focusId, setFocusId] = useState<string | null>(null);

  if (!drafts) return null;

  const matches = FILTERS.find((f) => f.id === filter)!.matches;
  const visible = drafts.filter(matches);

  async function newDraft(template: PostTemplate) {
    const draft = await app.drafts.createDraft(template.id);
    if (filter === 'posted') setFilter('active');
    setFocusId(draft.id);
  }

  return (
    <section>
      <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-3" role="tablist" aria-label="Filter drafts by status">
        {FILTERS.map((f) => {
          const count = drafts.filter(f.matches).length;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm ${
                filter === f.id ? 'bg-text font-bold text-bg' : 'text-muted hover:bg-surface hover:text-text'
              }`}
            >
              {f.label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {drafts.length === 0 && (
        <p className="px-4 pt-4 text-sm text-muted">
          Pick a format below and start a draft. Move it from Idea → Drafted → Posted as you go; posted drafts show up in your
          weekly review.
        </p>
      )}

      <div className="space-y-3 p-4">
        {POST_TEMPLATES.map((t) => (
          <TemplateSection
            key={t.id}
            template={t}
            drafts={visible.filter((d) => d.templateType === t.id)}
            focusId={focusId}
            onNew={() => newDraft(t)}
          />
        ))}
      </div>
    </section>
  );
}

function TemplateSection(props: { template: PostTemplate; drafts: Draft[]; focusId: string | null; onNew: () => void }) {
  const { template, drafts } = props;
  return (
    <div className="rounded-2xl border border-border">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">
            {template.name}
            {drafts.length > 0 && <span className="ml-2 text-sm font-normal tabular-nums text-muted">{drafts.length}</span>}
          </h3>
          <p className="text-sm text-muted">{template.description}</p>
        </div>
        <button
          type="button"
          onClick={props.onNew}
          aria-label={`New ${template.name} draft`}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-sm font-bold hover:bg-surface"
        >
          + New
        </button>
      </div>
      {drafts.length > 0 && (
        <ul className="border-t border-border">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} template={template} autoFocus={d.id === props.focusId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DraftCard({ draft, template, autoFocus }: { draft: Draft; template: PostTemplate; autoFocus: boolean }) {
  const [text, setText] = useState(draft.text);
  const [copied, setCopied] = useState(false);
  const focused = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; value: string } | null>(null);

  // Take outside changes (other tabs, imports) unless the user is typing here.
  useEffect(() => {
    if (!focused.current && !pending.current) setText(draft.text);
  }, [draft.text]);

  function flush() {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    app.drafts.updateDraftText(draft.id, pending.current.value);
    pending.current = null;
  }
  useEffect(() => flush, []); // save on unmount

  // A new draft may render before it's marked for focus, so autoFocus alone isn't enough.
  useEffect(() => {
    if (autoFocus) textarea.current?.focus();
  }, [autoFocus]);

  function onChange(value: string) {
    setText(value);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { value, timer: setTimeout(flush, SAVE_DEBOUNCE_MS) };
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const over = text.length > MAX_CHARS;

  return (
    <li className="border-b border-border px-4 py-3 last:border-b-0">
      <textarea
        ref={textarea}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          flush();
        }}
        placeholder={template.description}
        aria-label={`${template.name} draft`}
        className="field-sizing-content min-h-16 w-full resize-none bg-transparent text-[15px] leading-5 outline-none placeholder:text-muted/70"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-border p-0.5" role="group" aria-label="Status">
          {DRAFT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={draft.status === s}
              onClick={() => {
                flush();
                app.drafts.setDraftStatus(draft.id, s);
              }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                draft.status === s
                  ? s === 'posted'
                    ? 'bg-success text-black'
                    : s === 'drafted'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text'
                  : 'text-muted hover:text-text'
              }`}
            >
              {DRAFT_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {draft.postedAt !== null && <span className="text-xs text-muted">Posted {shortDate(draft.postedAt)}</span>}
        <span className={`ml-auto text-xs tabular-nums ${over ? 'font-bold text-danger' : 'text-muted'}`}>
          {text.length}/{MAX_CHARS}
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={!text}
          className="rounded-full px-2 py-0.5 text-xs text-muted hover:text-accent disabled:opacity-40"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!text.trim() || confirm('Delete this draft?')) {
              if (pending.current) clearTimeout(pending.current.timer);
              pending.current = null;
              app.drafts.deleteDraft(draft.id);
            }
          }}
          className="rounded-full px-2 py-0.5 text-xs text-muted hover:text-danger"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
