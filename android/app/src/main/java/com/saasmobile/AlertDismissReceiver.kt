package com.saasmobile

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * BroadcastReceiver that handles the "Dismiss" action on the
 * full-screen alert notification. Stops the TTS loop and
 * cancels the notification.
 */
class AlertDismissReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        android.util.Log.d("AlertDismissReceiver", "Dismiss action received")

        // Stop the TTS alert loop
        AlertModuleHelper.stopAlert()

        // Cancel the notification
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(99999) // ALERT_NOTIFICATION_ID
        } catch (_: Exception) {}
    }
}
