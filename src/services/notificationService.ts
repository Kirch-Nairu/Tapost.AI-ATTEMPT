class NotificationService {
  private vibrationInterval: number | null = null;

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
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  startContinuousVibration(): void {
    this.stopVibration();

    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      return;
    }

    try {
      navigator.vibrate([400, 200, 400, 200, 800]);
      this.vibrationInterval = window.setInterval(() => {
        navigator.vibrate([400, 200, 400, 200, 800]);
      }, 2000);
    } catch (error) {
      console.warn('Vibration API error:', error);
    }
  }

  stopVibration(): void {
    if (this.vibrationInterval !== null) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }

    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      return;
    }

    try {
      navigator.vibrate(0);
    } catch {
      // Some browsers expose navigator.vibrate but reject calls at runtime.
    }
  }

  triggerSingleVibration(): void {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
      return;
    }

    try {
      navigator.vibrate([300, 150, 300, 150, 500]);
    } catch (error) {
      console.warn('Vibration API not available:', error);
    }
  }

  showNotification(title: string, options?: NotificationOptions): void {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        tag: 'tapost-session-alarm',
        ...options,
      });
    } catch (error) {
      console.warn('Notification instantiation failed:', error);
    }
  }
}

export const notificationService = new NotificationService();
