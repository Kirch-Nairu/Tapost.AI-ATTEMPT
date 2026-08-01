# Tapost — Task & Built-In Alarm Productivity App

**Tapost** (from Tagalog *"tapos"* = done, blended with *"post"*) is a task-and-alarm productivity mobile & web application.

## Core Concept & Unique Flow
Unlike traditional task planners where alarms must be configured separately in a phone's clock app, **Tapost builds the session alarm directly into each task**:

1. **Reservation**: User schedules a task with a `reserved_start` and `reserved_end` time. The task stays in a `pending` state.
2. **Deliberate Start**: Starting a session requires a explicit manual tap on **"Start"**.
3. **Full Planned Length**: Upon tapping Start, the timer runs for the task's full planned duration (`reserved_end - reserved_start`), regardless of when Start was tapped.
4. **Local Session Alarm**: When the countdown completes, Tapost fires an on-screen alert, custom audio chime, vibration, and local notification.
5. **Prompt**: The user can **Mark Done**, **Snooze** (adds 5 min), or **Dismiss**.

---

## 🔔 Alarm Reliability on Task Session End — Platform Guarantees & Expo Matrix

When a task session timer ends, Tapost triggers an audible alarm, repeating vibration, and a full-screen alert. The table below details which platform guarantees are **fully met out-of-the-box in Expo managed workflow** vs. **which require a native config plugin or bare workflow**:

| Requirement / Guarantee | Android Expo Managed | Android Bare / Notifee Plugin | iOS Expo Managed | Status & Implementation Details |
| :--- | :--- | :--- | :--- | :--- |
| **High Importance Channel** (`IMPORTANCE_MAX` / `HIGH`) | ✅ Fully Met | ✅ Fully Met | N/A | Created via `notificationService.ts` with custom `alarm_chime.wav` raw sound resource and max importance. |
| **Exact Alarm Triggers under Doze Mode** (`SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`) | ✅ Fully Met | ✅ Fully Met | ✅ Best Effort | Declared in `app.json` permissions list. Prevents 5–15 min Doze mode delays on Android 12+. |
| **Battery Optimization Exemption** (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) | ✅ Fully Met via Intent | ✅ Fully Met via Intent | N/A | Interactive rationale modal in Settings & Session screen requesting exemption from OEM battery suppressors (Samsung, Xiaomi, etc.). |
| **Full-Screen Activity over Lock Screen** (`android:fullScreenIntent`) | ⚠️ Config Plugin Needed | ✅ Fully Met (`Notifee.displayNotification`) | ⚠️ Banner Alert | `expo-notifications` displays heads-up alerts. Launching full-screen Intent over lock screen requires Notifee or custom Expo config plugin (`@notifee/react-native`). |
| **Continuous Sound & Vibration Loop** | ✅ Fully Met | ✅ Fully Met | ✅ Fully Met | Audio & Vibration repeat continuously via `audioService` & `notificationService` until user taps Stop, Snooze, or Mark Done. |
| **Alarm when App Force-Killed** | ⚠️ Best Effort via AlarmManager | ✅ Fully Met via Foreground Service | ❌ OS Restriction | iOS sandbox strictly forbids JS execution when app is force-closed. Android uses native AlarmManager exact alarm intent. |

---

## 🛠️ Architecture & Data Layer

- **Framework**: React / React Native Expo architecture with Vite preview support
- **State Engine**: Zustand (`stores/taskStore.ts`) with reactive tick interval & audio synth triggers
- **Database Layer**: Isolated Repository pattern (`services/taskRepository.ts`) wrapping local SQLite / IndexedDB persistence
- **Validation**: React Hook Form + Zod schema validation
- **Styling**: Option A Palette (`#0F6E56` primary deep teal, `#E1F5EE` light surface, `#993C1D` coral alert accent) with NativeWind / Tailwind CSS

---

## 📱 Running on Android & iOS (Native Setup Notes)

### 1. Android Local Build
To run or build locally on Android via Android Studio / Expo prebuild:
```bash
npx expo prebuild --platform android
npx expo run:android
```

### 2. Android Exact Alarm Permission (`SCHEDULE_EXACT_ALARM`)
In Android 12+ (API level 31+), Android restricts exact alarm triggers by default to optimize battery usage.
To ensure alarms fire **precisely to the second** when a session ends, add the following to `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "sounds": ["./assets/alarm_chime.wav"]
        }
      ]
    ],
    "android": {
      "permissions": [
        "SCHEDULE_EXACT_ALARM",
        "USE_EXACT_ALARM",
        "VIBRATE",
        "POST_NOTIFICATIONS"
      ]
    }
  }
}
```

### 3. iOS Known Background Limitations
On iOS, local notifications scheduled via `expo-notifications` will fire if the app is foregrounded or suspended in memory. However, if the user **force-quits** the app from the iOS App Switcher, scheduled JS intervals and local Web Audio triggers cannot execute until the app is reopened. This is a known iOS operating system sandbox constraint.

---

## 🚀 Development & Web Preview
- **Dev Server**: `npm run dev` (Runs on http://localhost:3000)
- **Build**: `npm run build`
