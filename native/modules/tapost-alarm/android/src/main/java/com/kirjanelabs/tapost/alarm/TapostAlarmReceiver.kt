package com.kirjanelabs.tapost.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build

class TapostAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val taskId = intent.getStringExtra(TapostAlarmScheduler.EXTRA_TASK_ID) ?: return
    val title = intent.getStringExtra(TapostAlarmScheduler.EXTRA_TITLE) ?: "Tapost session"
    val targetEndMs = intent.getLongExtra(TapostAlarmScheduler.EXTRA_TARGET_END_MS, System.currentTimeMillis())
    AlarmStore.save(context, AlarmRecord(taskId, title, targetEndMs))
    postAlarmNotification(context, taskId, title)
  }

  private fun postAlarmNotification(context: Context, taskId: String, title: String) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(context)
    val alarmSound = alarmSound()

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      data = Uri.parse("tapost://alarm/${Uri.encode(taskId)}")
      putExtra(TapostAlarmScheduler.EXTRA_TASK_ID, taskId)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(
        context,
        taskId.hashCode(),
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ID)
    } else {
      Notification.Builder(context)
        .setPriority(Notification.PRIORITY_MAX)
        .setSound(alarmSound)
        .setVibrate(VIBRATION_PATTERN)
    }

    val icon = context.applicationInfo.icon.takeIf { it != 0 } ?: android.R.drawable.ic_lock_idle_alarm
    val notification = builder
      .setSmallIcon(icon)
      .setContentTitle("Time's up: $title")
      .setContentText("Open Tapost to snooze, dismiss, or complete this session.")
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setAutoCancel(false)
      .setOngoing(true)
      .apply { if (contentIntent != null) setContentIntent(contentIntent) }
      .build()

    try {
      manager.notify(TapostAlarmScheduler.notificationId(taskId), notification)
    } catch (_: SecurityException) {
      // Android 13+ may deny POST_NOTIFICATIONS. The native alarm still fired;
      // the UI reports the denied permission instead of pretending notification delivery.
    }
  }

  companion object {
    const val CHANNEL_ID = "tapost_session_alarm_v1"
    private val VIBRATION_PATTERN = longArrayOf(0, 500, 250, 500, 250, 900)

    private fun alarmSound(): Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

    fun ensureChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Tapost session alarms",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Audible alarms for active Tapost sessions"
        enableVibration(true)
        vibrationPattern = VIBRATION_PATTERN
        setSound(alarmSound(), audioAttributes)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      manager.createNotificationChannel(channel)
    }
  }
}
