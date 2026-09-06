import * as Notifications from 'expo-notifications';
import TapostAlarm from '../../../modules/tapost-alarm';
import type { Task } from '../../types/task';
import type {
  AlarmEngine,
  AndroidAlarmCapabilities,
  ExactAlarmPermissionState,
  NotificationPermissionState,
  ScheduleResult,
  ScheduledAlarm,
} from './AlarmEngine';

function normalizeNotificationStatus(status: string): NotificationPermissionState {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export class AndroidAlarmEngine implements AlarmEngine {
  async ensureReady(): Promise<void> {
    TapostAlarm.ensureChannel();
  }

  async schedule(task: Task): Promise<ScheduleResult> {
    if (!task.target_end) {
      throw new Error(`Cannot schedule task ${task.id} without target_end`);
    }
    const targetEndMs = new Date(task.target_end).getTime();
    if (!Number.isFinite(targetEndMs)) {
      throw new Error(`Cannot schedule task ${task.id} with invalid target_end`);
    }
    TapostAlarm.stopPresentation(task.id);
    return TapostAlarm.schedule(task.id, task.title, targetEndMs);
  }

  async cancel(taskId: string): Promise<void> {
    TapostAlarm.cancel(taskId);
  }

  async stopPresentation(taskId: string): Promise<void> {
    TapostAlarm.stopPresentation(taskId);
  }

  getScheduledAlarm(): ScheduledAlarm | null {
    return TapostAlarm.getScheduledAlarm();
  }

  async getNotificationPermissionState(): Promise<NotificationPermissionState> {
    const permissions = await Notifications.getPermissionsAsync();
    return normalizeNotificationStatus(String(permissions.status));
  }

  async requestNotificationPermission(): Promise<NotificationPermissionState> {
    await this.ensureReady();
    const permissions = await Notifications.requestPermissionsAsync();
    return normalizeNotificationStatus(String(permissions.status));
  }

  getExactAlarmPermissionState(): ExactAlarmPermissionState {
    return TapostAlarm.getExactAlarmPermissionState();
  }

  openExactAlarmSettings(): Promise<boolean> {
    return TapostAlarm.openExactAlarmSettings();
  }

  getCapabilities(): AndroidAlarmCapabilities {
    const exactState = this.getExactAlarmPermissionState();
    return {
      runtime: 'android',
      nativeScheduling: true,
      survivesJsProcessDeath: true,
      rebootRecovery: true,
      highImportanceNotification: true,
      fullScreenIntent: false,
      exactAlarm: exactState === 'granted' || exactState === 'not_required',
    };
  }
}

export const androidAlarmEngine = new AndroidAlarmEngine();
