package com.kirjanelabs.tapost.alarm

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TapostAlarmModule : Module() {
  private fun context(): Context = appContext.reactContext
    ?: throw IllegalStateException("TapostAlarm requires an Android React context")

  override fun definition() = ModuleDefinition {
    Name("TapostAlarm")

    Function("schedule") { taskId: String, title: String, targetEndMs: Double ->
      val result = TapostAlarmScheduler.schedule(
        context(),
        AlarmRecord(taskId, title, targetEndMs.toLong()),
      )
      result.record.toMap() + mapOf("exact" to result.exact)
    }

    Function("cancel") { taskId: String ->
      TapostAlarmScheduler.cancel(context(), taskId)
    }

    Function("stopPresentation") { taskId: String ->
      TapostAlarmScheduler.stopPresentation(context(), taskId)
    }

    Function("getScheduledAlarm") {
      AlarmStore.load(context())?.toMap()
    }

    Function("getExactAlarmPermissionState") {
      TapostAlarmScheduler.exactPermissionState(context())
    }

    AsyncFunction("openExactAlarmSettings") {
      TapostAlarmScheduler.openExactAlarmSettings(context())
    }
  }
}
