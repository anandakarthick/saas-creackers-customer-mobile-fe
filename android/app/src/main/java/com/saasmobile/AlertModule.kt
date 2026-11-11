package com.saasmobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.speech.tts.TextToSpeech
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import java.util.Locale

class AlertModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaPlayer: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var alertLoopRunnable: Runnable? = null
    private var isAlertActive = false

    companion object {
        private const val ALERT_CHANNEL_ID = "order_alert_fullscreen"
        private const val ALERT_NOTIFICATION_ID = 99999
    }

    override fun getName() = "AlertModule"

    init {
        try {
            tts = TextToSpeech(reactContext.applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.language = Locale.US
                    try {
                        val audioAttrs = AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                        tts?.setAudioAttributes(audioAttrs)
                    } catch (_: Exception) {}
                    ttsReady = true
                    android.util.Log.d("AlertModule", "TTS initialized with ALARM stream")
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("AlertModule", "TTS init failed", e)
        }

        // Create the full-screen alert notification channel
        createAlertChannel()
    }

    /**
     * Create a notification channel specifically for full-screen alert intents.
     * This channel uses MAX importance so the notification can launch our
     * full-screen Activity (like phone calls and alarms).
     */
    private fun createAlertChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
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
                val nm = reactContext.applicationContext
                    .getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.createNotificationChannel(channel)
            } catch (e: Exception) {
                android.util.Log.w("AlertModule", "createAlertChannel failed", e)
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  showOrderOverlay — uses full-screen intent notification
    //  This is the ONLY Android-approved way to show a UI from background.
    //  Same mechanism as phone call apps and alarm clocks.
    // ══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun showOrderOverlay(options: ReadableMap) {
        val title = safeString(options, "title", "New Order!")
        val orderNumber = safeString(options, "orderNumber", "")
        val orderId = safeString(options, "orderId", "")
        val total = safeString(options, "total", "")
        val customerName = safeString(options, "customerName", "Customer")
        val itemsCount = safeInt(options, "itemsCount", 1)
        val paymentMethod = safeString(options, "paymentMethod", "COD")
        val primaryColor = safeString(options, "primaryColor", "#DC2626")
        val secondaryColor = safeString(options, "secondaryColor", "#9333EA")

        android.util.Log.d("AlertModule", "showOrderOverlay: order=$orderNumber orderId=$orderId total=$total")

        // Register stop callback so Activity can stop TTS + dismiss notification
        AlertModuleHelper.onStopAlert = {
            handler.post {
                stopAlertLoop()
                cancelAlertNotification()
            }
        }

        handler.post {
            // ── Wake screen ──
            try { wakeScreenInternal() } catch (e: Exception) {
                android.util.Log.w("AlertModule", "wakeScreen error", e)
            }

            // ── Vibrate ──
            try { vibrateInternal() } catch (e: Exception) {
                android.util.Log.w("AlertModule", "vibrate error", e)
            }

            // ── Start looping TTS ──
            try { startAlertLoop() } catch (e: Exception) {
                android.util.Log.w("AlertModule", "startAlertLoop error", e)
            }

            // ── Set static fields on the Activity ──
            OrderAlertActivity.orderNumber = orderNumber
            OrderAlertActivity.orderId = orderId
            OrderAlertActivity.total = total
            OrderAlertActivity.customerName = customerName
            OrderAlertActivity.itemsCount = itemsCount
            OrderAlertActivity.paymentMethod = paymentMethod
            OrderAlertActivity.primaryColorStr = primaryColor
            OrderAlertActivity.secondaryColorStr = secondaryColor

            // ── Launch via full-screen intent notification ──
            // This is how phone call apps work on Android 10+.
            // The notification's fullScreenIntent launches our Activity
            // even when the app is in the background, on lock screen, etc.
            try {
                launchViaFullScreenIntent(orderNumber, total, customerName)
            } catch (e: Exception) {
                android.util.Log.e("AlertModule", "fullScreenIntent failed, trying direct launch", e)
                // Fallback: try direct Activity launch (works when app is foreground)
                try {
                    val appCtx = reactContext.applicationContext
                    OrderAlertActivity.launch(appCtx, orderNumber, orderId, total,
                        customerName, itemsCount, paymentMethod, primaryColor, secondaryColor)
                } catch (e2: Exception) {
                    android.util.Log.e("AlertModule", "Direct launch also failed", e2)
                }
            }
        }
    }

    /**
     * Post a notification with fullScreenIntent that launches OrderAlertActivity.
     *
     * On Android 10+:
     * - If screen is OFF or device is LOCKED → Activity launches immediately (full-screen)
     * - If user is actively using the phone → heads-up notification appears
     *   (but we also try direct Activity launch as fallback)
     *
     * This is the SAME mechanism phone call apps and alarm clocks use.
     * Requires USE_FULL_SCREEN_INTENT permission (declared in manifest).
     */
    private fun launchViaFullScreenIntent(orderNumber: String, total: String, customerName: String) {
        val appCtx = reactContext.applicationContext

        // Intent to launch OrderAlertActivity
        val alertIntent = Intent(appCtx, OrderAlertActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_NO_USER_ACTION or
                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
        }

        val pendingIntent = PendingIntent.getActivity(
            appCtx, ALERT_NOTIFICATION_ID, alertIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Dismiss intent (cancel notification + stop TTS)
        val dismissIntent = Intent(appCtx, AlertDismissReceiver::class.java)
        val dismissPendingIntent = PendingIntent.getBroadcast(
            appCtx, ALERT_NOTIFICATION_ID + 1, dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val totalDisplay = if (total.isNotEmpty()) " - $total" else ""
        val notification = NotificationCompat.Builder(appCtx, ALERT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("New Order #$orderNumber")
            .setContentText("$customerName$totalDisplay")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOngoing(true) // Can't be swiped away — must tap View/Dismiss
            .setContentIntent(pendingIntent)
            .addAction(0, "View Order", pendingIntent)
            .addAction(0, "Dismiss", dismissPendingIntent)
            // ── THE KEY: fullScreenIntent ──
            // This tells Android to launch our Activity when the screen
            // is off or locked. Same as incoming phone calls.
            .setFullScreenIntent(pendingIntent, true)
            .build()

        val nm = appCtx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(ALERT_NOTIFICATION_ID, notification)

        android.util.Log.d("AlertModule", "Full-screen intent notification posted ✓")

        // Also try direct Activity launch (works when app is in foreground)
        // The fullScreenIntent handles lock screen / background cases
        try {
            val pm = appCtx.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (pm.isInteractive) {
                // Screen is on — try direct launch too (belt & suspenders)
                alertIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                appCtx.startActivity(alertIntent)
                android.util.Log.d("AlertModule", "Direct Activity launch attempted (screen on)")
            }
        } catch (e: Exception) {
            // Expected on Android 10+ when app is in background
            android.util.Log.d("AlertModule", "Direct launch skipped (background restriction): ${e.message}")
        }
    }

    private fun cancelAlertNotification() {
        try {
            val nm = reactContext.applicationContext
                .getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(ALERT_NOTIFICATION_ID)
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun dismissOrderOverlay() {
        handler.post {
            try { stopAlertLoop() } catch (_: Exception) {}
            cancelAlertNotification()
        }
    }

    @ReactMethod
    fun stopAlert() {
        handler.post {
            try { stopAlertLoop() } catch (_: Exception) {}
            cancelAlertNotification()
        }
    }

    @ReactMethod
    fun playNotificationSound() {
        try {
            stopSoundInternal()
            val context = reactContext.applicationContext
            val resId = context.resources.getIdentifier("notification_sound", "raw", context.packageName)

            if (resId == 0) {
                android.util.Log.w("AlertModule", "notification_sound not found")
                playDefaultSound()
                return
            }

            ensureVolumeUp(context)

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                val afd = context.resources.openRawResourceFd(resId)
                if (afd != null) {
                    setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    afd.close()
                    setOnCompletionListener { mp -> mp.release(); mediaPlayer = null }
                    setOnErrorListener { mp, _, _ -> mp.release(); mediaPlayer = null; true }
                    prepare()
                    start()
                    android.util.Log.d("AlertModule", "Playing notification_sound")
                } else {
                    release()
                    mediaPlayer = null
                    playDefaultSound()
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("AlertModule", "playNotificationSound error", e)
            try { playDefaultSound() } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun stopSound() {
        stopSoundInternal()
    }

    @ReactMethod
    fun vibrate() {
        try { vibrateInternal() } catch (_: Exception) {}
    }

    @ReactMethod
    fun wakeScreen() {
        try { wakeScreenInternal() } catch (_: Exception) {}
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            promise.resolve(Settings.canDrawOverlays(reactContext.applicationContext))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestOverlayPermission() {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactContext.packageName}")
            ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.w("AlertModule", "requestOverlayPermission failed", e)
        }
    }

    @ReactMethod
    fun openBatteryOptimization() {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(reactContext.packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
            }
        } catch (e: Exception) {
            android.util.Log.w("AlertModule", "openBatteryOptimization failed", e)
            try {
                reactContext.startActivity(
                    Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                        .apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                )
            } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun isBatteryOptimizationDisabled(promise: Promise) {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  INTERNAL — Looping TTS alert (same as web app SpeechSynthesis)
    // ══════════════════════════════════════════════════════════════════

    private fun startAlertLoop() {
        if (isAlertActive) return
        isAlertActive = true

        speakNewOrder()
        alertLoopRunnable = object : Runnable {
            override fun run() {
                if (!isAlertActive) return
                speakNewOrder()
                handler.postDelayed(this, 4000)
            }
        }
        handler.postDelayed(alertLoopRunnable!!, 4000)
    }

    private fun stopAlertLoop() {
        isAlertActive = false
        alertLoopRunnable?.let { handler.removeCallbacks(it) }
        alertLoopRunnable = null
        try { tts?.stop() } catch (_: Exception) {}
        stopSoundInternal()
    }

    private fun speakNewOrder() {
        if (!ttsReady || tts == null) return
        try {
            tts?.speak("New order received!", TextToSpeech.QUEUE_FLUSH, null,
                "order_${System.nanoTime()}")
        } catch (_: Exception) {}
    }

    // ══════════════════════════════════════════════════════════════════
    //  INTERNAL — helpers
    // ══════════════════════════════════════════════════════════════════

    private fun wakeScreenInternal() {
        val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        @Suppress("DEPRECATION")
        val wl = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "com.saasmobile:alert"
        )
        wl.acquire(30_000)
    }

    private fun vibrateInternal() {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (reactContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            reactContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        val pattern = longArrayOf(0, 500, 300, 500, 300, 500)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }
    }

    private fun stopSoundInternal() {
        try { mediaPlayer?.apply { if (isPlaying) stop(); release() }; mediaPlayer = null } catch (_: Exception) {}
    }

    private fun ensureVolumeUp(context: Context) {
        try {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val vol = am.getStreamVolume(AudioManager.STREAM_ALARM)
            val max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            if (vol == 0 && max > 0) am.setStreamVolume(AudioManager.STREAM_ALARM, (max * 0.7).toInt(), 0)
        } catch (_: Exception) {}
    }

    private fun playDefaultSound() {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION) ?: return
            val ringtone = RingtoneManager.getRingtone(reactContext.applicationContext, uri)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) ringtone.isLooping = false
            ringtone.play()
            handler.postDelayed({ try { ringtone.stop() } catch (_: Exception) {} }, 5000)
        } catch (_: Exception) {}
    }

    // Safe ReadableMap access — prevents crashes from type mismatches
    private fun safeString(map: ReadableMap, key: String, default: String): String {
        return try {
            if (map.hasKey(key) && !map.isNull(key)) map.getString(key) ?: default else default
        } catch (_: Exception) { default }
    }

    private fun safeInt(map: ReadableMap, key: String, default: Int): Int {
        return try {
            if (map.hasKey(key) && !map.isNull(key)) {
                try { map.getInt(key) } catch (_: Exception) {
                    try { map.getDouble(key).toInt() } catch (_: Exception) {
                        try { map.getString(key)?.toIntOrNull() ?: default } catch (_: Exception) { default }
                    }
                }
            } else default
        } catch (_: Exception) { default }
    }

    override fun invalidate() {
        handler.post {
            stopAlertLoop()
            cancelAlertNotification()
        }
        try { tts?.shutdown() } catch (_: Exception) {}
        tts = null
        super.invalidate()
    }
}
