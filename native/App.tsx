import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { nativeSessionController } from './src/controllers/NativeSessionController';
import { remainingSeconds } from './src/domain/session';
import { nativeTaskRepository } from './src/repositories/NativeTaskRepository';
import {
  androidAlarmEngine,
  type ExactAlarmPermissionState,
  type NotificationPermissionState,
} from './src/services/alarm';
import type { Task } from './src/types/task';

function parseAlarmTaskId(url: string | null): string | null {
  if (!url) return null;
  const match = /^tapost:\/\/alarm\/([^/?#]+)/i.exec(url);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function formatRemaining(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !disabled && styles.buttonPressed, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [ringingTaskId, setRingingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('Focus session');
  const [durationText, setDurationText] = useState('25');
  const [nowMs, setNowMs] = useState(Date.now());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>('undetermined');
  const [exactPermission, setExactPermission] = useState<ExactAlarmPermissionState>('denied');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshPermissions = useCallback(async () => {
    setNotificationPermission(await androidAlarmEngine.getNotificationPermissionState());
    setExactPermission(androidAlarmEngine.getExactAlarmPermissionState());
  }, []);

  const refreshTasks = useCallback(async (alarmTaskId?: string | null) => {
    const nextTasks = await nativeTaskRepository.getAllTasks();
    const nextActive = nextTasks.find((task) => task.status === 'active') ?? null;
    setTasks(nextTasks);
    setActiveTask(nextActive);

    if (alarmTaskId && nextActive?.id === alarmTaskId) {
      setRingingTaskId(alarmTaskId);
    } else if (nextActive?.target_end && Date.parse(nextActive.target_end) <= Date.now()) {
      setRingingTaskId(nextActive.id);
    } else if (!nextActive) {
      setRingingTaskId(null);
    }
  }, []);

  const handleAlarmUrl = useCallback(async (url: string | null) => {
    const taskId = parseAlarmTaskId(url);
    if (!taskId) return;
    await refreshTasks(taskId);
  }, [refreshTasks]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const recovery = await nativeSessionController.initialize();
        if (!mounted) return;
        setTasks(recovery.tasks);
        setActiveTask(recovery.activeTask);
        if (recovery.alarmDue && recovery.activeTask) {
          setRingingTaskId(recovery.activeTask.id);
        }
        await refreshPermissions();
        const initialUrl = await Linking.getInitialURL();
        if (mounted) await handleAlarmUrl(initialUrl);
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAlarmUrl(url);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshPermissions();
        void refreshTasks();
      }
    });
    const timer = setInterval(() => setNowMs(Date.now()), 1000);

    return () => {
      mounted = false;
      linkSubscription.remove();
      appStateSubscription.remove();
      clearInterval(timer);
    };
  }, [handleAlarmUrl, refreshPermissions, refreshTasks]);

  useEffect(() => {
    if (!activeTask?.target_end || ringingTaskId === activeTask.id) return;
    const target = Date.parse(activeTask.target_end);
    if (Number.isFinite(target) && target <= nowMs) {
      setRingingTaskId(activeTask.id);
    }
  }, [activeTask, nowMs, ringingTaskId]);

  const remaining = useMemo(
    () => (activeTask ? remainingSeconds(activeTask, nowMs) : 0),
    [activeTask, nowMs],
  );

  const run = useCallback(async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const createTask = useCallback(() => run(async () => {
    const duration = Math.max(1, Math.min(24 * 60, Number.parseInt(durationText, 10) || 25));
    const start = Date.now();
    await nativeTaskRepository.createTask({
      title: title.trim() || 'Untitled session',
      reserved_start: new Date(start).toISOString(),
      reserved_end: new Date(start + duration * 60_000).toISOString(),
      alarm_sound: 'teal_chime',
    });
    await refreshTasks();
  }), [durationText, refreshTasks, run, title]);

  const startTask = useCallback((taskId: string) => run(async () => {
    const started = await nativeSessionController.start(taskId);
    setActiveTask(started);
    setRingingTaskId(null);
    await refreshTasks();
  }), [refreshTasks, run]);

  const completeActive = useCallback(() => run(async () => {
    if (!activeTask) return;
    await nativeSessionController.complete(activeTask);
    setRingingTaskId(null);
    await refreshTasks();
  }), [activeTask, refreshTasks, run]);

  const cancelActive = useCallback(() => run(async () => {
    if (!activeTask) return;
    await nativeSessionController.cancel(activeTask);
    setRingingTaskId(null);
    await refreshTasks();
  }), [activeTask, refreshTasks, run]);

  const dismissActive = useCallback(() => run(async () => {
    if (!activeTask) return;
    await nativeSessionController.dismiss(activeTask);
    setRingingTaskId(null);
    await refreshTasks();
  }), [activeTask, refreshTasks, run]);

  const snoozeActive = useCallback(() => run(async () => {
    if (!activeTask) return;
    const settings = await nativeTaskRepository.getSettings();
    const snoozed = await nativeSessionController.snooze(activeTask, settings.snooze_duration_minutes);
    setActiveTask(snoozed);
    setRingingTaskId(null);
    await refreshTasks();
  }), [activeTask, refreshTasks, run]);

  const ringing = Boolean(activeTask && ringingTaskId === activeTask.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>TAPOST · ANDROID N1</Text>
        <Text style={styles.heading}>Native session alarm</Text>
        <Text style={styles.intro}>
          The countdown is visual only. The deadline is scheduled with Android AlarmManager and persisted outside the JavaScript runtime.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Android access</Text>
          <Text style={styles.meta}>Notifications: {notificationPermission}</Text>
          <Text style={styles.meta}>Exact alarm: {exactPermission}</Text>
          {notificationPermission !== 'granted' && (
            <PrimaryButton label="Request notification access" onPress={() => void run(async () => {
              setNotificationPermission(await androidAlarmEngine.requestNotificationPermission());
            })} />
          )}
          {exactPermission === 'denied' && (
            <>
              <Text style={styles.warning}>
                Exact-alarm access is denied. Tapost will schedule an Android inexact idle-allowed fallback, which may fire later than target_end.
              </Text>
              <SecondaryButton label="Open exact-alarm settings" onPress={() => void run(async () => {
                await androidAlarmEngine.openExactAlarmSettings();
              })} />
            </>
          )}
          <Text style={styles.caption}>Full-screen/lock-screen takeover is not implemented in N1.</Text>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {activeTask ? (
          <View style={[styles.card, ringing && styles.ringingCard]}>
            <Text style={styles.eyebrow}>{ringing ? 'ALARM DUE' : 'ACTIVE SESSION'}</Text>
            <Text style={styles.activeTitle}>{activeTask.title}</Text>
            <Text style={styles.timer}>{ringing ? '00:00' : formatRemaining(remaining)}</Text>
            <Text style={styles.meta}>actual_start: {activeTask.actual_start ?? '—'}</Text>
            <Text style={styles.meta}>target_end: {activeTask.target_end ?? '—'}</Text>
            <Text style={styles.meta}>snoozes: {activeTask.snooze_count ?? 0}</Text>

            {ringing ? (
              <View style={styles.actions}>
                <PrimaryButton disabled={busy} label="Snooze" onPress={() => void snoozeActive()} />
                <SecondaryButton label="Complete" onPress={() => void completeActive()} />
                <SecondaryButton label="Dismiss" onPress={() => void dismissActive()} />
              </View>
            ) : (
              <View style={styles.actions}>
                <PrimaryButton disabled={busy} label="Complete now" onPress={() => void completeActive()} />
                <SecondaryButton label="Cancel session" onPress={() => void cancelActive()} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create task</Text>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Focus session"
              style={styles.input}
            />
            <Text style={styles.label}>Reserved duration (minutes)</Text>
            <TextInput
              value={durationText}
              onChangeText={setDurationText}
              keyboardType="number-pad"
              style={styles.input}
            />
            <PrimaryButton disabled={busy} label="Create task" onPress={() => void createTask()} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tasks</Text>
          {tasks.length === 0 ? (
            <Text style={styles.caption}>No tasks yet.</Text>
          ) : tasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={styles.taskCopy}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.meta}>{task.status} · {Math.max(1, Math.round((Date.parse(task.reserved_end) - Date.parse(task.reserved_start)) / 60_000))} min reserved</Text>
              </View>
              {task.status === 'pending' && (
                <Pressable accessibilityRole="button" onPress={() => void startTask(task.id)} style={styles.startButton}>
                  <Text style={styles.startButtonText}>Start</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f7f8' },
  container: { padding: 20, paddingBottom: 48, gap: 16 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#0f766e' },
  heading: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#102a2a' },
  intro: { fontSize: 15, lineHeight: 22, color: '#4b6262' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: '#dfe9e8' },
  ringingCard: { borderWidth: 2, borderColor: '#b45309' },
  cardTitle: { fontSize: 19, fontWeight: '700', color: '#173838' },
  activeTitle: { fontSize: 24, fontWeight: '800', color: '#173838' },
  timer: { fontSize: 52, fontVariant: ['tabular-nums'], fontWeight: '800', color: '#0f766e', marginVertical: 4 },
  label: { marginTop: 4, fontSize: 13, fontWeight: '700', color: '#355555' },
  input: { borderWidth: 1, borderColor: '#cbdad8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#173838', backgroundColor: '#fbfdfd' },
  button: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#0f766e', marginTop: 4 },
  buttonPressed: { opacity: 0.78 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  secondaryButton: { minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#9fb9b6' },
  secondaryButtonText: { color: '#173838', fontWeight: '700', fontSize: 15 },
  actions: { gap: 10, marginTop: 6 },
  warning: { color: '#92400e', lineHeight: 20, fontSize: 13 },
  caption: { color: '#617777', lineHeight: 19, fontSize: 13 },
  meta: { color: '#617777', fontSize: 12, lineHeight: 18 },
  errorCard: { padding: 14, borderRadius: 12, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  errorText: { color: '#9f1239', fontSize: 13, lineHeight: 19 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#dfe9e8' },
  taskCopy: { flex: 1, gap: 3 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: '#173838' },
  startButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#d7f3ef' },
  startButtonText: { color: '#0f766e', fontWeight: '800' },
});
