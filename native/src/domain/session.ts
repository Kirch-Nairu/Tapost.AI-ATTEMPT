import type { Task } from '../types/task';

export class ActiveSessionConflictError extends Error {
  constructor(activeTaskId: string) {
    super(`Tapost already has an active session: ${activeTaskId}`);
    this.name = 'ActiveSessionConflictError';
  }
}

export function getPlannedDurationMs(task: Pick<Task, 'reserved_start' | 'reserved_end'>): number {
  const start = new Date(task.reserved_start).getTime();
  const end = new Date(task.reserved_end).getTime();
  const duration = end - start;
  return Number.isFinite(duration) ? Math.max(60_000, duration) : 60_000;
}

export function assertSingleActiveSession(tasks: Task[], taskId: string): void {
  const active = tasks.find((task) => task.status === 'active' && task.id !== taskId);
  if (active) {
    throw new ActiveSessionConflictError(active.id);
  }
}

export function startSession(task: Task, nowMs: number): Task {
  const actualStart = new Date(nowMs).toISOString();
  const targetEnd = new Date(nowMs + getPlannedDurationMs(task)).toISOString();

  return {
    ...task,
    actual_start: actualStart,
    target_end: targetEnd,
    actual_end: null,
    status: 'active',
    updated_at: actualStart,
  };
}

export function completeSession(task: Task, nowMs: number): Task {
  const actualEnd = new Date(nowMs).toISOString();
  return {
    ...task,
    status: 'completed',
    actual_end: task.actual_start ? actualEnd : task.actual_end ?? null,
    updated_at: actualEnd,
  };
}

export function cancelSession(task: Task, nowMs: number): Task {
  const actualEnd = new Date(nowMs).toISOString();
  return {
    ...task,
    status: 'dismissed',
    actual_end: task.actual_start ? actualEnd : task.actual_end ?? null,
    updated_at: actualEnd,
  };
}

export function dismissSession(task: Task, nowMs: number): Task {
  return cancelSession(task, nowMs);
}

export function snoozeSession(task: Task, nowMs: number, snoozeMinutes: number): Task {
  const safeMinutes = Number.isFinite(snoozeMinutes) ? Math.max(1, snoozeMinutes) : 5;
  const updatedAt = new Date(nowMs).toISOString();
  const targetEnd = new Date(nowMs + safeMinutes * 60_000).toISOString();

  return {
    ...task,
    status: 'active',
    target_end: targetEnd,
    actual_end: null,
    snooze_count: (task.snooze_count ?? 0) + 1,
    updated_at: updatedAt,
  };
}

export function remainingSeconds(task: Pick<Task, 'target_end'>, nowMs: number): number {
  if (!task.target_end) return 0;
  const target = new Date(task.target_end).getTime();
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil((target - nowMs) / 1000));
}
