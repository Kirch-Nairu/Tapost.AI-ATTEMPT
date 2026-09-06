import {
  assertSingleActiveSession,
  cancelSession,
  completeSession,
  dismissSession,
  snoozeSession,
  startSession,
} from '../domain/session';
import type { TaskRepository } from '../repositories/TaskRepository';
import type { AlarmEngine } from '../services/alarm/AlarmEngine';
import type { Task } from '../types/task';

export type RecoveryState = {
  tasks: Task[];
  activeTask: Task | null;
  alarmDue: boolean;
};

export class SessionController {
  constructor(
    private readonly repository: TaskRepository,
    private readonly alarmEngine: AlarmEngine,
  ) {}

  async initialize(): Promise<RecoveryState> {
    await this.repository.initialize();
    await this.alarmEngine.ensureReady();
    const tasks = await this.repository.getAllTasks();
    const activeTasks = tasks
      .filter((task) => task.status === 'active')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    if (activeTasks.length > 1) {
      const [keeper, ...stale] = activeTasks;
      for (const task of stale) {
        await this.alarmEngine.cancel(task.id);
        await this.repository.saveTask(dismissSession(task, Date.now()));
      }
      const refreshed = await this.repository.getAllTasks();
      return this.recoverActive(refreshed, keeper?.id ?? null);
    }

    return this.recoverActive(tasks, activeTasks[0]?.id ?? null);
  }

  private async recoverActive(tasks: Task[], preferredId: string | null): Promise<RecoveryState> {
    const activeTask = (preferredId
      ? tasks.find((task) => task.id === preferredId && task.status === 'active')
      : tasks.find((task) => task.status === 'active')) ?? null;

    if (!activeTask?.target_end) {
      return { tasks, activeTask, alarmDue: false };
    }

    const targetEndMs = new Date(activeTask.target_end).getTime();
    const alarmDue = Number.isFinite(targetEndMs) && targetEndMs <= Date.now();
    const nativeRecord = this.alarmEngine.getScheduledAlarm();

    if (
      Number.isFinite(targetEndMs) &&
      (nativeRecord?.taskId !== activeTask.id || nativeRecord.targetEndMs !== targetEndMs)
    ) {
      await this.alarmEngine.schedule(activeTask);
    }

    return { tasks, activeTask, alarmDue };
  }

  async start(taskId: string): Promise<Task> {
    const tasks = await this.repository.getAllTasks();
    assertSingleActiveSession(tasks, taskId);
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.status === 'active') return task;

    const started = startSession(task, Date.now());
    await this.repository.saveTask(started);
    try {
      await this.alarmEngine.schedule(started);
      return started;
    } catch (error) {
      await this.repository.saveTask(task);
      throw error;
    }
  }

  async complete(task: Task): Promise<Task> {
    await this.alarmEngine.cancel(task.id);
    return this.repository.saveTask(completeSession(task, Date.now()));
  }

  async cancel(task: Task): Promise<Task> {
    await this.alarmEngine.cancel(task.id);
    return this.repository.saveTask(cancelSession(task, Date.now()));
  }

  async dismiss(task: Task): Promise<Task> {
    await this.alarmEngine.cancel(task.id);
    return this.repository.saveTask(dismissSession(task, Date.now()));
  }

  async snooze(task: Task, minutes: number): Promise<Task> {
    await this.alarmEngine.stopPresentation(task.id);
    const snoozed = snoozeSession(task, Date.now(), minutes);
    await this.repository.saveTask(snoozed);
    await this.alarmEngine.schedule(snoozed);
    return snoozed;
  }
}
