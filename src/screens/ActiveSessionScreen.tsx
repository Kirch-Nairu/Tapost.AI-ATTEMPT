import React, { useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { ArrowLeft, Play, Pause, CheckCircle2, XCircle, Plus, Bell, Volume2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO, differenceInSeconds } from 'date-fns';

export const ActiveSessionScreen: React.FC = () => {
  const {
    activeTaskId,
    tasks,
    activeRemainingSeconds,
    setCurrentScreen,
    markTaskCompleted,
    cancelActiveSession,
  } = useTaskStore();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  if (!activeTask) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-zinc-500">No active task session running.</p>
        <button
          onClick={() => setCurrentScreen('home')}
          className="px-4 py-2 rounded-xl bg-[#0F6E56] text-white text-xs font-semibold"
        >
          Return to Tasks
        </button>
      </div>
    );
  }

  // Calculate total initial session duration in seconds
  let totalDurationSec = 25 * 60;
  if (activeTask.actual_start && activeTask.actual_end) {
    totalDurationSec = Math.max(
      60,
      differenceInSeconds(parseISO(activeTask.actual_end), parseISO(activeTask.actual_start))
    );
  }

  const elapsedSec = Math.max(0, totalDurationSec - activeRemainingSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSec / totalDurationSec) * 100));

  // Format MM:SS
  const minutes = Math.floor(activeRemainingSeconds / 60);
  const seconds = activeRemainingSeconds % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="min-h-[700px] flex flex-col justify-between p-6 bg-gradient-to-b from-[#0F6E56] via-emerald-900 to-zinc-950 text-white relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#993C1D]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between relative z-10">
        <button
          onClick={() => setCurrentScreen('home')}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Active Focus Session</span>
        </div>

        <div className="w-10" />
      </div>

      {/* Center Countdown Meter */}
      <div className="my-auto py-8 text-center flex flex-col items-center justify-center relative z-10">
        {/* Radial Progress Graphic */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="50%"
              cy="50%"
              r="42%"
              className="stroke-white/15"
              strokeWidth="10"
              fill="none"
            />
            {/* Animated Active Progress Circle */}
            <circle
              cx="50%"
              cy="50%"
              r="42%"
              className="stroke-emerald-400 transition-all duration-1000 ease-linear"
              strokeWidth="10"
              strokeDasharray={650}
              strokeDashoffset={650 - (650 * progressPercent) / 100}
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Time Display Inside Circle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tight drop-shadow-md">
              {timeStr}
            </span>
            <span className="text-xs text-emerald-200 mt-2 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{Math.round(progressPercent)}% Completed</span>
            </span>
          </div>
        </div>

        {/* Task Title & Info */}
        <div className="mt-8 max-w-xs space-y-1">
          <h1 className="text-xl font-bold line-clamp-2 leading-tight">{activeTask.title}</h1>
          {activeTask.notes && (
            <p className="text-xs text-emerald-100/70 line-clamp-2">{activeTask.notes}</p>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="space-y-3 relative z-10 pt-4">
        <button
          onClick={() => markTaskCompleted(activeTask.id)}
          className="w-full py-4 px-4 rounded-2xl bg-white text-[#0F6E56] font-bold text-sm shadow-xl hover:bg-emerald-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Complete Session Early</span>
        </button>

        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white/80 font-medium text-xs backdrop-blur-md transition-all flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel Session</span>
        </button>
      </div>

      {/* Cancel Confirm Dialog Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm text-zinc-900">
          <div className="bg-white dark:bg-zinc-900 dark:text-white rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4 border border-zinc-200 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-[#993C1D] mx-auto flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Cancel active session?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                This will stop the timer and mark the task as dismissed.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  cancelActiveSession(activeTask.id);
                }}
                className="w-full py-2.5 rounded-xl bg-[#993C1D] hover:bg-[#803117] text-white font-semibold text-xs shadow-sm"
              >
                Yes, Cancel Session
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs"
              >
                Keep Session Running
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
