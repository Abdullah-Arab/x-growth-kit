import { getTemplate, type DraftStatus, type FormatTag, type Metric } from '@/src/lib';

export const METRIC_LABELS: Record<Metric, string> = {
  tweets: 'Tweets',
  replies: 'Replies',
  questionTweets: 'Question tweets',
  listChecks: 'List checks',
};

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  idea: 'Idea',
  drafted: 'Drafted',
  posted: 'Posted',
};

export function formatTagLabel(tag: FormatTag): string {
  return tag === 'other' ? 'Other' : getTemplate(tag).name;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function shortDate(ts: number): string {
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}
