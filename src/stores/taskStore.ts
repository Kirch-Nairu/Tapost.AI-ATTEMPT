import { create } from 'zustand';
import { Task, TaskFormData, AppSettings, CompletionStats } from '../types/task';
import { taskRepository, DEFAULT_SETTINGS } from '../services/taskRepository';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';

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

  // Actions
  initializeStore: () => Promise<void>;
  setCurrentScreen: (screen: ScreenName, taskId?: string | null) => void;
  createTask: (data: TaskFormData) => Promise<Task>;
  startTaskSession: (taskId: string) => Promise<void>;
  markTaskCompleted: (taskId: string) => Promise<void>;
  snoozeTaskAlarm: (taskId: string) => Promise<void>;
  dismissTaskAlarm: (taskId: string) => Promise<void>;
  cancelActiveSession: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  checkAndMarkMissedTasks: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string) => void;
  getCompletionStats: () => CompletionStats;
}

let timerInterval: number | null = null;

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
      let loadedTasks = await taskRepository.getAllTasks();
      if (loadedTasks.length === 0) {
        loadedTasks = await taskRepository.seedDemoDataIfEmpty();
      }

      const settings = await taskRepository.getSettings();

      // Check for an active task session that might still be running
      const activeTask = loadedTasks.find((t) => t.status === 'active');
      let activeId = activeTask ? activeTask.id : null;
      let remaining = 0;

      if (activeTask && activeTask.actual_end) {
        const endMs = new Date(activeTask.actual_end).getTime();
        const diffSec = Math.ceil((endMs - Date.now()) / 1000);
        if (diffSec > 0) {
          remaining = diffSec;
        } else {
          // Alarm should fire!
          set({ ringingTaskId: activeTask.id });
          audioService.startRepeatingAlarm(activeTask.alarm_sound || settings.alarm_sound, settings.sound_volume);
          notificationService.startContinuousVibration();
          notificationService.showNotification(`Tapost Session Ended: ${activeTask.title}`, {
            body: 'Your scheduled focus session has completed! Tap to stop alarm.',
          });
        }
      }

      set({
        tasks: loadedTasks,
        settings,
        activeTaskId: activeId,
        activeRemainingSeconds: remaining,
        isLoading: false,
      });

      // Auto-check missed
      get().checkAndMarkMissedTasks();

      // Start tick background interval
      if (timerInterval !== null) clearInterval(timerInterval);
      timerInterval = window.setInterval(() => {
        const { activeTaskId, tasks, ringingTaskId, settings: currentSettings } = get();
        
        // Auto check missed tasks periodically
        get().checkAndMarkMissedTasks();

        if (activeTaskId && !ringingTaskId) {
          const currentActive = tasks.find((t) => t.id === activeTaskId && t.status === 'active');
          if (currentActive && currentActive.actual_end) {
            const endMs = new Date(currentActive.actual_end).getTime();
            const leftSec = Math.ceil((endMs - Date.now()) / 1000);

            if (leftSec <= 0) {
              // Timer ended -> Fire alarm!
              set({ activeRemainingSeconds: 0, ringingTaskId: currentActive.id });
              audioService.startRepeatingAlarm(
                currentActive.alarm_sound || currentSettings.alarm_sound,
                currentSettings.sound_volume
              );
              notificationService.startContinuousVibration();
              notificationService.showNotification(`Tapost Session Ended: ${currentActive.title}`, {
                body: 'Your scheduled focus session has completed! Tap to stop alarm.',
              });
            } else {
              set({ activeRemainingSeconds: leftSec });
            }
          }
        }
      }, 1000);
    } catch (e) {
      console.error('Error initializing store:', e);
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
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    // Duration = reserved_end - reserved_start
    const resStartMs = new Date(task.reserved_start).getTime();
    const resEndMs = new Date(task.reserved_end).getTime();
    const plannedDurationMs = Math.max(60000, resEndMs - resStartMs); // minimum 1 min fallback

    const actualEndMs = nowMs + plannedDurationMs;
    const actualEndIso = new Date(actualEndMs).toISOString();

    const updatedTask = await taskRepository.updateTask(taskId, {
      actual_start: nowIso,
      actual_end: actualEndIso,
      status: 'active',
    });

    if (updatedTask) {
      const updatedList = tasks.map((t) => (t.id === taskId ? updatedTask : t));
      const remainingSec = Math.ceil(plannedDurationMs / 1000);

      set({
        tasks: updatedList,
        activeTaskId: taskId,
        activeRemainingSeconds: remainingSec,
        currentScreen: 'active_session',
      });
    }
  },

  markTaskCompleted: async (taskId) => {
    audioService.stopAlarm();
    notificationService.stopVibration();
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updated = await taskRepository.updateTask(taskId, {
      status: 'completed',
      actual_end: task.actual_end || new Date().toISOString(),
    });

    if (updated) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
        ringingTaskId: state.ringingTaskId === taskId ? null : state.ringingTaskId,
        activeRemainingSeconds: state.activeTaskId === taskId ? 0 : state.activeRemainingSeconds,
      }));
    }
  },

  snoozeTaskAlarm: async (taskId) => {
    audioService.stopAlarm();
    notificationService.stopVibration();
    const { tasks, settings } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const snoozeMins = settings.snooze_duration_minutes || 5;
    const nowMs = Date.now();
    const newEndMs = nowMs + snoozeMins * 60 * 1000;
    const newEndIso = new Date(newEndMs).toISOString();
    const currentSnoozeCount = (task.snooze_count || 0) + 1;

    const updated = await taskRepository.updateTask(taskId, {
      actual_end: newEndIso,
      status: 'active',
      snooze_count: currentSnoozeCount,
    });

    if (updated) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        activeTaskId: taskId,
        ringingTaskId: null,
        activeRemainingSeconds: snoozeMins * 60,
      }));
    }
  },

  dismissTaskAlarm: async (taskId) => {
    audioService.stopAlarm();
    notificationService.stopVibration();
    const { tasks } = get();
    const updated = await taskRepository.updateTask(taskId, {
      status: 'dismissed',
    });

    if (updated) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
        ringingTaskId: state.ringingTaskId === taskId ? null : state.ringingTaskId,
        activeRemainingSeconds: state.activeTaskId === taskId ? 0 : state.activeRemainingSeconds,
      }));
    }
  },

  cancelActiveSession: async (taskId) => {
    audioService.stopAlarm();
    notificationService.stopVibration();
    const updated = await taskRepository.updateTask(taskId, {
      status: 'dismissed',
    });

    if (updated) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
        activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
        ringingTaskId: state.ringingTaskId === taskId ? null : state.ringingTaskId,
        activeRemainingSeconds: 0,
        currentScreen: 'home',
      }));
    }
  },

  deleteTask: async (taskId) => {
    const success = await taskRepository.deleteTask(taskId);
    if (success) {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
        activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
        selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
        currentScreen: state.selectedTaskId === taskId ? 'home' : state.currentScreen,
      }));
    }
  },

  updateSettings: async (newSettings) => {
    const updated = await taskRepository.saveSettings(newSettings);
    set({ settings: updated });
  },

  checkAndMarkMissedTasks: async () => {
    const { tasks } = get();
    const nowMs = Date.now();
    let changed = false;

    for (const task of tasks) {
      if (task.status === 'pending') {
        const reservedEndMs = new Date(task.reserved_end).getTime();
        if (reservedEndMs < nowMs) {
          await taskRepository.updateTask(task.id, { status: 'missed' });
          changed = true;
        }
      }
    }

    if (changed) {
      const refreshed = await taskRepository.getAllTasks();
      set({ tasks: refreshed });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  getCompletionStats: () => {
    const { tasks } = get();
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const missed = tasks.filter((t) => t.status === 'missed').length;
    const dismissed = tasks.filter((t) => t.status === 'dismissed').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Total focus minutes calculation
    let focusMinutes = 0;
    tasks.forEach((t) => {
      if (t.status === 'completed' && t.actual_start && t.actual_end) {
        const start = new Date(t.actual_start).getTime();
        const end = new Date(t.actual_end).getTime();
        const mins = Math.max(0, Math.round((end - start) / 60000));
        focusMinutes += mins;
      }
    });

    return {
      totalTasks: total,
      completedTasks: completed,
      missedTasks: missed,
      dismissedTasks: dismissed,
      completionRate,
      totalFocusMinutes: focusMinutes,
    };
  },
}));
