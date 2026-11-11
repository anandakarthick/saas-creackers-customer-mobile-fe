package com.saasmobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.tts.TextToSpeech
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.util.Locale

/**
 * Native FCM service that handles push messages EVEN WHEN THE APP IS KILLED.
 *
 * When Android delivers an FCM message with a `notification` key, it auto-shows
 * a system notification. But for our full-screen alert popup + TTS, we need
 * this native service.
 *
 * This runs in the app's process (which Android starts to handle the FCM message)
 * even if the user swiped the app from recents.
 *
 * For data-only messages: onMessageReceived is always called.
 * For notification+data messages: onMessageReceived is called when app is in
 * foreground; in background/killed, Android auto-shows the notification but
 * ALSO calls onMessageReceived if data is present.
 *
 * NOTE: On some Android versions with notification+data messages, Android
 * might NOT call onMessageReceived when killed. The fallback is the
 * auto-displayed system notification from the `notification` key.
 */
class OrderFCMService : FirebaseMessagingService() {

    companion object {
        private const val ALERT_CHANNEL_ID = "order_alert_fullscreen"
        private const val ALERT_NOTIFICATION_ID = 99999
        private var tts: TextToSpeech? = null
        private var ttsReady = false
        private var alertLoopRunnable: Runnable? = null
        private var isAlertActive = false
        private val handler = Handler(Looper.getMainLooper())
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val data = remoteMessage.data
        android.util.Log.d("OrderFCMService", "FCM received: ${data}")

        val notifType = (data["type"] ?: "").lowercase()

        if (notifType == "order") {
            android.util.Log.d("OrderFCMService", "Order notification — launching full-screen alert")

            val orderNumber = data["orderNumber"] ?: data["order_number"] ?: ""
            val orderId = data["orderId"] ?: data["order_id"] ?: data["id"] ?: ""
            val totalRaw = data["total"] ?: ""
            val currency = data["currency"] ?: "₹"
            val formattedTotal = if (totalRaw.isNotEmpty()) {
                try { "${currency}${String.format("%,.2f", totalRaw.toDouble())}" }
                catch (_: Exception) { "${currency}${totalRaw}" }
            } else ""
            val customerName = data["customerName"] ?: data["customer_name"] ?: "Customer"
            val itemsCount = try { (data["itemsCount"] ?: data["distinctItems"] ?: "1").toInt() } catch (_: Exception) { 1 }
            val paymentMethod = (data["paymentMethod"] ?: "COD").uppercase()
            val primaryColor = data["primaryColor"] ?: "#DC2626"
            val secondaryColor = data["secondaryColor"] ?: "#9333EA"

            // Set static fields on OrderAlertActivity
            OrderAlertActivity.orderNumber = orderNumber
            OrderAlertActivity.orderId = orderId
            OrderAlertActivity.total = formattedTotal
            OrderAlertActivity.customerName = customerName
            OrderAlertActivity.itemsCount = itemsCount
            OrderAlertActivity.paymentMethod = paymentMethod
            OrderAlertActivity.primaryColorStr = primaryColor
            OrderAlertActivity.secondaryColorStr = secondaryColor

            // Register stop callback
            AlertModuleHelper.onStopAlert = {
                handler.post {
                    stopTTS()
                    cancelNotification()
                }
            }

            // Wake screen
            try { wakeScreen() } catch (_: Exception) {}

            // Vibrate
            try { vibrate() } catch (_: Exception) {}

            // Start TTS loop
            try { startTTSLoop() } catch (_: Exception) {}

            // Launch full-screen intent notification
            try { launchFullScreenAlert(orderNumber, formattedTotal, customerName) } catch (e: Exception) {
                android.util.Log.e("OrderFCMService", "Full-screen alert failed", e)
            }
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        android.util.Log.d("OrderFCMService", "New FCM token: ${token.take(20)}...")
        // Token refresh is handled by React Native's messaging().onTokenRefresh
    }

    private fun launchFullScreenAlert(orderNumber: String, total: String, customerName: String) {
        // Ensure channel exists
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                ALERT_CHANNEL_ID,
                "Order Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Full-screen order alert notifications"
                setShowBadge(true)
                enableVibration(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }

        // Intent to launch OrderAlertActivity
        val alertIntent = Intent(this, OrderAlertActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_NO_USER_ACTION or
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
        }

        val pendingIntent = PendingIntent.getActivity(
            this, ALERT_NOTIFICATION_ID, alertIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val dismissIntent = Intent(this, AlertDismissReceiver::class.java)
        val dismissPendingIntent = PendingIntent.getBroadcast(
            this, ALERT_NOTIFICATION_ID + 1, dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val totalDisplay = if (total.isNotEmpty()) " - $total" else ""
        val notification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("New Order #$orderNumber")
            .setContentText("$customerName$totalDisplay")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(0, "View Order", pendingIntent)
            .addAction(0, "Dismiss", dismissPendingIntent)
            .setFullScreenIntent(pendingIntent, true)
            .build()

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(ALERT_NOTIFICATION_ID, notification)

        android.util.Log.d("OrderFCMService", "Full-screen intent notification posted")
    }

    private fun wakeScreen() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        @Suppress("DEPRECATION")
        val wl = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "com.saasmobile:fcmalert"
        )
        wl.acquire(30_000)
    }

    private fun vibrate() {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        val pattern = longArrayOf(0, 500, 300, 500, 300, 500)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }
    }

    private fun startTTSLoop() {
        if (isAlertActive) return

        // Initialize TTS if not already
        if (tts == null) {
            tts = TextToSpeech(applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.language = Locale.US
                    try {
                        val audioAttrs = android.media.AudioAttributes.Builder()
                            .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                        tts?.setAudioAttributes(audioAttrs)
                    } catch (_: Exception) {}
                    ttsReady = true
                    // Speak immediately once ready
                    speak()
                    startLoop()
                }
            }
        } else if (ttsReady) {
            speak()
            startLoop()
        }
    }

    private fun startLoop() {
        isAlertActive = true
        alertLoopRunnable = object : Runnable {
            override fun run() {
                if (!isAlertActive) return
                speak()
                handler.postDelayed(this, 4000)
            }
        }
        handler.postDelayed(alertLoopRunnable!!, 4000)
    }

    private fun speak() {
        if (!ttsReady || tts == null) return
        try {
            tts?.speak("New order received!", TextToSpeech.QUEUE_FLUSH, null,
                "order_${System.nanoTime()}")
        } catch (_: Exception) {}
    }

    private fun stopTTS() {
        isAlertActive = false
        alertLoopRunnable?.let { handler.removeCallbacks(it) }
        alertLoopRunnable = null
        try { tts?.stop() } catch (_: Exception) {}
    }

    private fun cancelNotification() {
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(ALERT_NOTIFICATION_ID)
        } catch (_: Exception) {}
    }
}
