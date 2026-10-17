/**
 * Opt-in diagnostics for checking detection on live x.com.
 * Enable in the x.com DevTools console: localStorage.xgkDebug = '1'
 */
export function debug(...args: unknown[]) {
  try {
    if (localStorage.getItem('xgkDebug') === '1') console.debug('[X Growth Kit]', ...args);
  } catch {
    // storage blocked; stay quiet
  }
}
