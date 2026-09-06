import { create } from 'zustand';
import { Task, TaskFormData, AppSettings, CompletionStats } from '../types/task';
import { taskRepository, DEFAULT_SETTINGS } from '../services/taskRepository';
import { alarmEngine } from '../services/alarm';

type ScreenName = 'home' | 'add_task' | 'history' | 'settings' | 'task_detail' | 'active_session';

interface TaskStoreState {
  tasks: Task[];
  settings: AppSettings;
  isLoading: boolean;
  currentScreen: ScreenName;
  selectedTaskId: string | null;
  activeTaskId: string | null;
  ringingTaskId: string | null;
  activeRemainingSeconds: number;
  searchQuery: string;
  filterStatus: string;

  initializeStore: () => Promise<void>;
  setCurrentScreen: (screen: ScreenName, taskId?: string | null) => void;
  createTask: (data: TaskFormData) => Promise<Task>;
  startTaskSession: (taskId: string) => Promise<void>;
  markTaskCompleted: (taskId: string) => Promise<void>;
  snoozeTaskAlarm: (taskId: string) => Promise<void>;
  dismissTaskAlarm: (taskId: string) => Promise<void>;
  cancelActiveSession: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  clearAllTasks: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  checkAndMarkMissedTasks: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string) => void;
  getCompletionStats: () => CompletionStats;
}

let timerInterval: number | null = null;
let missedSweepInterval: number | null = null;
let missedSweepRunning = false;

function clearRuntimeIntervals(): void {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (missedSweepInterval !== null) {
    clearInterval(missedSweepInterval);
    missedSweepInterval = null;
  }
}

function getTaskSortTime(task: Task): number {
  const value = task.actual_start || task.updated_at || task.created_at;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getTargetEndMs(task: Task): number | null {
  const value = task.target_end || (task.status === 'active' ? task.actual_end : null);
  if (!value) return null;

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getEffectiveFinishIso(task: Task, nowMs = Date.now()): string {
  const targetEndMs = getTargetEndMs(task);
  const finishMs = targetEndMs !== null && targetEndMs <= nowMs ? targetEndMs : nowMs;
  return new Date(finishMs).toISOString();
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  currentScreen: 'home',
  selectedTaskId: null,
  activeTaskId: null,
  ringingTaskId: null,
  activeRemainingSeconds: 0,
  searchQuery: '',
  filterStatus: 'all',

  initializeStore: async () => {
    set({ isLoading: true });

    try {
      alarmEngine.stop();
      clearRuntimeIntervals();

      let loadedTasks = await taskRepository.getAllTasks();
      if (loadedTasks.length === 0) {
        loadedTasks = await taskRepository.seedDemoDataIfEmpty();
      }

      const settings = await taskRepository.getSettings();

      // Migrate legacy active records where actual_end was used as the timer deadline.
      let migratedLegacyActive = false;
      for (const task of loadedTasks) {
        if (task.status === 'active' && !task.target_end && task.actual_end) {
          await taskRepository.updateTask(task.id, {
            target_end: task.actual_end,
            actual_end: null,
          });
          migratedLegacyActive = true;
        }
      }

      if (migratedLegacyActive) {
        loadedTasks = await taskRepository.getAllTasks();
      }

      const activeTasks = loadedTasks
        .filter((task) => task.status === 'active')
        .sort((a, b) => getTaskSortTime(b) - getTaskSortTime(a));

      if (activeTasks.length > 1) {
        const nowMs = Date.now();
        for (const staleTask of activeTasks.slice(1)) {
          await taskRepository.updateTask(staleTask.id, {
            status: 'dismissed',
            actual_end: staleTask.actual_start ? getEffectiveFinishIso(staleTask, nowMs) : staleTask.actual_end,
          });
        }
        loadedTasks = await taskRepository.getAllTasks();
      }

      const activeTask = loadedTasks
        .filter((task) => task.status === 'active')
        .sort((a, b) => getTaskSortTime(b) - getTaskSortTime(a))[0];

      const activeId = activeTask?.id || null;
      let remaining = 0;
      let ringingTaskId: string | null = null;

      if (activeTask) {
        const targetEndMs = getTargetEndMs(activeTask);
        if (targetEndMs !== null) {
          const diffSec = Math.ceil((targetEndMs - Date.now()) / 1000);
          if (diffSec > 0) {
            remaining = diffSec;
          } else {
            ringingTaskId = activeTask.id;
            alarmEngine.start(activeTask, settings);
          }
        }
      }

      set({
        tasks: loadedTasks,
        settings,
        activeTaskId: activeId,
        ringingTaskId,
        activeRemainingSeconds: remaining,
        isLoading: false,
      });

      await get().checkAndMarkMissedTasks();

      timerInterval = window.setInterval(() => {
        const state = get();
        if (!state.activeTaskId || state.ringingTaskId) return;

        const currentActive = state.tasks.find(
          (task) => task.id === state.activeTaskId && task.status === 'active',
        );
        if (!currentActive) return;

        const targetEndMs = getTargetEndMs(currentActive);
        if (targetEndMs === null) return;

        const leftSec = Math.ceil((targetEndMs - Date.now()) / 1000);
        if (leftSec <= 0) {
          set({ activeRemainingSeconds: 0, ringingTaskId: currentActive.id });
          alarmEngine.start(currentActive, state.settings);
          return;
        }

        set({ activeRemainingSeconds: leftSec });
      }, 1000);

      missedSweepInterval = window.setInterval(() => {
        void get().checkAndMarkMissedTasks();
      }, 30_000);
    } catch (error) {
      console.error('Error initializing store:', error);
      set({ isLoading: false });
    }
  },

  setCurrentScreen: (screen, taskId = null) => {
    set({ currentScreen: screen, selectedTaskId: taskId });
  },

  createTask: async (formData) => {
    const newTask = await taskRepository.createTask(formData);
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    return newTask;
  },

  startTaskSession: async (taskId) => {
    const { tasks, activeTaskId } = get();
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const existingActive = tasks.find(
      (candidate) => candidate.status === 'active' && candidate.id !== taskId,
    );

    if (existingActive || (activeTaskId && activeTaskId !== taskId)) {
      console.warn('Tapost allows only one active task session at a time.');
      return;
    }

    if (task.status === 'active') {
      set({ activeTaskId: task.id, currentScreen: 'active_session' });
      return;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const reservedStartMs = new Date(task.reserved_start).getTime();
    const reservedEndMs = new Date(task.reserved_end).getTime();
    const rawPlannedDurationMs = reservedEndMs - reservedStartMs;
    const plannedDurationMs = Number.isFinite(rawPlannedDurationMs)
      ? Math.max(60_000, rawPlannedDurationMs)
      : 60_000;

    const targetEndIso = new Date(nowMs + plannedDurationMs).toISOString();
    const updatedTask = await taskRepository.updateTask(taskId, {
      actual_start: nowIso,
      target_end: targetEndIso,
      actual_end: null,
      status: 'active',
    });

    if (!updatedTask) return;

    set((state) => ({
      tasks: state.tasks.map((candidate) =>
        candidate.id === taskId ? updatedTask : candidate,
      ),
      activeTaskId: taskId,
      ringingTaskId: null,
      activeRemainingSeconds: Math.ceil(plannedDurationMs / 1000),
      currentScreen: 'active_session',
    }));
  },

  markTaskCompleted: async (taskId) => {
    const { tasks, activeTaskId, ringingTaskId } = get();
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;

    if (activeTaskId === taskId || ringingTaskId === taskId) {
      alarmEngine.stop();
    }

    const updated = await taskRepository.updateTask(taskId, {
      status: 'completed',
      actual_end: task.actual_start ? getEffectiveFinishIso(task) : task.actual_end,
    });

    if (!updated) return;

    set((state) => ({
      tasks: state.tasks.map((candidate) =>
        candidate.id === taskId ? updated : candidate,
      ),
      activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
      ringingTaskId: state.ringingTaskId === taskId ? null : state.ringingTaskId,
      activeRemainingSeconds: state.activeTaskId === taskId ? 0 : state.activeRemainingSeconds,
    }));
  },

  snoozeTaskAlarm: async (taskId) => {
    const { tasks, settings, ringingTaskId } = get();
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || ringingTaskId !== taskId) return;

    alarmEngine.stop();

    const snoozeMinutes = settings.snooze_duration_minutes || 5;
    const targetEndIso = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();
    const updated = await taskRepository.updateTask(taskId, {
      target_end: targetEndIso,
      actual_end: null,
      status: 'active',
      snooze_count: (task.snooze_count || 0) + 1,
    });

    if (!updated) return;

    set((state) => ({
      tasks: state.tasks.map((candidate) =>
        candidate.id === taskId ? updated : candidate,
      ),
      activeTaskId: taskId,
      ringingTaskId: null,
      activeRemainingSeconds: snoozeMinutes * 60,
    }));
  },

  dismissTaskAlarm: async (taskId) => {
    const { tasks, ringingTaskId } = get();
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;

    if (ringingTaskId === taskId) {
      alarmEngine.stop();
    }

    const updated = await taskRepository.updateTask(taskId, {
      status: 'dismissed',
      actual_end: task.actual_start ? getEffectiveFinishIso(task) : task.actual_end,
    });

    if (!updated) return;

    set((state) => ({
      tasks: state.tasks.map((candidate) =>
        candidate.id === taskId ? updated : candidate,
      ),
      activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
      ringingTaskId: state.ringingTaskId === taskId ? null : state.ringingTaskId,
      activeRemainingSeconds: state.activeTaskId === taskId ? 0 : state.activeRemainingSeconds,
    }));
  },

  cancelActiveSession: async (taskId) => {
    const { tasks, activeTaskId, ringingTaskId } = get();
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;

    if (activeTaskId === taskId || ringingTaskId === taskId) {
      alarmEngine.stop();
    }

    const updated = await taskRepository.updateTask(taskId, {
      status: 'dismissed',
      actual_end: task.actual_start ? new Date().toISOString() : task.actual_end,
    });

    if (!updated) return;

    set((state) => ({
      tasks: state.tasks.map((candidate) =>
        candidate.id === taskId ? updated : candidate,
      ),
      activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
      ringingTaskId: state.ringingTaskId === taskId ? null : state.ringingTaskId,
      activeRemainingSeconds: 0,
      currentScreen: 'home',
    }));
  },

  deleteTask: async (taskId) => {
    const { activeTaskId, ringingTaskId } = get();
    if (activeTaskId === taskId || ringingTaskId === taskId) {
      alarmEngine.stop();
    }

    const success = await taskRepository.deleteTask(taskId);
    if (!success) return;

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
      activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
      ringingTaskId: state.ringingTaskId === taskId ? null : state.ringingTaskId,
      activeRemainingSeconds: state.activeTaskId === taskId ? 0 : state.activeRemainingSeconds,
      selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
      currentScreen: state.selectedTaskId === taskId ? 'home' : state.currentScreen,
    }));
  },

  clearAllTasks: async () => {
    alarmEngine.stop();
    await taskRepository.clearAllTasks();
    set({
      tasks: [],
      activeTaskId: null,
      ringingTaskId: null,
      activeRemainingSeconds: 0,
      selectedTaskId: null,
      currentScreen: 'home',
    });
  },

  resetDemoData: async () => {
    alarmEngine.stop();
    const tasks = await taskRepository.resetDemoData();
    set({
      tasks,
      activeTaskId: null,
      ringingTaskId: null,
      activeRemainingSeconds: 0,
      selectedTaskId: null,
      currentScreen: 'home',
    });
  },

  updateSettings: async (newSettings) => {
    const updated = await taskRepository.saveSettings(newSettings);
    set({ settings: updated });
  },

  checkAndMarkMissedTasks: async () => {
    if (missedSweepRunning) return;
    missedSweepRunning = true;

    try {
      const { tasks } = get();
      const nowMs = Date.now();
      const expiredPending = tasks.filter((task) => {
        if (task.status !== 'pending') return false;
        const reservedEndMs = new Date(task.reserved_end).getTime();
        return Number.isFinite(reservedEndMs) && reservedEndMs < nowMs;
      });

      if (expiredPending.length === 0) return;

      await Promise.all(
        expiredPending.map((task) =>
          taskRepository.updateTask(task.id, { status: 'missed' }),
        ),
      );

      const refreshed = await taskRepository.getAllTasks();
      set({ tasks: refreshed });
    } finally {
      missedSweepRunning = false;
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  getCompletionStats: () => {
    const { tasks } = get();
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const missed = tasks.filter((task) => task.status === 'missed').length;
    const dismissed = tasks.filter((task) => task.status === 'dismissed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const totalFocusMinutes = tasks.reduce((sum, task) => {
      if (task.status !== 'completed' || !task.actual_start || !task.actual_end) {
        return sum;
      }

      const start = new Date(task.actual_start).getTime();
      const end = new Date(task.actual_end).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) return sum;

      return sum + Math.max(0, Math.round((end - start) / 60_000));
    }, 0);

    return {
      totalTasks: total,
      completedTasks: completed,
      missedTasks: missed,
      dismissedTasks: dismissed,
      completionRate,
      totalFocusMinutes,
    };
  },
}));
