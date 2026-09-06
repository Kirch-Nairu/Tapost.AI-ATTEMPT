package com.kirjanelabs.tapost.alarm

data class AlarmRecord(
  val taskId: String,
  val title: String,
  val targetEndMs: Long,
) {
  fun toMap(): Map<String, Any> = mapOf(
    "taskId" to taskId,
    "title" to title,
    "targetEndMs" to targetEndMs.toDouble(),
  )
}
