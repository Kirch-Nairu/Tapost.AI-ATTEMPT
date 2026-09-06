package com.kirjanelabs.tapost.alarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

object TapostAlarmScheduler {
  const val ACTION_FIRE = "com.kirjanelabs.tapost.alarm.FIRE"
  const val EXTRA_TASK_ID = "task_id"
  const val EXTRA_TITLE = "task_title"
  const val EXTRA_TARGET_END_MS = "target_end_ms"

  data class ScheduleResult(val record: AlarmRecord, val exact: Boolean)

  fun schedule(context: Context, record: AlarmRecord): ScheduleResult {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val operation = alarmPendingIntent(context, record)
    val triggerAt = maxOf(System.currentTimeMillis() + 250L, record.targetEndMs)
    val exactAllowed = canScheduleExact(context)

    if (exactAllowed) {
      try {
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation)
      } catch (_: SecurityException) {
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation)
        AlarmStore.save(context, record)
        return ScheduleResult(record, false)
      }
    } else {
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation)
    }

    AlarmStore.save(context, record)
    return ScheduleResult(record, exactAllowed)
  }

  fun cancel(context: Context, taskId: String) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val operation = alarmPendingIntent(context, AlarmRecord(taskId, "", 0L))
    alarmManager.cancel(operation)
    operation.cancel()
    stopPresentation(context, taskId)
    AlarmStore.clear(context, taskId)
  }

  fun stopPresentation(context: Context, taskId: String) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(notificationId(taskId))
  }

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
  }

  fun exactPermissionState(context: Context): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return "not_required"
    return if (canScheduleExact(context)) "granted" else "denied"
  }

  fun openExactAlarmSettings(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
    val intent = Intent(
      Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
      Uri.parse("package:${context.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
    return true
  }

  fun notificationId(taskId: String): Int = taskId.hashCode()

  private fun alarmPendingIntent(context: Context, record: AlarmRecord): PendingIntent {
    val intent = Intent(context, TapostAlarmReceiver::class.java).apply {
      action = ACTION_FIRE
      data = Uri.parse("tapost-alarm://${Uri.encode(record.taskId)}")
      putExtra(EXTRA_TASK_ID, record.taskId)
      putExtra(EXTRA_TITLE, record.title)
      putExtra(EXTRA_TARGET_END_MS, record.targetEndMs)
    }
    return PendingIntent.getBroadcast(
      context,
      record.taskId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
