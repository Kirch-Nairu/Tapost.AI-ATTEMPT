import { requireNativeModule } from 'expo-modules-core';

export type ExactAlarmPermissionState = 'granted' | 'denied' | 'not_required';

export type ScheduledAlarm = {
  taskId: string;
  title: string;
  targetEndMs: number;
};

export type ScheduleResult = ScheduledAlarm & {
  exact: boolean;
};

type TapostAlarmNativeModule = {
  ensureChannel(): void;
  schedule(taskId: string, title: string, targetEndMs: number): ScheduleResult;
  cancel(taskId: string): void;
  stopPresentation(taskId: string): void;
  getScheduledAlarm(): ScheduledAlarm | null;
  getExactAlarmPermissionState(): ExactAlarmPermissionState;
  openExactAlarmSettings(): Promise<boolean>;
};

export default requireNativeModule<TapostAlarmNativeModule>('TapostAlarm');
