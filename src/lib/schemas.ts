import { z } from 'zod';
import { TEMPLATE_IDS } from './templates';
import { migrateDraftToV2 } from './migrations';
import { DRAFT_STATUSES } from './types';

// Runtime validation for imported JSON. Mirrors ./types.ts.

const count = z.number().int().min(0);
const timestamp = z.number().int().min(0);
const templateId = z.enum(TEMPLATE_IDS);

const metricCounts = z.object({
  tweets: count,
  replies: count,
  questionTweets: count,
  listChecks: count,
});

export const settingsSchema = z.object({ targets: metricCounts });

export const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  counts: metricCounts,
  updatedAt: timestamp,
});

export const swipeItemSchema = z.object({
  id: z.string().min(1),
  tweetUrl: z.string(),
  text: z.string(),
  author: z.string(),
  formatTag: z.union([templateId, z.literal('other')]),
  note: z.string(),
  savedAt: timestamp,
});

export const draftSchema = z.object({
  id: z.string().min(1),
  templateType: templateId,
  text: z.string(),
  status: z.enum(DRAFT_STATUSES),
  createdAt: timestamp,
  updatedAt: timestamp,
  postedAt: timestamp.nullable(),
});

/** v1 drafts: old status names, no postedAt. Upgraded to v2 on parse. */
const draftSchemaV1 = draftSchema
  .omit({ status: true, postedAt: true })
  .extend({ status: z.enum(['idea', 'drafting', 'ready', 'posted']) })
  .transform(migrateDraftToV2);

const payload = <D extends z.ZodType>(version: 1 | 2, draft: D) =>
  z.object({
    app: z.literal('x-growth-kit'),
    schemaVersion: z.literal(version),
    exportedAt: z.string(),
    data: z.object({
      settings: settingsSchema,
      dailyLogs: z.array(dailyLogSchema),
      swipes: z.array(swipeItemSchema),
      drafts: z.array(draft),
    }),
  });

/** Accepts current (v2) and older (v1) backups; output is always the current shape. */
export const exportPayloadSchema = z.discriminatedUnion('schemaVersion', [
  payload(2, draftSchema),
  payload(1, draftSchemaV1),
]);
