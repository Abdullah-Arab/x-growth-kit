export type Theme = 'dark' | 'light';

/** X has light, dim, and lights-out modes; it paints the choice on <body>. */
export function detectTheme(): Theme {
  try {
    const bg = getComputedStyle(document.body).backgroundColor;
    const [r = 0, g = 0, b = 0] = bg.match(/\d+/g)?.map(Number) ?? [];
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
