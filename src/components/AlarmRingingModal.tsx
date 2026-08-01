import React from 'react';
import { useTaskStore } from '../stores/taskStore';
import { Bell, CheckCircle2, Clock, XCircle, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AlarmRingingModal: React.FC = () => {
  const { ringingTaskId, tasks, settings, markTaskCompleted, snoozeTaskAlarm, dismissTaskAlarm } = useTaskStore();

  if (!ringingTaskId) return null;

  const task = tasks.find((t) => t.id === ringingTaskId);
  if (!task) return null;

  const snoozeMins = settings.snooze_duration_minutes || 5;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl text-center border border-emerald-100 dark:border-zinc-800 overflow-hidden relative"
        >
          {/* Animated Glowing Ring Backdrop */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0F6E56]/15 to-transparent pointer-events-none" />

          {/* Alarm Icon with Pulses */}
          <div className="relative my-4 flex justify-center items-center">
            <span className="absolute w-24 h-24 rounded-full bg-[#993C1D]/20 animate-ping" />
            <span className="absolute w-20 h-20 rounded-full bg-[#0F6E56]/20 animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-[#0F6E56] text-white flex items-center justify-center shadow-lg relative z-10">
              <Bell className="w-8 h-8 animate-bounce" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#993C1D] mb-1">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>Alarm Ringing</span>
          </div>

          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 leading-snug">
            {task.title}
          </h2>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Your scheduled session time has finished! What would you like to do?
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={() => markTaskCompleted(task.id)}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0F6E56] hover:bg-[#0c5945] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.98]"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Mark Done</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => snoozeTaskAlarm(task.id)}
                className="py-3 px-3 rounded-xl bg-[#E1F5EE] dark:bg-emerald-950/50 hover:bg-emerald-100 text-[#0F6E56] dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-200/60 transition-transform active:scale-[0.98]"
              >
                <Clock className="w-4 h-4" />
                <span>Snooze ({snoozeMins}m)</span>
              </button>

              <button
                onClick={() => dismissTaskAlarm(task.id)}
                className="py-3 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
              >
                <XCircle className="w-4 h-4 text-zinc-400" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
