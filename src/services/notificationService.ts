// Service managing local web notifications, continuous vibration looping, and Expo/Android native channel configurations

export interface NativeAlarmConfig {
  channelId: string;
  importance: 'HIGH' | 'MAX';
  sound: string;
  enableVibration: boolean;
  fullScreenIntent: boolean;
  exactAlarmPermission: boolean;
}

class NotificationService {
  private hasPermission: boolean = false;
  private vibrationInterval: number | null = null;
  private isBatteryOptimizationDisabled: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
    }
    // Check battery optimization cached status
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tapost_battery_optimization_exempt');
      this.isBatteryOptimizationDisabled = saved === 'true';
    }
  }

  getPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  }

  /**
   * Start continuous repeating vibration until stopped by user action
   */
  startContinuousVibration() {
    this.stopVibration();
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 800]);
        this.vibrationInterval = window.setInterval(() => {
          if ('vibrate' in navigator) {
            navigator.vibrate([400, 200, 400, 200, 800]);
          }
        }, 2000);
      } catch (e) {
        console.warn('Vibration API error:', e);
      }
    }
  }

  /**
   * Stop any running vibration loop
   */
  stopVibration() {
    if (this.vibrationInterval !== null) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }

  triggerSingleVibration() {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 500]);
      } catch (e) {
        console.warn('Vibration API not available:', e);
      }
    }
  }

  showNotification(title: string, options?: NotificationOptions) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: true, // Keep notification visible until dismissed
          tag: 'tapost-session-alarm',
          ...options,
        });
      } catch (e) {
        console.warn('Notification instantiation failed:', e);
      }
    }
  }

  /**
   * Android high-priority channel configuration declaration for Expo & React Native.
   * On native Android, this configures the raw sound, high importance, and lock screen visibility.
   */
  getAndroidChannelSpec(): NativeAlarmConfig {
    return {
      channelId: 'tapost_alarm_channel_high',
      importance: 'MAX',
      sound: 'alarm_chime.wav', // raw resource in res/raw/alarm_chime.wav
      enableVibration: true,
      fullScreenIntent: true,
      exactAlarmPermission: true,
    };
  }

  /**
   * Check or simulate requesting battery optimization exemption
   */
  isBatteryExempt(): boolean {
    return this.isBatteryOptimizationDisabled;
  }

  setBatteryExempt(exempt: boolean) {
    this.isBatteryOptimizationDisabled = exempt;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tapost_battery_optimization_exempt', String(exempt));
    }
  }

  /**
   * Simulates launching native Android Intent `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
   */
  async triggerBatteryOptimizationIntent(): Promise<boolean> {
    // In React Native Expo, this executes:
    // await IntentLauncher.startActivityAsync(IntentLauncher.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, { data: 'package:' + pkgName });
    this.setBatteryExempt(true);
    return true;
  }
}

export const notificationService = new NotificationService();

