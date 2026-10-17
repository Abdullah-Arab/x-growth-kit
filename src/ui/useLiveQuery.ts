import { useEffect, useState, type DependencyList } from 'react';

/**
 * Runs an async query and re-runs it whenever chrome.storage.local changes,
 * so the popup, dashboard, and content script stay in sync.
 * Returns undefined until the first result arrives.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: DependencyList): T | undefined {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    let latest = 0;
    let active = true;
    const run = () => {
      const id = ++latest;
      query().then((result) => {
        if (active && id === latest) setValue(result);
      });
    };
    const onChanged = (_: unknown, area: string) => {
      if (area === 'local') run();
    };

    run();
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      browser.storage.onChanged.removeListener(onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
