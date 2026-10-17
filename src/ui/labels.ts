import type { Metric } from '@/src/lib';

export const METRIC_LABELS: Record<Metric, string> = {
  tweets: 'Tweets',
  replies: 'Replies',
  questionTweets: 'Question tweets',
  listChecks: 'List checks',
};

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
