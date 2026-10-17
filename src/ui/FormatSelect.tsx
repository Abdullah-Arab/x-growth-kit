import { POST_TEMPLATES, type FormatTag } from '@/src/lib';

/** Native select over the 12 templates (+ Other). */
export function FormatSelect(props: {
  value: FormatTag;
  onChange: (tag: FormatTag) => void;
  includeOther?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as FormatTag)}
      aria-label={props['aria-label']}
      className={`rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent ${props.className ?? ''}`}
    >
      {POST_TEMPLATES.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
      {props.includeOther !== false && <option value="other">Other</option>}
    </select>
  );
}
