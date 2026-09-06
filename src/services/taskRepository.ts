import { Task, TaskFormData, AppSettings } from '../types/task';

const TASKS_STORAGE_KEY = 'tapost_tasks_v2';
const LEGACY_TASKS_STORAGE_KEY = 'tapost_sqlite_tasks_v1';
const SETTINGS_STORAGE_KEY = 'tapost_app_settings_v1';
const DEMO_SEEDED_KEY = 'tapost_demo_seeded_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  alarm_sound: 'teal_chime',
  snooze_duration_minutes: 5,
  default_session_minutes: 25,
  notifications_enabled: true,
  sound_volume: 0.8,
};

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class TaskRepository {
  private readRawTasks(): string | null {
    const current = localStorage.getItem(TASKS_STORAGE_KEY);
    if (current !== null) return current;

    const legacy = localStorage.getItem(LEGACY_TASKS_STORAGE_KEY);
    if (legacy !== null) {
      localStorage.setItem(TASKS_STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_TASKS_STORAGE_KEY);
      return legacy;
    }

    return null;
  }

  private getStorageTasks(): Task[] {
    try {
      const data = this.readRawTasks();
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to read tasks from local storage:', error);
      return [];
    }
  }

  private saveStorageTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Failed to save tasks to local storage:', error);
    }
  }

  async getAllTasks(): Promise<Task[]> {
    return this.getStorageTasks();
  }

  async getTaskById(id: string): Promise<Task | null> {
    const tasks = this.getStorageTasks();
    return tasks.find((task) => task.id === id) || null;
  }

  async createTask(formData: TaskFormData): Promise<Task> {
    const tasks = this.getStorageTasks();
    const now = new Date().toISOString();

    const newTask: Task = {
      id: generateUUID(),
      title: formData.title.trim(),
      notes: formData.notes?.trim() || null,
      reserved_start: formData.reserved_start,
      reserved_end: formData.reserved_end,
      actual_start: null,
      target_end: null,
      actual_end: null,
      status: 'pending',
      alarm_sound: formData.alarm_sound || 'teal_chime',
      snooze_count: 0,
      created_at: now,
      updated_at: now,
    };

    tasks.unshift(newTask);
    this.saveStorageTasks(tasks);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const tasks = this.getStorageTasks();
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return null;

    const updatedTask: Task = {
      ...tasks[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    tasks[index] = updatedTask;
    this.saveStorageTasks(tasks);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const tasks = this.getStorageTasks();
    const filtered = tasks.filter((task) => task.id !== id);
    if (filtered.length === tasks.length) return false;

    this.saveStorageTasks(filtered);
    return true;
  }

  async clearAllTasks(): Promise<void> {
    this.saveStorageTasks([]);
    localStorage.setItem(DEMO_SEEDED_KEY, 'true');
  }

  async resetDemoData(): Promise<Task[]> {
    this.saveStorageTasks([]);
    localStorage.removeItem(DEMO_SEEDED_KEY);
    return this.seedDemoDataIfEmpty();
  }

  async getSettings(): Promise<AppSettings> {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }

    return updated;
  }

  async seedDemoDataIfEmpty(): Promise<Task[]> {
    const existing = this.getStorageTasks();
    if (existing.length > 0) return existing;

    if (localStorage.getItem(DEMO_SEEDED_KEY) === 'true') {
      return [];
    }

    const now = new Date();
    const addMinutes = (date: Date, minutes: number) =>
      new Date(date.getTime() + minutes * 60 * 1000).toISOString();

    const demoTasks: Task[] = [
      {
        id: generateUUID(),
        title: 'Review Tapost Sprint Deliverables',
        notes: 'Check countdown timer, audio triggers, and local persistence.',
        reserved_start: addMinutes(now, 5),
        reserved_end: addMinutes(now, 30),
        actual_start: null,
        target_end: null,
        actual_end: null,
        status: 'pending',
        alarm_sound: 'teal_chime',
        snooze_count: 0,
        created_at: addMinutes(now, -60),
        updated_at: addMinutes(now, -60),
      },
      {
        id: generateUUID(),
        title: 'Focus Session: Clean Architecture Audit',
        notes: 'Ensure persistence and alarm behavior stay behind service boundaries.',
        reserved_start: addMinutes(now, 45),
        reserved_end: addMinutes(now, 75),
        actual_start: null,
        target_end: null,
        actual_end: null,
        status: 'pending',
        alarm_sound: 'zen_gong',
        snooze_count: 0,
        created_at: addMinutes(now, -30),
        updated_at: addMinutes(now, -30),
      },
      {
        id: generateUUID(),
        title: 'Morning Deep Work & Documentation',
        notes: 'Completed earlier today.',
        reserved_start: addMinutes(now, -180),
        reserved_end: addMinutes(now, -120),
        actual_start: addMinutes(now, -180),
        target_end: addMinutes(now, -120),
        actual_end: addMinutes(now, -120),
        status: 'completed',
        alarm_sound: 'digital_pulse',
        snooze_count: 0,
        created_at: addMinutes(now, -240),
        updated_at: addMinutes(now, -120),
      },
      {
        id: generateUUID(),
        title: 'Unstarted Early Review',
        notes: 'Expired without user starting.',
        reserved_start: addMinutes(now, -120),
        reserved_end: addMinutes(now, -90),
        actual_start: null,
        target_end: null,
        actual_end: null,
        status: 'missed',
        alarm_sound: 'morning_breeze',
        snooze_count: 0,
        created_at: addMinutes(now, -200),
        updated_at: addMinutes(now, -90),
      },
    ];

    this.saveStorageTasks(demoTasks);
    localStorage.setItem(DEMO_SEEDED_KEY, 'true');
    return demoTasks;
  }
}

export const taskRepository = new TaskRepository();
