import React from 'react';
import { Task } from '../types/task';
import { useTaskStore } from '../stores/taskStore';
import { Play, Check, Clock, AlertTriangle, XCircle, MoreVertical, Trash2, ArrowRight } from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const {
    startTaskSession,
    deleteTask,
    setCurrentScreen,
    activeTaskId,
    activeRemainingSeconds,
  } = useTaskStore();

  const [showMenu, setShowMenu] = React.useState(false);

  const formatTimeRange = () => {
    try {
      const start = parseISO(task.reserved_start);
      const end = parseISO(task.reserved_end);
      const durationMins = differenceInMinutes(end, start);
      return {
        startStr: format(start, 'h:mm a'),
        endStr: format(end, 'h:mm a'),
        durationStr: `${durationMins} min`,
      };
    } catch {
      return { startStr: '--', endStr: '--', durationStr: '--' };
    }
  };

  const { startStr, endStr, durationStr } = formatTimeRange();

  const formatCountdown = (secondsRemaining: number) => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isCurrentActive = activeTaskId === task.id;
  const anotherSessionActive = Boolean(activeTaskId && activeTaskId !== task.id);

  const startButtonClass = anotherSessionActive
    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
    : 'bg-[#0F6E56] hover:bg-[#0c5945] text-white shadow-sm active:scale-95';

  return (
    <div
      className={`relative rounded-2xl p-4 transition-all duration-200 border ${
        isCurrentActive
          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-[#0F6E56] shadow-md ring-2 ring-[#0F6E56]/20'
          : task.status === 'completed'
          ? 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 opacity-80'
          : task.status === 'missed'
          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0" onClick={() => setCurrentScreen('task_detail', task.id)}>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {task.status === 'pending' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E1F5EE] text-[#0F6E56]">
                <Clock className="w-3 h-3" />
                Reserved
              </span>
            )}

            {task.status === 'active' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#0F6E56] text-white animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                In Session
              </span>
            )}

            {task.status === 'completed' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                <Check className="w-3 h-3" />
                Done
              </span>
            )}

            {task.status === 'missed' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-[#993C1D] dark:text-rose-300">
                <AlertTriangle className="w-3 h-3" />
                Missed
              </span>
            )}

            {task.status === 'dismissed' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                <XCircle className="w-3 h-3" />
                Dismissed
              </span>
            )}

            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {startStr} – {endStr} ({durationStr})
            </span>
          </div>

          <h3
            className={`text-base font-semibold leading-snug cursor-pointer ${
              task.status === 'completed'
                ? 'line-through text-zinc-400 dark:text-zinc-500'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {task.title}
          </h3>

          {task.notes && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
              {task.notes}
            </p>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600"
            aria-label="Task actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-20 w-36 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 py-1 text-xs">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setCurrentScreen('task_detail', task.id);
                }}
                className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
              >
                View Details
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  void deleteTask(task.id);
                }}
                className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
        {task.status === 'pending' && (
          <>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {anotherSessionActive ? 'Finish the active session first' : 'Session ready'}
            </span>
            <button
              onClick={() => void startTaskSession(task.id)}
              disabled={anotherSessionActive}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${startButtonClass}`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{anotherSessionActive ? 'Session Running' : 'Start'}</span>
            </button>
          </>
        )}

        {task.status === 'active' && isCurrentActive && (
          <div className="w-full flex items-center justify-between bg-[#0F6E56]/10 dark:bg-emerald-950/60 p-2 rounded-xl border border-[#0F6E56]/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0F6E56] animate-ping" />
              <span className="font-mono font-bold text-sm text-[#0F6E56] dark:text-emerald-300">
                {formatCountdown(activeRemainingSeconds)}
              </span>
            </div>
            <button
              onClick={() => setCurrentScreen('active_session')}
              className="px-3 py-1.5 rounded-lg bg-[#0F6E56] text-white text-xs font-semibold flex items-center gap-1 shadow-sm hover:bg-[#0c5945]"
            >
              <span>View Timer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {task.status === 'completed' && (
          <div className="w-full flex items-center justify-between text-xs text-zinc-400">
            <span>Completed</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Done
            </span>
          </div>
        )}

        {(task.status === 'missed' || task.status === 'dismissed') && (
          <div className="w-full flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-400 capitalize">
              {anotherSessionActive ? 'Another session is active' : task.status}
            </span>
            <button
              onClick={() => void startTaskSession(task.id)}
              disabled={anotherSessionActive}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                anotherSessionActive
                  ? 'text-zinc-400 cursor-not-allowed'
                  : 'text-[#0F6E56] hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{anotherSessionActive ? 'Blocked' : 'Start Now'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
