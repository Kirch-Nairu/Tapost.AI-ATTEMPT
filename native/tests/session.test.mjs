import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSingleActiveSession,
  completeSession,
  snoozeSession,
  startSession,
} from '../.domain-build/src/domain/session.js';

const task = (overrides = {}) => ({
  id: 'task-a',
  title: 'Deep work',
  notes: null,
  reserved_start: '2026-09-06T10:00:00.000Z',
  reserved_end: '2026-09-06T10:25:00.000Z',
  actual_start: null,
  target_end: null,
  actual_end: null,
  status: 'pending',
  alarm_sound: 'teal_chime',
  snooze_count: 0,
  created_at: '2026-09-06T09:00:00.000Z',
  updated_at: '2026-09-06T09:00:00.000Z',
  ...overrides,
});

test('starting B while A is active fails', () => {
  assert.throws(
    () => assertSingleActiveSession([task({ id: 'task-a', status: 'active' }), task({ id: 'task-b' })], 'task-b'),
    /active session/,
  );
});

test('late start preserves reserved duration', () => {
  const started = startSession(task(), Date.parse('2026-09-06T10:17:00.000Z'));
  assert.equal(started.actual_start, '2026-09-06T10:17:00.000Z');
  assert.equal(started.target_end, '2026-09-06T10:42:00.000Z');
  assert.equal(started.actual_end, null);
});

test('early completion records real finish time', () => {
  const active = task({
    status: 'active',
    actual_start: '2026-09-06T10:17:00.000Z',
    target_end: '2026-09-06T10:42:00.000Z',
  });
  const completed = completeSession(active, Date.parse('2026-09-06T10:27:00.000Z'));
  assert.equal(completed.actual_end, '2026-09-06T10:27:00.000Z');
  assert.notEqual(completed.actual_end, completed.target_end);
});

test('snooze moves target_end without finishing session', () => {
  const active = task({
    status: 'active',
    actual_start: '2026-09-06T10:17:00.000Z',
    target_end: '2026-09-06T10:42:00.000Z',
  });
  const snoozed = snoozeSession(active, Date.parse('2026-09-06T10:42:00.000Z'), 5);
  assert.equal(snoozed.target_end, '2026-09-06T10:47:00.000Z');
  assert.equal(snoozed.actual_start, active.actual_start);
  assert.equal(snoozed.actual_end, null);
  assert.equal(snoozed.snooze_count, 1);
});
