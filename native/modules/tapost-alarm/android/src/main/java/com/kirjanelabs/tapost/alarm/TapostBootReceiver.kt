package com.kirjanelabs.tapost.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TapostBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    val record = AlarmStore.load(context) ?: return
    TapostAlarmScheduler.schedule(context, record)
  }
}
