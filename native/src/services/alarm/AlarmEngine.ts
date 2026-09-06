import type { Task } from '../../types/task';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';
export type ExactAlarmPermissionState = 'granted' | 'denied' | 'not_required';

export type ScheduledAlarm = {
  taskId: string;
  title: string;
  targetEndMs: number;
};

export type ScheduleResult = ScheduledAlarm & {
  exact: boolean;
};

export interface AndroidAlarmCapabilities {
  runtime: 'android';
  nativeScheduling: true;
  survivesJsProcessDeath: true;
  rebootRecovery: true;
  highImportanceNotification: true;
  fullScreenIntent: false;
  exactAlarm: boolean;
}

export interface AlarmEngine {
  ensureReady(): Promise<void>;
  schedule(task: Task): Promise<ScheduleResult>;
  cancel(taskId: string): Promise<void>;
  stopPresentation(taskId: string): Promise<void>;
  getScheduledAlarm(): ScheduledAlarm | null;
  getNotificationPermissionState(): Promise<NotificationPermissionState>;
  requestNotificationPermission(): Promise<NotificationPermissionState>;
  getExactAlarmPermissionState(): ExactAlarmPermissionState;
  openExactAlarmSettings(): Promise<boolean>;
  getCapabilities(): AndroidAlarmCapabilities;
}
