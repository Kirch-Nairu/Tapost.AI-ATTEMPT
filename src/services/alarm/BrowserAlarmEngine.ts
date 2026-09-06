import { audioService } from '../audioService';
import { notificationService } from '../notificationService';
import { AppSettings, Task } from '../../types/task';
import { AlarmCapabilities, AlarmEngine, AlarmPermissionState } from './AlarmEngine';

export class BrowserAlarmEngine implements AlarmEngine {
  start(task: Task, settings: AppSettings): void {
    audioService.startRepeatingAlarm(
      task.alarm_sound || settings.alarm_sound,
      settings.sound_volume,
    );

    notificationService.startContinuousVibration();

    if (settings.notifications_enabled) {
      notificationService.showNotification(`Tapost Session Ended: ${task.title}`, {
        body: 'Your focus session has completed. Open Tapost to complete, snooze, or dismiss it.',
      });
    }
  }

  stop(): void {
    audioService.stopAlarm();
    notificationService.stopVibration();
  }

  requestPermission(): Promise<boolean> {
    return notificationService.requestPermission();
  }

  getPermissionState(): AlarmPermissionState {
    return notificationService.getPermissionState();
  }

  getCapabilities(): AlarmCapabilities {
    const hasNotifications =
      typeof window !== 'undefined' && 'Notification' in window;
    const hasVibration =
      typeof navigator !== 'undefined' && 'vibrate' in navigator;

    return {
      runtime: 'web',
      continuousWhileOpen: true,
      browserNotifications: hasNotifications,
      vibration: hasVibration,
      backgroundWhenClosed: false,
      fullScreenOverLockScreen: false,
      exactNativeAlarm: false,
    };
  }
}
