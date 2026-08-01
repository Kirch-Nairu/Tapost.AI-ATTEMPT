import React from 'react';
import { useTaskStore } from '../stores/taskStore';
import { Bell, CheckCircle2, Clock, Square, Volume2, Sparkles, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AlarmRingingModal: React.FC = () => {
  const { ringingTaskId, tasks, settings, markTaskCompleted, snoozeTaskAlarm, dismissTaskAlarm } = useTaskStore();

  if (!ringingTaskId) return null;

  const task = tasks.find((t) => t.id === ringingTaskId);
  if (!task) return null;

  const snoozeMins = settings.snooze_duration_minutes || 5;
  const soundName = (task.alarm_sound || settings.alarm_sound || 'teal_chime')
    .replace('_', ' ')
    .toUpperCase();

  const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 bg-zinc-950 text-white overflow-hidden select-none">
        {/* Animated Background Glowing Rings */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#0F6E56]/20 animate-ping duration-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#993C1D]/25 animate-pulse" />
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#0F6E56]/30 to-transparent" />
        </div>

        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-300 backdrop-blur-md">
            <Volume2 className="w-4 h-4 animate-bounce text-emerald-400" />
            <span>ALARM RINGING • {soundName}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>High Priority Alert</span>
          </div>
        </div>

        {/* Center Content Area */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative z-10 my-auto text-center max-w-md mx-auto space-y-6"
        >
          {/* Animated Alarm Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-[#0F6E56] text-white flex items-center justify-center shadow-2xl shadow-emerald-900/50 relative z-10">
              <Bell className="w-12 h-12 animate-bounce" />
            </div>
          </div>

          {/* Time & Task Header */}
          <div className="space-y-2">
            <p className="text-4xl font-extrabold tracking-tight text-white">{currentTimeStr}</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#993C1D]/20 border border-[#993C1D]/40 text-[#ff8059] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Session Completed</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 leading-snug pt-1">
              {task.title}
            </h1>
            {task.notes && (
              <p className="text-sm text-zinc-400 line-clamp-2 max-w-xs mx-auto">
                {task.notes}
              </p>
            )}
          </div>
        </motion.div>

        {/* Bottom Massive Action Buttons */}
        <div className="relative z-10 max-w-md mx-auto w-full space-y-3 pb-4">
          {/* Mark Done Primary Button */}
          <button
            onClick={() => markTaskCompleted(task.id)}
            className="w-full py-4 px-6 rounded-2xl bg-[#0F6E56] hover:bg-[#0c5945] active:scale-[0.98] text-white font-bold text-base flex items-center justify-center gap-3 shadow-xl shadow-emerald-950 transition-all border border-emerald-400/30 cursor-pointer"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>Mark Completed & Stop Alarm</span>
          </button>

          {/* Secondary Buttons Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Snooze Button */}
            <button
              onClick={() => snoozeTaskAlarm(task.id)}
              className="py-3.5 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 active:scale-[0.98] text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-800/60 transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Snooze +{snoozeMins}m</span>
            </button>

            {/* Stop / Dismiss Button */}
            <button
              onClick={() => dismissTaskAlarm(task.id)}
              className="py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 font-bold text-xs flex items-center justify-center gap-2 border border-zinc-800 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>Stop & Dismiss</span>
            </button>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};

