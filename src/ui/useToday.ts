import { useEffect, useState } from 'react';
import { toDateKey, type DateKey } from '@/src/lib';

/** Today's DateKey, rolling over at local midnight while the page stays open. */
export function useToday(): DateKey {
  const [today, setToday] = useState(toDateKey);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(toDateKey()), nextMidnight.getTime() - now.getTime() + 1000);
    return () => clearTimeout(timer);
  }, [today]);

  return today;
}
