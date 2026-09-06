import React from 'react';
import { useTaskStore } from '../stores/taskStore';
import { ArrowLeft, Play, Trash2, Clock, Bell, AlignLeft } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';

export const TaskDetailScreen: React.FC = () => {
  const {
    selectedTaskId,
    tasks,
    activeTaskId,
    setCurrentScreen,
    startTaskSession,
    deleteTask,
  } = useTaskStore();

  const task = tasks.find((candidate) => candidate.id === selectedTaskId);

  if (!task) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-zinc-500">Task not found.</p>
        <button
          onClick={() => setCurrentScreen('home')}
          className="px-4 py-2 rounded-xl bg-[#0F6E56] text-white text-xs font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const anotherSessionActive = Boolean(activeTaskId && activeTaskId !== task.id);

  const formatIsoSafe = (isoString?: string | null) => {
    if (!isoString) return '--';
    try {
      return format(parseISO(isoString), 'PPP p');
    } catch {
      return isoString;
    }
  };

  const getDurationSafe = () => {
    try {
      const start = parseISO(task.reserved_start);
      const end = parseISO(task.reserved_end);
      return `${differenceInMinutes(end, start)} minutes`;
    } catch {
      return '--';
    }
  };

  const startActionClass = anotherSessionActive
    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
    : 'bg-[#0F6E56] hover:bg-[#0c5945] text-white shadow-md';

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCurrentScreen('home')}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
          aria-label="Back to tasks"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Task Details
        </span>

        <button
          onClick={() => void deleteTask(task.id)}
          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors"
          title="Delete Task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              task.status === 'pending'
                ? 'bg-[#E1F5EE] text-[#0F6E56]'
                : task.status === 'active'
                ? 'bg-[#0F6E56] text-white animate-pulse'
                : task.status === 'completed'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950 text-[#993C1D] dark:text-rose-300'
            }`}
          >
            {task.status}
          </span>
        </div>

        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
          {task.title}
        </h1>

        {task.notes && (
          <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-700/80">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 mb-1">
              <AlignLeft className="w-3.5 h-3.5" />
              Notes
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
              {task.notes}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Schedule Specs
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#0F6E56]" />
              Reserved Start
            </span>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {formatIsoSafe(task.reserved_start)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-[#0F6E56]" />
              Reserved End
            </span>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {formatIsoSafe(task.reserved_end)}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-medium">Planned Focus Length</span>
          <span className="text-xs font-bold text-[#0F6E56] dark:text-emerald-400 font-mono">
            {getDurationSafe()}
          </span>
        </div>

        {task.actual_start && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 space-y-1.5">
            <span className="text-[11px] font-bold text-[#0F6E56] uppercase tracking-wider">
              Actual Execution
            </span>
            <div className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
              <p>Started: {formatIsoSafe(task.actual_start)}</p>
              {task.target_end && <p>Target end: {formatIsoSafe(task.target_end)}</p>}
              {task.actual_end && <p>Ended: {formatIsoSafe(task.actual_end)}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 space-y-2">
        {anotherSessionActive && (task.status === 'pending' || task.status === 'missed' || task.status === 'dismissed') && (
          <p className="text-xs text-center text-amber-600 dark:text-amber-400">
            Finish or cancel the current active session before starting this task.
          </p>
        )}

        {task.status === 'pending' && (
          <button
            onClick={() => void startTaskSession(task.id)}
            disabled={anotherSessionActive}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${startActionClass}`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{anotherSessionActive ? 'Another Session Is Active' : 'Start Session Now'}</span>
          </button>
        )}

        {task.status === 'active' && (
          <button
            onClick={() => setCurrentScreen('active_session')}
            className="w-full py-3.5 px-4 rounded-xl bg-[#0F6E56] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <span>Open Active Focus Screen</span>
          </button>
        )}

        {(task.status === 'missed' || task.status === 'dismissed') && (
          <button
            onClick={() => void startTaskSession(task.id)}
            disabled={anotherSessionActive}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${startActionClass}`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{anotherSessionActive ? 'Another Session Is Active' : 'Restart Session'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
