import { OWN } from './selectors';

const ICON_OUTLINE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 3h8.414L20 8.586V19.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H6zm0 2v14h12V9.414L13.586 5H6zm5 3h2v3h3v2h-3v3h-2v-3H8v-2h3V8z"/></svg>`;
const ICON_SAVED = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.5 3h8.914L20 8.586V19.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3zm5.29 13.2 5.66-5.66-1.41-1.42-4.25 4.25-2.12-2.12-1.42 1.41 3.54 3.54z"/></svg>`;

// Mirrors X's action-bar icon buttons: 18.75px glyph, 34px circular hover target, gray → blue.
const STYLE = `
:host { display: flex; align-items: center; }
button {
  all: unset; box-sizing: border-box; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 34.75px; height: 34.75px; margin: -8px 0; border-radius: 9999px;
  color: rgb(113, 118, 123);
  transition: color .2s, background-color .2s;
}
button:hover, button:focus-visible { color: rgb(29, 155, 240); background: rgba(29, 155, 240, .1); }
button:focus-visible { outline: 2px solid rgb(29, 155, 240); }
button[aria-pressed="true"] { color: rgb(29, 155, 240); }
svg { width: 18.75px; height: 18.75px; }
`;

export interface SaveButton {
  host: HTMLElement;
  button: HTMLButtonElement;
  setSaved(saved: boolean): void;
}

export function createSaveButton(onClick: (button: SaveButton) => void): SaveButton {
  const host = document.createElement('div');
  host.setAttribute(OWN.saveHostAttr, '');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${STYLE}</style><button type="button"></button>`;
  const button = root.querySelector('button')!;

  let saved: boolean | null = null;
  const handle: SaveButton = {
    host,
    button,
    setSaved(next) {
      if (next === saved) return;
      saved = next;
      const label = next ? 'Saved to swipe file' : 'Save to swipe file';
      button.innerHTML = next ? ICON_SAVED : ICON_OUTLINE;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(next));
      button.title = label;
    },
  };
  handle.setSaved(false);

  // The tweet <article> navigates on click; keep our clicks to ourselves.
  for (const type of ['click', 'mousedown', 'pointerdown', 'mouseup'] as const) {
    button.addEventListener(type, (e) => {
      e.stopPropagation();
      if (type === 'click') {
        e.preventDefault();
        onClick(handle);
      }
    });
  }

  return handle;
}
