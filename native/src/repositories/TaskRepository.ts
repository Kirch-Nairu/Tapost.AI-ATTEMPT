import type { AppSettings, Task, TaskFormData } from '../types/task';

export interface TaskRepository {
  initialize(): Promise<void>;
  getAllTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  createTask(data: TaskFormData): Promise<Task>;
  saveTask(task: Task): Promise<Task>;
  deleteTask(id: string): Promise<boolean>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
}
