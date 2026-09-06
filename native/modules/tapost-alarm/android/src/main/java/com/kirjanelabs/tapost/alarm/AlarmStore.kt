package com.kirjanelabs.tapost.alarm

import android.content.Context
import org.json.JSONObject

object AlarmStore {
  private const val PREFS = "tapost_native_alarm_v1"
  private const val ACTIVE = "active_alarm"

  fun save(context: Context, record: AlarmRecord) {
    val payload = JSONObject()
      .put("taskId", record.taskId)
      .put("title", record.title)
      .put("targetEndMs", record.targetEndMs)
      .toString()

    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(ACTIVE, payload)
      .apply()
  }

  fun load(context: Context): AlarmRecord? {
    val payload = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(ACTIVE, null) ?: return null

    return try {
      val json = JSONObject(payload)
      AlarmRecord(
        taskId = json.getString("taskId"),
        title = json.getString("title"),
        targetEndMs = json.getLong("targetEndMs"),
      )
    } catch (_: Exception) {
      clear(context)
      null
    }
  }

  fun clear(context: Context, taskId: String? = null) {
    if (taskId != null) {
      val current = load(context)
      if (current != null && current.taskId != taskId) return
    }
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .remove(ACTIVE)
      .apply()
  }
}
