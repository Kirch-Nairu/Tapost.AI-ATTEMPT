import { AppSettings, Task } from '../../types/task';

export type AlarmPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface AlarmCapabilities {
  runtime: 'web';
  continuousWhileOpen: boolean;
  browserNotifications: boolean;
  vibration: boolean;
  backgroundWhenClosed: boolean;
  fullScreenOverLockScreen: boolean;
  exactNativeAlarm: boolean;
}

export interface AlarmEngine {
  start(task: Task, settings: AppSettings): void;
  stop(): void;
  requestPermission(): Promise<boolean>;
  getPermissionState(): AlarmPermissionState;
  getCapabilities(): AlarmCapabilities;
}
