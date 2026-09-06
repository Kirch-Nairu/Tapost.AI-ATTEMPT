# Tapost

Tapost is a task-and-session alarm productivity app. The current runnable build is a React 19 + TypeScript + Vite web application with local persistence, a manual-start focus-session model, browser audio alarms, browser notifications, vibration where supported, history analytics, and configurable snooze/timer preferences.

## Product flow

1. Reserve a task with a planned start and end time.
2. Tap **Start** deliberately when you are ready.
3. Tapost runs the full reserved duration from the actual start time.
4. When the countdown reaches zero, the browser runtime starts a repeating alarm and presents the alarm screen.
5. Complete, snooze, or dismiss the session.

Tapost permits only one active session at a time. If legacy data contains multiple active sessions, startup repair keeps the most recent active session and dismisses stale active records.

## Current architecture

```text
React screens/components
        |
        v
Zustand taskStore
   |             |
   v             v
TaskRepository   AlarmEngine
   |             |
   v             v
localStorage     BrowserAlarmEngine
                 |       |       |
                 v       v       v
              WebAudio Notification Vibration
```

### State and domain

- Zustand owns task/session application state.
- `reserved_start` and `reserved_end` describe the planned reservation.
- `actual_start` records when the user actually starts a session.
- `target_end` is the current countdown deadline. It moves when a ringing session is snoozed.
- `actual_end` is written only when the session really finishes, is dismissed, or is cancelled.
- Focus statistics are calculated from `actual_start` to `actual_end`, not from the planned deadline.

This separation keeps the countdown deadline independent from historical execution data, so completing a session early does not inflate focus statistics.

### Persistence

The current browser repository uses localStorage behind `taskRepository`.

The repository automatically migrates the old misleading `tapost_sqlite_tasks_v1` key to `tapost_tasks_v2`. It also repairs legacy active records that stored their countdown deadline in `actual_end` by moving that value to `target_end`.

Demo data is seeded once. Clearing tasks does not cause demo records to silently return on the next reload. The persistence boundary is intentionally isolated so a native SQLite repository can replace the browser implementation later without rewriting the screens.

### Alarm engine

`src/services/alarm/AlarmEngine.ts` defines the alarm platform contract.

The current implementation is `BrowserAlarmEngine` and supports:

- repeating Web Audio alarms while the browser runtime remains available;
- browser notifications when the browser supports them and permission is granted;
- vibration when the browser/device exposes the Vibration API;
- snooze and dismissal through the Tapost UI.

The browser build does **not** claim:

- native exact-alarm scheduling;
- full-screen alarm activity over the lock screen;
- guaranteed delivery after the browser/app is fully closed;
- Android battery-optimization exemption;
- force-killed native alarm guarantees.

See [`docs/NATIVE_ROADMAP.md`](docs/NATIVE_ROADMAP.md) for the Android/iOS adapter requirements and acceptance gate.

## Screens

- Home / task list
- Add Task
- Task Detail
- Active Session
- Alarm Ringing modal
- History / analytics
- Settings

## Development

Requirements: Node.js 20+ (CI uses Node 22) and npm.

```bash
npm ci
npm run dev
```

The Vite development server runs on port 3000.

Validation commands:

```bash
npm run lint
npm run build
```

A GitHub Actions workflow is included at `.github/workflows/ci.yml` to run installation, TypeScript checking, and the production build on pushes and pull requests when Actions are enabled for the repository.

## AI status

The repository still contains AI Studio/Gemini scaffolding metadata and an `@google/genai` dependency from the original prototype environment, but no production AI feature currently consumes Gemini. Do not expose a Gemini API key in the Vite client. Any future AI feature should call Gemini from a server-side or otherwise secret-safe boundary.

## Native status

The previous `app.json` Expo scaffold was removed because the repository did not contain Expo/React Native dependencies or the referenced native assets. Native support should be added only when a real native project and platform alarm adapter are implemented and device-tested.
