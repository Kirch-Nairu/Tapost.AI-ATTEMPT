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
    val alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
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
        vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 900)
        setSound(alarmSound, audioAttributes)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      manager.createNotificationChannel(channel)
    }

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
        .setVibrate(longArrayOf(0, 500, 250, 500, 250, 900))
    }

    val notification = builder
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("Time's up: $title")
      .setContentText("Open Tapost to snooze, dismiss, or complete this session.")
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setAutoCancel(false)
      .setOngoing(true)
      .apply { if (contentIntent != null) setContentIntent(contentIntent) }
      .build()

    manager.notify(TapostAlarmScheduler.notificationId(taskId), notification)
  }

  companion object {
    const val CHANNEL_ID = "tapost_session_alarm_v1"
  }
}
