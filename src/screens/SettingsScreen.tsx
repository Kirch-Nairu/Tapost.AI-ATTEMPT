import React, { useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { AlarmSound } from '../types/task';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import { Bell, Volume2, Clock, Moon, Sun, ShieldCheck, Database, RefreshCw, Trash2, Check } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, initializeStore } = useTaskStore();

  const [permState, setPermState] = useState(() => notificationService.getPermissionState());
  const [testNotifSent, setTestNotifSent] = useState(false);

  const handleRequestNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setPermState(notificationService.getPermissionState());
    if (granted) {
      notificationService.showNotification('Tapost Notifications Enabled!', {
        body: 'You will receive on-time alarm alerts when task sessions complete.',
      });
      setTestNotifSent(true);
      setTimeout(() => setTestNotifSent(false), 3000);
    }
  };

  const handleSendTestNotification = () => {
    notificationService.showNotification('Tapost Alarm Test', {
      body: 'This is how your session alarm notification will sound and vibrate.',
    });
    setTestNotifSent(true);
    setTimeout(() => setTestNotifSent(false), 3000);
  };

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-xs text-zinc-500">Configure alarms, notifications & theme</p>
      </div>

      {/* Alarm Sound Picker */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
          <Volume2 className="w-4 h-4 text-[#0F6E56]" />
          <span>Default Alarm Tone</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { id: 'teal_chime', name: 'Teal Chime', desc: 'Gentle dual-tone chime' },
            { id: 'zen_gong', name: 'Zen Gong', desc: 'Warm acoustic gong' },
            { id: 'digital_pulse', name: 'Digital Pulse', desc: 'Crisp 3-beep pulse' },
            { id: 'morning_breeze', name: 'Morning Breeze', desc: 'Serene melodic sweep' },
          ].map((tone) => (
            <div
              key={tone.id}
              onClick={() => updateSettings({ alarm_sound: tone.id as AlarmSound })}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                settings.alarm_sound === tone.id
                  ? 'bg-[#E1F5EE] dark:bg-emerald-950/60 border-[#0F6E56] shadow-xs'
                  : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{tone.name}</p>
                <p className="text-[10px] text-zinc-400">{tone.desc}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    audioService.playPreview(tone.id as AlarmSound, settings.sound_volume);
                  }}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-700 hover:bg-emerald-100 text-[#0F6E56] text-[10px] font-bold shadow-2xs"
                >
                  ▶ Test
                </button>
                {settings.alarm_sound === tone.id && (
                  <div className="w-4 h-4 rounded-full bg-[#0F6E56] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications Section */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
            <Bell className="w-4 h-4 text-[#0F6E56]" />
            <span>Local Notification Status</span>
          </div>

          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
              permState === 'granted'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {permState}
          </span>
        </div>

        <p className="text-xs text-zinc-500">
          Local notifications trigger the alarm alert when task session timers finish.
        </p>

        {permState !== 'granted' ? (
          <button
            onClick={handleRequestNotifications}
            className="w-full py-2.5 px-3 rounded-xl bg-[#0F6E56] hover:bg-[#0c5945] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Enable Notification Permission</span>
          </button>
        ) : (
          <button
            onClick={handleSendTestNotification}
            className="w-full py-2.5 px-3 rounded-xl bg-[#E1F5EE] dark:bg-emerald-950/50 hover:bg-emerald-100 text-[#0F6E56] dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-200/60"
          >
            <Bell className="w-4 h-4" />
            <span>{testNotifSent ? 'Test Alarm Triggered!' : 'Send Test Notification'}</span>
          </button>
        )}
      </div>

      {/* Session & Snooze Configuration */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-[#0F6E56]" />
          <span>Timer Preferences</span>
        </div>

        {/* Snooze Duration */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Snooze Duration</p>
            <p className="text-[10px] text-zinc-400">Time added when snoozing an alarm</p>
          </div>

          <select
            value={settings.snooze_duration_minutes}
            onChange={(e) => updateSettings({ snooze_duration_minutes: Number(e.target.value) })}
            className="px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value={3}>3 Minutes</option>
            <option value={5}>5 Minutes (Default)</option>
            <option value={10}>10 Minutes</option>
          </select>
        </div>

        {/* Default Session Length */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Default Focus Duration</p>
            <p className="text-[10px] text-zinc-400">Pre-filled length for new tasks</p>
          </div>

          <select
            value={settings.default_session_minutes}
            onChange={(e) => updateSettings({ default_session_minutes: Number(e.target.value) })}
            className="px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value={15}>15 Minutes</option>
            <option value={25}>25 Minutes (Pomodoro)</option>
            <option value={45}>45 Minutes</option>
            <option value={60}>60 Minutes</option>
          </select>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings.theme === 'dark' ? (
            <Moon className="w-4 h-4 text-amber-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <div>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">App Interface Theme</p>
            <p className="text-[10px] text-zinc-400">Switch between light & dark aesthetics</p>
          </div>
        </div>

        <button
          onClick={() => {
            const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
            updateSettings({ theme: nextTheme });
            if (nextTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }}
          className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold"
        >
          {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </button>
      </div>

      {/* Data Operations */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
          <Database className="w-4 h-4 text-[#0F6E56]" />
          <span>Database Operations</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={async () => {
              localStorage.removeItem('tapost_sqlite_tasks_v1');
              await initializeStore();
            }}
            className="py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={async () => {
              if (confirm('Clear all tasks from local SQLite storage?')) {
                localStorage.setItem('tapost_sqlite_tasks_v1', JSON.stringify([]));
                await initializeStore();
              }
            }}
            className="py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Tasks</span>
          </button>
        </div>
      </div>
    </div>
  );
};
