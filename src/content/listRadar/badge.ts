import { OWN } from '../selectors';

const STYLE = `
:host { display: inline-flex; align-items: center; margin-left: 6px; vertical-align: middle; }
span {
  display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
  padding: 1px 7px; border-radius: 9999px; border: 1px solid rgba(113, 118, 123, .5);
  color: rgb(113, 118, 123);
  font: 500 12px/16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
span.fresh { border-color: transparent; background: rgb(29, 155, 240); color: #fff; }
span.fresh::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
`;

export interface RadarBadge {
  host: HTMLElement;
  update(text: string, label: string, fresh: boolean): void;
}

export function createRadarBadge(): RadarBadge {
  const host = document.createElement('span');
  host.setAttribute(OWN.radarBadgeAttr, '');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${STYLE}</style><span></span>`;
  const pill = root.querySelector('span')!;
  let last = '';

  return {
    host,
    update(text, label, fresh) {
      const key = `${text}|${label}|${fresh}`;
      if (key === last) return; // avoid needless DOM writes on every scan
      last = key;
      pill.textContent = text;
      pill.className = fresh ? 'fresh' : '';
      host.setAttribute('role', 'note');
      host.setAttribute('aria-label', label);
      host.title = label;
    },
  };
}
