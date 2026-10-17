import { storage } from 'wxt/utils/storage';
import type { AppData, DailyLog, DateKey, Draft, Settings, SwipeItem } from '../types';
import { dailyLogsItem, draftsItem, settingsItem, swipesItem } from './items';

// Repositories: plain data access over chrome.storage.local. No business rules.

export interface SettingsRepository {
  get(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

export interface DailyLogRepository {
  get(date: DateKey): Promise<DailyLog | null>;
  /** Inclusive range, sorted by date ascending. */
  getRange(from: DateKey, to: DateKey): Promise<DailyLog[]>;
  getAll(): Promise<DailyLog[]>;
  upsert(log: DailyLog): Promise<void>;
}

export interface CollectionRepository<T extends { id: string }> {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  add(item: T): Promise<void>;
  /** Returns the updated item, or null if no item has that id. */
  update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<T | null>;
  remove(id: string): Promise<void>;
}

export type SwipeRepository = CollectionRepository<SwipeItem>;
export type DraftRepository = CollectionRepository<Draft>;

/** Whole-dataset read/write, used by export/import. writeAll is a single storage write. */
export interface SnapshotRepository {
  readAll(): Promise<AppData>;
  writeAll(data: AppData): Promise<void>;
}

export interface Repositories {
  settings: SettingsRepository;
  dailyLogs: DailyLogRepository;
  swipes: SwipeRepository;
  drafts: DraftRepository;
  snapshot: SnapshotRepository;
}

const byDate = (a: DailyLog, b: DailyLog) => a.date.localeCompare(b.date);

export function createSettingsRepository(): SettingsRepository {
  return {
    get: () => settingsItem.getValue(),
    save: (settings) => settingsItem.setValue(settings),
  };
}

export function createDailyLogRepository(): DailyLogRepository {
  return {
    async get(date) {
      const logs = await dailyLogsItem.getValue();
      return logs[date] ?? null;
    },
    async getRange(from, to) {
      const logs = await dailyLogsItem.getValue();
      return Object.values(logs)
        .filter((l) => l.date >= from && l.date <= to)
        .sort(byDate);
    },
    async getAll() {
      return Object.values(await dailyLogsItem.getValue()).sort(byDate);
    },
    async upsert(log) {
      const logs = await dailyLogsItem.getValue();
      await dailyLogsItem.setValue({ ...logs, [log.date]: log });
    },
  };
}

type ListItem<T> = { getValue(): Promise<T[]>; setValue(value: T[]): Promise<void> };

function createCollectionRepository<T extends { id: string }>(
  item: ListItem<T>,
): CollectionRepository<T> {
  return {
    list: () => item.getValue(),
    async getById(id) {
      return (await item.getValue()).find((x) => x.id === id) ?? null;
    },
    async add(entry) {
      await item.setValue([...(await item.getValue()), entry]);
    },
    async update(id, patch) {
      const all = await item.getValue();
      const index = all.findIndex((x) => x.id === id);
      if (index === -1) return null;
      const updated = { ...all[index], ...patch, id } as T;
      await item.setValue(all.map((x, i) => (i === index ? updated : x)));
      return updated;
    },
    async remove(id) {
      await item.setValue((await item.getValue()).filter((x) => x.id !== id));
    },
  };
}

export function createSnapshotRepository(): SnapshotRepository {
  return {
    async readAll() {
      const [settings, logs, swipes, drafts] = await Promise.all([
        settingsItem.getValue(),
        dailyLogsItem.getValue(),
        swipesItem.getValue(),
        draftsItem.getValue(),
      ]);
      return { settings, dailyLogs: Object.values(logs).sort(byDate), swipes, drafts };
    },
    async writeAll(data) {
      const logs = Object.fromEntries(data.dailyLogs.map((l) => [l.date, l]));
      await storage.setItems([
        { item: settingsItem, value: data.settings },
        { item: dailyLogsItem, value: logs },
        { item: swipesItem, value: data.swipes },
        { item: draftsItem, value: data.drafts },
      ]);
    },
  };
}

export function createRepositories(): Repositories {
  return {
    settings: createSettingsRepository(),
    dailyLogs: createDailyLogRepository(),
    swipes: createCollectionRepository(swipesItem),
    drafts: createCollectionRepository(draftsItem),
    snapshot: createSnapshotRepository(),
  };
}
