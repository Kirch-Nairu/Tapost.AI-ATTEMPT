export type TaskStatus = 'pending' | 'active' | 'completed' | 'missed' | 'dismissed';

export type AlarmSound = 'teal_chime' | 'zen_gong' | 'digital_pulse' | 'morning_breeze';

export interface Task {
  id: string;
  title: string;
  notes?: string | null;
  reserved_start: string;
  reserved_end: string;
  actual_start?: string | null;
  target_end?: string | null;
  actual_end?: string | null;
  status: TaskStatus;
  alarm_sound?: AlarmSound | null;
  snooze_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskFormData {
  title: string;
  reserved_start: string;
  reserved_end: string;
  notes?: string;
  alarm_sound?: AlarmSound;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  alarm_sound: AlarmSound;
  snooze_duration_minutes: number;
  default_session_minutes: number;
  notifications_enabled: boolean;
  sound_volume: number;
}

export interface CompletionStats {
  totalTasks: number;
  completedTasks: number;
  missedTasks: number;
  dismissedTasks: number;
  completionRate: number;
  totalFocusMinutes: number;
}
