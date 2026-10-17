import { OWN } from './selectors';
import { detectTheme } from './theme';

const DURATION_MS = 6000;

const STYLE = `
:host { all: initial; }
.toast {
  position: fixed; z-index: 2147483646; left: 50%; bottom: 96px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 16px; max-width: calc(100vw - 32px); box-sizing: border-box;
  padding: 10px 16px; border-radius: 6px; background: #1d9bf0; color: #fff;
  font: 15px/20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-shadow: rgba(255,255,255,.2) 0 0 15px, rgba(255,255,255,.15) 0 0 3px 1px;
  animation: in .2s ease-out;
}
.toast.light { box-shadow: rgba(101,119,134,.2) 0 0 15px, rgba(101,119,134,.15) 0 0 3px 1px; }
button { all: unset; cursor: pointer; font-weight: 700; text-decoration: underline; }
button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
@keyframes in { from { opacity: 0; transform: translate(-50%, 8px); } }
@media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
`;

let current: { host: HTMLElement; timer: ReturnType<typeof setTimeout> } | null = null;

/** One toast at a time; a new one replaces the old. */
export function showToast(message: string, action?: { label: string; run: () => void }) {
  dismissToast();
  const host = document.createElement('div');
  host.setAttribute(OWN.toastHostAttr, '');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${STYLE}</style>`;

  const toast = document.createElement('div');
  toast.className = `toast ${detectTheme()}`;
  toast.setAttribute('role', 'status');
  toast.append(document.createElement('span'));
  toast.firstElementChild!.textContent = message;
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissToast();
      action.run();
    });
    toast.append(button);
  }
  // Keep clicks off the page underneath.
  host.addEventListener('click', (e) => e.stopPropagation());
  root.append(toast);
  document.body.append(host);
  current = { host, timer: setTimeout(dismissToast, DURATION_MS) };
}

export function dismissToast() {
  if (!current) return;
  clearTimeout(current.timer);
  current.host.remove();
  current = null;
}
