# Tapost Native Alarm Roadmap

The current runnable application is a React + Vite browser build. Native Android/iOS alarm behavior is intentionally not claimed until a real native runtime is implemented and tested.

## Existing seam

`src/services/alarm/AlarmEngine.ts` is the platform boundary. The Zustand store depends on this contract instead of directly depending on browser notification APIs.

Current implementation:

- `BrowserAlarmEngine`
- Web Audio API for repeating alarm sound
- Browser Notification API when permission is granted
- Browser Vibration API when available
- No guarantees after the browser runtime is closed
- No full-screen lock-screen activity
- No native exact-alarm scheduling

## Android adapter target

Add an Android implementation behind the same `AlarmEngine` contract. It must be backed by actual native primitives rather than browser timers.

Required behaviors to evaluate and test:

1. Schedule session end using an Android-native exact/alarm mechanism appropriate for the supported SDK level.
2. Persist enough session metadata so the alarm can be restored after process death or device reboot when permitted.
3. Create a high-importance notification channel with a real packaged alarm sound.
4. Handle notification permission requirements on supported Android versions.
5. Handle exact-alarm permission/special access requirements where applicable.
6. Decide whether full-screen intent behavior is appropriate and policy-compliant for the product category.
7. Test Doze, screen-off, process-killed, reboot, OEM battery-management, and permission-denied cases on physical devices.
8. Never display an in-app "battery exempt" state unless it was read from the operating system.

## iOS adapter target

The iOS implementation must use supported local-notification/background capabilities and document platform limits rather than simulating Android-style exact alarms.

Required behaviors to evaluate and test:

1. Schedule local notifications using native APIs.
2. Package notification sounds correctly.
3. Restore app session state independently of JS timers.
4. Test foreground, background, suspended, terminated, reboot, Focus mode, and notification-permission cases.
5. Do not claim continuous JS execution or full-screen alarm behavior that iOS does not provide.

## Persistence target

The current `taskRepository` is deliberately isolated so localStorage can later be replaced by a platform-specific repository without rewriting screens or the domain store.

Recommended shape:

```text
TaskStore
  -> TaskRepository contract
       -> BrowserLocalStorageRepository
       -> NativeSqliteRepository

TaskStore
  -> AlarmEngine contract
       -> BrowserAlarmEngine
       -> AndroidAlarmEngine
       -> IosAlarmEngine
```

## Acceptance gate for native claims

Do not add README/UI claims such as "rings over lock screen", "force-killed alarm", "exact to the second", or "battery optimization exempt" until the corresponding native adapter exists and has device evidence for the supported platform/version matrix.
