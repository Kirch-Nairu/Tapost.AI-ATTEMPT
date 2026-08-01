import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTaskStore } from '../stores/taskStore';
import { AlarmSound } from '../types/task';
import { audioService } from '../services/audioService';
import { ArrowLeft, Clock, Bell, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { addMinutes, format, setMinutes, setSeconds, addHours } from 'date-fns';

// Zod Schema
const addTaskSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Task title is required')
      .max(100, 'Title must be 100 characters or less'),
    reserved_start: z.string().min(1, 'Start time is required'),
    reserved_end: z.string().min(1, 'End time is required'),
    notes: z.string().optional(),
    alarm_sound: z.enum(['teal_chime', 'zen_gong', 'digital_pulse', 'morning_breeze'] as const),
  })
  .refine(
    (data) => {
      const start = new Date(data.reserved_start).getTime();
      const end = new Date(data.reserved_end).getTime();
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['reserved_end'],
    }
  );

type AddTaskInputs = z.infer<typeof addTaskSchema>;

// Helper to compute next rounded 15-min increment
function getNext15MinIncrement(date: Date = new Date()): Date {
  const mins = date.getMinutes();
  const remainder = 15 - (mins % 15);
  const rounded = addMinutes(setSeconds(date, 0), remainder);
  return rounded;
}

// Convert Date object to datetime-local input string format (YYYY-MM-DDTHH:mm)
function toDatetimeLocalString(date: Date): string {
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - tzOffsetMs);
  return localDate.toISOString().slice(0, 16);
}

export const AddTaskScreen: React.FC = () => {
  const { createTask, setCurrentScreen, settings } = useTaskStore();

  const defaultStart = getNext15MinIncrement();
  const defaultEnd = addMinutes(defaultStart, 25);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddTaskInputs>({
    resolver: zodResolver(addTaskSchema),
    defaultValues: {
      title: '',
      reserved_start: toDatetimeLocalString(defaultStart),
      reserved_end: toDatetimeLocalString(defaultEnd),
      notes: '',
      alarm_sound: settings.alarm_sound || 'teal_chime',
    },
  });

  const selectedStart = watch('reserved_start');
  const selectedSound = watch('alarm_sound');

  // Quick preset helper
  const applyPresetMinutes = (durationMins: number) => {
    try {
      const start = selectedStart ? new Date(selectedStart) : new Date();
      const end = addMinutes(start, durationMins);
      setValue('reserved_end', toDatetimeLocalString(end), { shouldValidate: true });
    } catch {
      // ignore date parse errors
    }
  };

  const onSubmit = async (data: AddTaskInputs) => {
    await createTask({
      title: data.title,
      reserved_start: new Date(data.reserved_start).toISOString(),
      reserved_end: new Date(data.reserved_end).toISOString(),
      notes: data.notes,
      alarm_sound: data.alarm_sound as AlarmSound,
    });
    setCurrentScreen('home');
  };

  return (
    <div className="p-4 space-y-5">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => setCurrentScreen('home')}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Schedule Task Session</h1>
          <p className="text-xs text-zinc-500">Set task time and built-in alarm</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title Field */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            {...register('title')}
            placeholder="e.g., Review Sprint Deliverables"
            className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border text-zinc-900 dark:text-zinc-100 focus:outline-none transition-all ${
              errors.title
                ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                : 'border-zinc-200 dark:border-zinc-700 focus:border-[#0F6E56]'
            }`}
          />
          {errors.title && (
            <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.title.message}</span>
            </p>
          )}
        </div>

        {/* Quick Presets */}
        <div>
          <span className="block text-[11px] font-medium text-zinc-500 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#0F6E56]" />
            Quick Duration Presets
          </span>
          <div className="flex items-center gap-2">
            {[
              { label: '15m Sprint', mins: 15 },
              { label: '25m Pomodoro', mins: 25 },
              { label: '45m Deep Work', mins: 45 },
            ].map((preset) => (
              <button
                key={preset.mins}
                type="button"
                onClick={() => applyPresetMinutes(preset.mins)}
                className="py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#0F6E56] dark:text-emerald-300 border border-emerald-200/50 text-[11px] font-medium transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Time & End Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#0F6E56]" />
              Start Time
            </label>
            <input
              type="datetime-local"
              {...register('reserved_start')}
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-[#0F6E56] focus:outline-none"
            />
            {errors.reserved_start && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.reserved_start.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-[#0F6E56]" />
              End / Alarm Time
            </label>
            <input
              type="datetime-local"
              {...register('reserved_end')}
              className={`w-full px-3 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border text-zinc-900 dark:text-zinc-100 focus:outline-none ${
                errors.reserved_end
                  ? 'border-rose-500'
                  : 'border-zinc-200 dark:border-zinc-700 focus:border-[#0F6E56]'
              }`}
            />
            {errors.reserved_end && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.reserved_end.message}</span>
              </p>
            )}
          </div>
        </div>

        {/* Alarm Sound Picker */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-[#0F6E56]" />
            Session Alarm Tone
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'teal_chime', name: 'Teal Chime', desc: 'Soothing dual-bell' },
              { id: 'zen_gong', name: 'Zen Gong', desc: 'Resonant acoustic gong' },
              { id: 'digital_pulse', name: 'Digital Pulse', desc: 'Clear 3-beep pattern' },
              { id: 'morning_breeze', name: 'Morning Breeze', desc: 'Melodic sweep' },
            ].map((tone) => (
              <div
                key={tone.id}
                onClick={() => setValue('alarm_sound', tone.id as AlarmSound)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedSound === tone.id
                    ? 'bg-[#E1F5EE] dark:bg-emerald-950/60 border-[#0F6E56] shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{tone.name}</p>
                  <p className="text-[10px] text-zinc-400">{tone.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    audioService.playPreview(tone.id as AlarmSound, settings.sound_volume);
                  }}
                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-700 hover:bg-emerald-100 text-[#0F6E56] shadow-2xs text-[10px] font-bold"
                  title="Test Sound"
                >
                  ▶
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes Field */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Notes / Objectives (Optional)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Add key goals or checklists for this focus session..."
            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-[#0F6E56] focus:outline-none resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#0F6E56] hover:bg-[#0c5945] text-white font-semibold text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <span>Create Reserved Task</span>
          </button>
        </div>
      </form>
    </div>
  );
};
