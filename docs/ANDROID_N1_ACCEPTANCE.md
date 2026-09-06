# Tapost Android N1 — Implementation and Device Acceptance

This document records the implementation boundary and evidence required before Tapost may claim reliable native Android alarm behavior.

## Architecture

```text
React Native UI
      |
      v
SessionController
   |          |
   |          +--> AlarmEngine --> AndroidAlarmEngine --> TapostAlarm Expo local module
   |                                                   |
   |                                                   +--> AlarmManager
   |                                                   +--> BroadcastReceiver
   |                                                   +--> SharedPreferences alarm metadata
   |                                                   +--> high-importance alarm notification
   |                                                   +--> BOOT_COMPLETED recovery
   |
   +--> TaskRepository --> NativeTaskRepository --> SQLite
```

The JavaScript one-second timer updates only the displayed countdown. `target_end` is persisted in SQLite and the deadline is separately scheduled through Android `AlarmManager`; scheduled alarm metadata is also persisted in Android `SharedPreferences` so the broadcast receiver and boot receiver do not require the React Native process to already be alive.

## Scheduling policy

- A task/session ID is the stable native alarm identifier and PendingIntent request code.
- When exact alarms are permitted, N1 uses `setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ...)`.
- When exact-alarm access is denied, N1 uses `setAndAllowWhileIdle(...)` as an explicit inexact fallback. The UI reports the denied state and does not call the fallback exact.
- Starting the same active session reuses the stable PendingIntent identity rather than creating a second alarm.
- Complete, cancel, and dismiss call native cancellation before recording the terminal session state.
- Snooze stops the current presentation, preserves `actual_start`, leaves `actual_end` null, advances `target_end`, increments `snooze_count`, persists the task, and schedules the replacement native alarm.
- Relaunch reconciliation re-schedules an active persisted task if Android-native metadata is missing or does not match its persisted `target_end`.

## Android permissions and reasons

| Permission | Reason |
| --- | --- |
| `POST_NOTIFICATIONS` | Android 13+ runtime permission for the high-importance alarm notification. State is read from the OS through `expo-notifications`. |
| `VIBRATE` | Enables vibration on the alarm notification/channel. |
| `SCHEDULE_EXACT_ALARM` | User-controlled special access used when the OS permits exact alarm scheduling. Tapost does not declare `USE_EXACT_ALARM`. |
| `RECEIVE_BOOT_COMPLETED` | Allows restoration of persisted active alarm metadata after device reboot. |

No battery-optimization exemption permission or fake local permission flag is present. No full-screen intent permission is declared.

## Notification behavior

The native receiver creates a high-importance notification channel using Android alarm audio attributes, the device's real default alarm sound (falling back to the default notification sound), vibration, alarm category, and public lock-screen visibility. Tapping the notification launches `tapost://alarm/<task-id>` so the React Native app opens the relevant active alarm state.

If Android notification permission is denied, the AlarmManager broadcast path can still execute, but Android does not permit Tapost to post the user-visible/audible notification. N1 must not claim audible delivery in that permission state.

## Reboot recovery boundary

`TapostBootReceiver` listens for `BOOT_COMPLETED`, loads the single active native alarm record from SharedPreferences, and schedules it again. This is implemented but remains **UNVERIFIED ON DEVICE** until A10 passes.

Android/OEM behavior, exact-alarm access, Doze, and force-stop behavior vary by OS/device. A process being removed/killed is not the same as a user force-stopping the app in Android Settings. N1 makes no force-stop guarantee.

## Full-screen / lock-screen policy

N1 deliberately does **not** implement a full-screen intent or lock-screen takeover. Reliable native scheduling, notification behavior, process-death behavior, and lifecycle correctness are the priority. No UI or documentation should claim full-screen alarm support.

## Device acceptance matrix

Do not replace `NOT RUN` with `PASS` without concrete device/emulator evidence. A physical-device claim requires a physical device.

| ID | Scenario | Android version | Device/model or emulator | Expected | Actual | Status | Important limitation/evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | App foregrounded | — | — | Native alarm is scheduled; alarm notification/state occurs at deadline | Not run | NOT RUN | Device execution required |
| A2 | App backgrounded | — | — | Native alarm executes without foreground JS dependency | Not run | NOT RUN | Device execution required |
| A3 | Screen locked | — | — | High-importance notification is delivered where OS permission/policy allows | Not run | NOT RUN | No full-screen claim |
| A4 | Process removed/killed | — | — | BroadcastReceiver path executes at deadline without existing RN process | Not run | NOT RUN | Must distinguish process kill from force-stop |
| A5 | Notification permission granted | — | — | Alarm notification, sound, and vibration are presented | Not run | NOT RUN | Device execution required |
| A6 | Notification permission denied | — | — | OS state reads denied; native alarm may execute but notification presentation is suppressed | Not run | NOT RUN | Audible delivery is not claimed when denied |
| A7 | Snooze after alarm | — | — | Presentation stops; target_end moves by snooze duration; snooze count increments; native alarm re-schedules | Not run | NOT RUN | Verify old notification/alarm does not remain |
| A8 | Complete before alarm | — | — | Native alarm is cancelled; actual_end is completion time; no later alarm | Not run | NOT RUN | Device execution required |
| A9 | Cancel before alarm | — | — | Native alarm is cancelled and cannot fire afterward | Not run | NOT RUN | Device execution required |
| A10 | Reboot with active session | — | — | BOOT_COMPLETED restores persisted native schedule | Not run | NOT RUN | Implementation exists; device validation mandatory |
| A11 | Exact-alarm access denied | — | — | UI reads denied; Android inexact idle-allowed fallback is scheduled and labeled inexact | Not run | NOT RUN | Timing may be delayed by OS |
| A12 | Exact-alarm access granted | — | — | UI reads granted; `setExactAndAllowWhileIdle` path schedules deadline | Not run | NOT RUN | Device execution required |

## Automated evidence

Pure session/controller tests cover:

- one-active-session invariant;
- late start preserves the reserved duration (`10:17` start for a `10:00–10:25` reservation targets `10:42`);
- early completion records real `actual_end` rather than `target_end`;
- snooze updates `target_end`, preserves `actual_start`, leaves `actual_end` null, and increments count;
- cancellation clears the active native alarm abstraction before persisting dismissal;
- relaunch recovery restores a missing native schedule from persisted `target_end`.

GitHub Actions is the compile authority for this branch because the implementation environment used for this wave does not have direct outbound package/repository access. The Android CI job installs the pinned native dependencies, runs the domain tests and TypeScript check, runs Expo Doctor, performs a clean Android prebuild, and runs `./gradlew assembleDebug`.

## Claims held back until device acceptance

Do not claim any of the following solely from source review or an APK build:

- process-death alarm delivery proven on a device;
- reboot recovery proven on a device;
- exact timing across OEMs/Doze modes;
- lock-screen/full-screen takeover;
- audible notification when notification permission is denied;
- force-stopped application alarm delivery;
- iOS support.
