import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionController } from '../.domain-build/src/controllers/SessionController.js';

const makeTask = (overrides = {}) => ({
  id: 'task-a',
  title: 'Native alarm test',
  notes: null,
  reserved_start: new Date(Date.now() - 60_000).toISOString(),
  reserved_end: new Date(Date.now() + 24 * 60_000).toISOString(),
  actual_start: new Date(Date.now() - 60_000).toISOString(),
  target_end: new Date(Date.now() + 24 * 60_000).toISOString(),
  actual_end: null,
  status: 'active',
  alarm_sound: 'teal_chime',
  snooze_count: 0,
  created_at: new Date(Date.now() - 120_000).toISOString(),
  updated_at: new Date(Date.now() - 60_000).toISOString(),
  ...overrides,
});

class FakeRepository {
  constructor(tasks) {
    this.tasks = tasks;
  }
  async initialize() {}
  async getAllTasks() { return [...this.tasks]; }
  async getTaskById(id) { return this.tasks.find((task) => task.id === id) ?? null; }
  async createTask() { throw new Error('not used'); }
  async saveTask(task) {
    const index = this.tasks.findIndex((item) => item.id === task.id);
    if (index >= 0) this.tasks[index] = task;
    else this.tasks.push(task);
    return task;
  }
  async deleteTask(id) {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((task) => task.id !== id);
    return this.tasks.length !== before;
  }
  async getSettings() { return { alarm_sound: 'teal_chime', snooze_duration_minutes: 5, notifications_enabled: true }; }
  async saveSettings(settings) { return { alarm_sound: 'teal_chime', snooze_duration_minutes: 5, notifications_enabled: true, ...settings }; }
}

class FakeAlarmEngine {
  constructor(record = null) {
    this.record = record;
    this.cancelled = [];
    this.scheduleCount = 0;
  }
  async ensureReady() {}
  async schedule(task) {
    this.scheduleCount += 1;
    this.record = { taskId: task.id, title: task.title, targetEndMs: Date.parse(task.target_end) };
    return { ...this.record, exact: true };
  }
  async cancel(taskId) {
    this.cancelled.push(taskId);
    if (this.record?.taskId === taskId) this.record = null;
  }
  async stopPresentation() {}
  getScheduledAlarm() { return this.record; }
  async getNotificationPermissionState() { return 'granted'; }
  async requestNotificationPermission() { return 'granted'; }
  getExactAlarmPermissionState() { return 'granted'; }
  async openExactAlarmSettings() { return true; }
  getCapabilities() {
    return {
      runtime: 'android',
      nativeScheduling: true,
      survivesJsProcessDeath: true,
      rebootRecovery: true,
      highImportanceNotification: true,
      fullScreenIntent: false,
      exactAlarm: true,
    };
  }
}

test('cancellation clears the live alarm before persisting dismissal', async () => {
  const active = makeTask();
  const repository = new FakeRepository([active]);
  const alarm = new FakeAlarmEngine({ taskId: active.id, title: active.title, targetEndMs: Date.parse(active.target_end) });
  const controller = new SessionController(repository, alarm);

  const cancelled = await controller.cancel(active);
  assert.deepEqual(alarm.cancelled, [active.id]);
  assert.equal(alarm.getScheduledAlarm(), null);
  assert.equal(cancelled.status, 'dismissed');
  assert.ok(cancelled.actual_end);
});

test('relaunch restores a missing native schedule from persisted target_end', async () => {
  const active = makeTask();
  const repository = new FakeRepository([active]);
  const alarm = new FakeAlarmEngine(null);
  const controller = new SessionController(repository, alarm);

  const recovered = await controller.initialize();
  assert.equal(recovered.activeTask?.id, active.id);
  assert.equal(alarm.scheduleCount, 1);
  assert.equal(alarm.getScheduledAlarm()?.targetEndMs, Date.parse(active.target_end));
});
