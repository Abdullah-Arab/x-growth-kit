import { POST_TEMPLATES } from '@/src/lib/templates';
import type { FormatTag } from '@/src/lib/types';
import { OWN } from './selectors';
import { detectTheme } from './theme';

export interface PickerOptions {
  anchor: HTMLElement;
  /** Element to refocus when the picker closes. */
  returnFocus?: HTMLElement;
  preview: { author: string; text: string };
  initial?: { formatTag: FormatTag; note: string };
  onSave(value: { formatTag: FormatTag; note: string }): Promise<void>;
  /** Present only when the tweet is already saved. */
  onRemove?(): Promise<void>;
}

const WIDTH = 300;
const MARGIN = 8;

const STYLE = `
:host { all: initial; }
.panel {
  --bg: #000; --surface: #16181c; --border: #2f3336; --text: #e7e9ea; --muted: #71767b;
  --accent: #1d9bf0; --danger: #f4212e;
  position: fixed; z-index: 2147483647; width: ${WIDTH}px; box-sizing: border-box;
  padding: 14px; border-radius: 16px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text);
  box-shadow: rgba(255,255,255,.2) 0 0 15px, rgba(255,255,255,.15) 0 0 3px 1px;
  font: 15px/20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.panel.light {
  --bg: #fff; --surface: #f7f9f9; --border: #cfd9de; --text: #0f1419; --muted: #536471;
  box-shadow: rgba(101,119,134,.2) 0 0 15px, rgba(101,119,134,.15) 0 0 3px 1px;
}
h2 { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
.preview { margin: 0 0 12px; padding: 8px 10px; border-radius: 10px; background: var(--surface);
  font-size: 13px; line-height: 17px; color: var(--muted);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.preview b { color: var(--text); font-weight: 600; }
label { display: block; margin-bottom: 10px; font-size: 13px; font-weight: 600; }
select, textarea {
  display: block; width: 100%; box-sizing: border-box; margin-top: 4px;
  padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font: inherit; font-size: 14px; outline: none;
}
select:focus, textarea:focus { border-color: var(--accent); }
textarea { resize: vertical; min-height: 60px; max-height: 200px; }
.row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.spacer { flex: 1; }
button { font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; border-radius: 9999px;
  padding: 6px 16px; border: 1px solid transparent; }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button:disabled { opacity: .5; cursor: default; }
.primary { background: var(--text); color: var(--bg); }
.ghost { background: transparent; color: var(--text); border-color: var(--border); }
.remove { background: transparent; color: var(--danger); padding: 6px 4px; }
.error { margin: 8px 0 0; font-size: 13px; color: var(--danger); }
.error:empty { display: none; }
`;

export interface Picker {
  open(options: PickerOptions): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function createPicker(): Picker {
  let host: HTMLElement | null = null;
  let current: PickerOptions | null = null;
  let cleanup: Array<() => void> = [];

  function close() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
    host?.remove();
    host = null;
    const focus = current?.returnFocus;
    current = null;
    focus?.focus();
  }

  function open(options: PickerOptions) {
    close();
    current = options;

    host = document.createElement('div');
    host.setAttribute(OWN.pickerHostAttr, '');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLE}</style>`;

    const panel = el('div', { class: `panel ${detectTheme()}`, role: 'dialog', 'aria-label': 'Save to swipe file' });
    panel.append(el('h2', {}, options.initial ? 'Edit swipe' : 'Save to swipe file'));

    const preview = el('p', { class: 'preview' });
    preview.append(el('b', {}, options.preview.author || 'Tweet'), ` ${options.preview.text || '(no text)'}`);
    panel.append(preview);

    const select = el('select') as HTMLSelectElement;
    for (const [value, label] of [...POST_TEMPLATES.map((t) => [t.id, t.name]), ['other', 'Other']]) {
      const option = el('option', { value: value! }, label) as HTMLOptionElement;
      select.append(option);
    }
    select.value = options.initial?.formatTag ?? 'other';
    const tagLabel = el('label', {}, 'Format');
    tagLabel.append(select);

    const note = el('textarea', { placeholder: 'Why is this worth stealing? (optional)', rows: '3' }) as HTMLTextAreaElement;
    note.value = options.initial?.note ?? '';
    const noteLabel = el('label', {}, 'Note');
    noteLabel.append(note);

    const save = el('button', { class: 'primary', type: 'button' }, options.initial ? 'Update' : 'Save') as HTMLButtonElement;
    const cancel = el('button', { class: 'ghost', type: 'button' }, 'Cancel') as HTMLButtonElement;
    const row = el('div', { class: 'row' });
    if (options.onRemove) {
      row.append(el('button', { class: 'remove', type: 'button', 'data-action': 'remove' }, 'Remove'));
    }
    row.append(el('span', { class: 'spacer' }), cancel, save);

    const error = el('p', { class: 'error', role: 'alert' });
    panel.append(tagLabel, noteLabel, row, error);
    root.append(panel);
    document.body.append(host);

    async function run(action: () => Promise<void>) {
      const buttons = [...row.querySelectorAll('button')] as HTMLButtonElement[];
      buttons.forEach((b) => (b.disabled = true));
      error.textContent = '';
      try {
        await action();
        close();
      } catch (err) {
        error.textContent = isContextInvalidated(err)
          ? 'X Growth Kit was updated. Refresh the page to keep saving.'
          : 'Could not save. Please try again.';
        buttons.forEach((b) => (b.disabled = false));
      }
    }

    const doSave = () => run(() => options.onSave({ formatTag: select.value as FormatTag, note: note.value.trim() }));
    save.addEventListener('click', doSave);
    cancel.addEventListener('click', close);
    row.querySelector('[data-action="remove"]')?.addEventListener('click', () => run(() => options.onRemove!()));

    // Keep keystrokes away from X's global shortcuts (j/k, l, r, n …) and handle our own.
    for (const type of ['keydown', 'keyup', 'keypress'] as const) {
      host.addEventListener(type, (e) => {
        e.stopPropagation();
        if (type !== 'keydown') return;
        const key = (e as KeyboardEvent);
        if (key.key === 'Escape') close();
        else if (key.key === 'Enter' && (key.metaKey || key.ctrlKey)) doSave();
      });
    }
    // Clicks inside must not reach the tweet underneath.
    for (const type of ['click', 'mousedown', 'pointerdown'] as const) {
      host.addEventListener(type, (e) => e.stopPropagation());
    }

    const onOutside = (e: Event) => {
      if (host && !e.composedPath().includes(host) && !e.composedPath().includes(options.anchor)) close();
    };
    document.addEventListener('pointerdown', onOutside, true);
    cleanup.push(() => document.removeEventListener('pointerdown', onOutside, true));

    // Follow the anchor while X scrolls; close if it scrolls out or gets unmounted.
    let frame = 0;
    const reposition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!options.anchor.isConnected) return close();
        position(panel, options.anchor);
      });
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    cleanup.push(() => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    });

    position(panel, options.anchor);
    select.focus();
  }

  return {
    open,
    close,
    isOpen: () => host !== null,
    destroy: close,
  };
}

/** Below the anchor if there's room, otherwise above; clamped to the viewport. */
function position(panel: HTMLElement, anchor: HTMLElement) {
  const a = anchor.getBoundingClientRect();
  const h = panel.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const below = a.bottom + MARGIN;
  const top = below + h <= vh - MARGIN ? below : Math.max(MARGIN, a.top - MARGIN - h);
  const left = Math.min(Math.max(MARGIN, a.right - WIDTH), vw - WIDTH - MARGIN);
  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}

function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}

function isContextInvalidated(err: unknown): boolean {
  return err instanceof Error && /context invalidated/i.test(err.message);
}
