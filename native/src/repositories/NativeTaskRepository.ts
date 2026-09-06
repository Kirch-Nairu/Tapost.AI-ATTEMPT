import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { AppSettings, Task, TaskFormData } from '../types/task';
import type { TaskRepository } from './TaskRepository';

const DEFAULT_SETTINGS: AppSettings = {
  alarm_sound: 'teal_chime',
  snooze_duration_minutes: 5,
  notifications_enabled: true,
};

type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  reserved_start: string;
  reserved_end: string;
  actual_start: string | null;
  target_end: string | null;
  actual_end: string | null;
  status: Task['status'];
  alarm_sound: Task['alarm_sound'];
  snooze_count: number;
  created_at: string;
  updated_at: string;
};

function makeId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUuid) return randomUuid();
  return `tapost-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function rowToTask(row: TaskRow): Task {
  return {
    ...row,
    snooze_count: Number(row.snooze_count) || 0,
  };
}

export class NativeTaskRepository implements TaskRepository {
  private databasePromise: Promise<SQLiteDatabase> | null = null;

  private async database(): Promise<SQLiteDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = openDatabaseAsync('tapost.db');
    }
    return this.databasePromise;
  }

  async initialize(): Promise<void> {
    const db = await this.database();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        reserved_start TEXT NOT NULL,
        reserved_end TEXT NOT NULL,
        actual_start TEXT,
        target_end TEXT,
        actual_end TEXT,
        status TEXT NOT NULL,
        alarm_sound TEXT,
        snooze_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }

  async getAllTasks(): Promise<Task[]> {
    await this.initialize();
    const db = await this.database();
    const rows = await db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY created_at DESC');
    return rows.map(rowToTask);
  }

  async getTaskById(id: string): Promise<Task | null> {
    await this.initialize();
    const db = await this.database();
    const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', id);
    return row ? rowToTask(row) : null;
  }

  async createTask(data: TaskFormData): Promise<Task> {
    await this.initialize();
    const now = new Date().toISOString();
    const task: Task = {
      id: makeId(),
      title: data.title.trim(),
      notes: data.notes?.trim() || null,
      reserved_start: data.reserved_start,
      reserved_end: data.reserved_end,
      actual_start: null,
      target_end: null,
      actual_end: null,
      status: 'pending',
      alarm_sound: data.alarm_sound ?? DEFAULT_SETTINGS.alarm_sound,
      snooze_count: 0,
      created_at: now,
      updated_at: now,
    };
    return this.saveTask(task);
  }

  async saveTask(task: Task): Promise<Task> {
    await this.initialize();
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO tasks (
        id, title, notes, reserved_start, reserved_end, actual_start, target_end,
        actual_end, status, alarm_sound, snooze_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        notes = excluded.notes,
        reserved_start = excluded.reserved_start,
        reserved_end = excluded.reserved_end,
        actual_start = excluded.actual_start,
        target_end = excluded.target_end,
        actual_end = excluded.actual_end,
        status = excluded.status,
        alarm_sound = excluded.alarm_sound,
        snooze_count = excluded.snooze_count,
        updated_at = excluded.updated_at`,
      task.id,
      task.title,
      task.notes ?? null,
      task.reserved_start,
      task.reserved_end,
      task.actual_start ?? null,
      task.target_end ?? null,
      task.actual_end ?? null,
      task.status,
      task.alarm_sound ?? null,
      task.snooze_count ?? 0,
      task.created_at,
      task.updated_at,
    );
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.initialize();
    const db = await this.database();
    const result = await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
    return result.changes > 0;
  }

  async getSettings(): Promise<AppSettings> {
    await this.initialize();
    const db = await this.database();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'app');
    if (!row) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Partial<AppSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const next = { ...current, ...settings };
    const db = await this.database();
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      'app',
      JSON.stringify(next),
    );
    return next;
  }
}

export const nativeTaskRepository = new NativeTaskRepository();
