import { z } from 'zod';
import { TEMPLATE_IDS } from './templates';
import { DRAFT_STATUSES, EXPORT_SCHEMA_VERSION } from './types';

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
});

export const exportPayloadSchema = z.object({
  app: z.literal('x-growth-kit'),
  schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
  exportedAt: z.string(),
  data: z.object({
    settings: settingsSchema,
    dailyLogs: z.array(dailyLogSchema),
    swipes: z.array(swipeItemSchema),
    drafts: z.array(draftSchema),
  }),
});
