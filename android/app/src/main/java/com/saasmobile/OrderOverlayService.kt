package com.saasmobile

import android.app.*
import android.content.*
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.media.*
import android.net.Uri
import android.os.*
import android.provider.Settings
import android.util.TypedValue
import android.view.*
import android.widget.*
import androidx.core.app.NotificationCompat

/**
 * A foreground service that shows a floating overlay window on top of ALL
 * apps — just like an incoming phone-call screen.
 *
 * Works when:
 *  - App is in foreground
 *  - App is in background (user is in another app)
 *  - Phone is locked / screen is off (wakes screen first)
 *
 * Requires SYSTEM_ALERT_WINDOW permission (already declared in manifest;
 * the JS side should call Settings.canDrawOverlays() and prompt if needed).
 */
class OrderOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var mediaPlayer: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var autoDismissRunnable: Runnable? = null

    companion object {
        const val FOREGROUND_NOTIF_ID = 9998
        const val CHANNEL_ID = "order_overlay_svc"
        const val EXTRA_TITLE = "title"
        const val EXTRA_BODY = "body"
        const val EXTRA_ORDER_NUMBER = "orderNumber"
        const val EXTRA_TOTAL = "total"
        const val EXTRA_CUSTOMER = "customerName"
        const val EXTRA_ITEMS = "itemsCount"
        const val EXTRA_PAYMENT = "paymentMethod"
    }

    // ── Service lifecycle ──────────────────────────────────────────────

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // If an overlay is already showing, remove it first
        removeOverlay()

        // Foreground-service notification (required on Android 8+)
        createServiceChannel()
        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("New Order Alert")
            .setContentText("Tap to open app")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
        startForeground(FOREGROUND_NOTIF_ID, notif)

        // Wake the screen
        wakeScreen()

        // Extract order details
        val title = intent?.getStringExtra(EXTRA_TITLE) ?: "New Order!"
        val body = intent?.getStringExtra(EXTRA_BODY) ?: ""
        val orderNumber = intent?.getStringExtra(EXTRA_ORDER_NUMBER) ?: ""
        val total = intent?.getStringExtra(EXTRA_TOTAL) ?: ""
        val customerName = intent?.getStringExtra(EXTRA_CUSTOMER) ?: "Customer"
        val itemsCount = intent?.getIntExtra(EXTRA_ITEMS, 1) ?: 1
        val paymentMethod = intent?.getStringExtra(EXTRA_PAYMENT) ?: "COD"

        // Show overlay + play sound
        showOverlay(title, orderNumber, total, customerName, itemsCount, paymentMethod)
        playSound()
        vibrate()

        // Auto-dismiss after 60 seconds
        autoDismissRunnable = Runnable { dismissAndStop() }
        handler.postDelayed(autoDismissRunnable!!, 60_000)

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        removeOverlay()
        stopSound()
        autoDismissRunnable?.let { handler.removeCallbacks(it) }
        super.onDestroy()
    }

    // ── Notification channel for the foreground service ────────────────

    private fun createServiceChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(
                CHANNEL_ID,
                "Order Alert Overlay",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the order alert overlay visible"
                setSound(null, null)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(chan)
        }
    }

    // ── Wake screen ───────────────────────────────────────────────────

    private fun wakeScreen() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            @Suppress("DEPRECATION")
            val wl = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
                "com.saasmobile:order_overlay_wake"
            )
            wl.acquire(15_000) // 15 seconds

            // Keyguard dismissal is handled by the overlay flags
            // (FLAG_SHOW_WHEN_LOCKED + FLAG_DISMISS_KEYGUARD)
        } catch (e: Exception) {
            android.util.Log.w("OrderOverlay", "wakeScreen failed", e)
        }
    }

    // ── Sound via MediaPlayer (ALARM stream → always audible) ─────────

    private fun playSound() {
        try {
            stopSound()

            val resId = resources.getIdentifier("notification_sound", "raw", packageName)
            if (resId == 0) {
                android.util.Log.w("OrderOverlay", "notification_sound resource not found, using default")
                playDefaultSound()
                return
            }

            mediaPlayer = MediaPlayer().apply {
                // Set audio attributes BEFORE setDataSource — this ensures
                // the ALARM stream is used (loud, not mutable by DND).
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )

                // Load from raw resource
                val afd = resources.openRawResourceFd(resId) ?: return@apply
                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                afd.close()

                setOnCompletionListener { mp ->
                    mp.release()
                    mediaPlayer = null
                }
                setOnErrorListener { mp, _, _ ->
                    android.util.Log.w("OrderOverlay", "MediaPlayer error, falling back to default")
                    mp.release()
                    mediaPlayer = null
                    playDefaultSound()
                    true
                }

                prepare()
                start()
            }

            android.util.Log.d("OrderOverlay", "Playing notification_sound via ALARM stream")
        } catch (e: Exception) {
            android.util.Log.e("OrderOverlay", "playSound failed", e)
            playDefaultSound()
        }
    }

    private fun playDefaultSound() {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val ringtone = RingtoneManager.getRingtone(this, uri)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ringtone.isLooping = false
            }
            ringtone.play()
            // Stop after 5 seconds
            handler.postDelayed({ try { ringtone.stop() } catch (_: Exception) {} }, 5000)
        } catch (e: Exception) {
            android.util.Log.e("OrderOverlay", "playDefaultSound failed", e)
        }
    }

    private fun stopSound() {
        try {
            mediaPlayer?.apply {
                if (isPlaying) stop()
                release()
            }
            mediaPlayer = null
        } catch (_: Exception) {}
    }

    // ── Vibrate ───────────────────────────────────────────────────────

    private fun vibrate() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            // Vibrate pattern similar to phone call: buzz, pause, buzz, pause, buzz
            val pattern = longArrayOf(0, 500, 300, 500, 300, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, -1)
            }
        } catch (e: Exception) {
            android.util.Log.w("OrderOverlay", "vibrate failed", e)
        }
    }

    // ── Overlay window (the call-screen-like popup) ───────────────────

    private fun showOverlay(
        title: String,
        orderNumber: String,
        total: String,
        customerName: String,
        itemsCount: Int,
        paymentMethod: String
    ) {
        if (!Settings.canDrawOverlays(this)) {
            android.util.Log.w("OrderOverlay", "SYSTEM_ALERT_WINDOW not granted, can't show overlay")
            return
        }

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = 0 // top of screen
        }

        overlayView = buildOverlayUI(title, orderNumber, total, customerName, itemsCount, paymentMethod)

        try {
            windowManager?.addView(overlayView, params)
            android.util.Log.d("OrderOverlay", "Overlay shown for order: $orderNumber")
        } catch (e: Exception) {
            android.util.Log.e("OrderOverlay", "Failed to add overlay view", e)
        }
    }

    /**
     * Build the overlay UI programmatically (no XML layout needed).
     * Looks like a call-screen card at the top of the screen.
     */
    private fun buildOverlayUI(
        title: String,
        orderNumber: String,
        total: String,
        customerName: String,
        itemsCount: Int,
        paymentMethod: String
    ): View {
        val ctx = this
        val density = resources.displayMetrics.density

        fun dp(value: Int) = (value * density).toInt()
        fun sp(value: Float) = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_SP, value, resources.displayMetrics
        )

        // ── Root container ──
        val root = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(48), dp(12), dp(12)) // top padding for status bar
        }

        // ── Card wrapper ──
        val card = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            val bg = GradientDrawable().apply {
                cornerRadius = dp(20).toFloat()
                setColor(Color.WHITE)
            }
            background = bg
            elevation = dp(16).toFloat()
            clipToPadding = false
        }

        // ── Header gradient bar ──
        val header = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(20), dp(16), dp(20), dp(16))
            val bg = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.parseColor("#FF6B35"), Color.parseColor("#F7931E"))
            )
            bg.cornerRadii = floatArrayOf(
                dp(20).toFloat(), dp(20).toFloat(), // top-left
                dp(20).toFloat(), dp(20).toFloat(), // top-right
                0f, 0f, // bottom-right
                0f, 0f  // bottom-left
            )
            background = bg
        }

        // Bell icon (Unicode bell) + title
        val bellIcon = TextView(ctx).apply {
            text = "🔔" // bell emoji
            textSize = 20f
        }

        val headerTextContainer = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), 0, 0, 0)
        }

        val headerTitle = TextView(ctx).apply {
            text = "NEW ORDER"
            setTextColor(Color.WHITE)
            textSize = 16f
            setTypeface(typeface, Typeface.BOLD)
            letterSpacing = 0.05f
        }

        val headerSubtitle = TextView(ctx).apply {
            text = "just now"
            setTextColor(Color.parseColor("#FFFFFFB3"))
            textSize = 11f
        }

        headerTextContainer.addView(headerTitle)
        headerTextContainer.addView(headerSubtitle)

        val headerLeftContainer = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        headerLeftContainer.addView(bellIcon)
        headerLeftContainer.addView(headerTextContainer)

        // Close button
        val closeBtn = TextView(ctx).apply {
            text = "✕" // X symbol
            setTextColor(Color.parseColor("#FFFFFFCC"))
            textSize = 20f
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(8), dp(8), dp(8))
            setOnClickListener { dismissAndStop() }
        }

        header.addView(headerLeftContainer)
        header.addView(closeBtn)
        card.addView(header)

        // ── Body ──
        val body = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(16), dp(20), dp(20))
            setBackgroundColor(Color.WHITE)
        }

        // Order number + total row
        val orderRow = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }

        val orderCol = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        orderCol.addView(TextView(ctx).apply {
            text = "ORDER"
            setTextColor(Color.parseColor("#999999"))
            textSize = 10f
            setTypeface(typeface, Typeface.BOLD)
            letterSpacing = 0.05f
        })
        orderCol.addView(TextView(ctx).apply {
            text = "#$orderNumber"
            setTextColor(Color.parseColor("#222222"))
            textSize = 20f
            setTypeface(typeface, Typeface.BOLD)
        })

        val totalCol = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.END
        }
        totalCol.addView(TextView(ctx).apply {
            text = "TOTAL"
            setTextColor(Color.parseColor("#999999"))
            textSize = 10f
            setTypeface(typeface, Typeface.BOLD)
            letterSpacing = 0.05f
            gravity = Gravity.END
        })
        totalCol.addView(TextView(ctx).apply {
            text = total.ifEmpty { "N/A" }
            setTextColor(Color.parseColor("#FF6B35"))
            textSize = 22f
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.END
        })

        orderRow.addView(orderCol)
        orderRow.addView(totalCol)
        body.addView(orderRow)

        // Customer info row
        val customerRow = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), dp(10), dp(14), dp(10))
            val bg = GradientDrawable().apply {
                cornerRadius = dp(12).toFloat()
                setColor(Color.parseColor("#F8F8F8"))
                setStroke(1, Color.parseColor("#EEEEEE"))
            }
            background = bg
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }
        customerRow.addView(TextView(ctx).apply {
            text = "👤" // bust silhouette emoji
            textSize = 16f
            setPadding(0, 0, dp(8), 0)
        })
        customerRow.addView(TextView(ctx).apply {
            text = customerName
            setTextColor(Color.parseColor("#333333"))
            textSize = 14f
            setTypeface(typeface, Typeface.BOLD)
        })
        body.addView(customerRow)

        // Meta row (items + payment)
        val metaRow = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(16) }
        }

        fun metaBox(icon: String, label: String, value: String): LinearLayout {
            return LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(12), dp(10), dp(12), dp(10))
                val bg = GradientDrawable().apply {
                    cornerRadius = dp(10).toFloat()
                    setColor(Color.parseColor("#F8F8F8"))
                    setStroke(1, Color.parseColor("#EEEEEE"))
                }
                background = bg
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                    marginEnd = dp(6)
                    marginStart = dp(6)
                }

                addView(TextView(ctx).apply {
                    text = icon
                    textSize = 14f
                    setPadding(0, 0, dp(6), 0)
                })

                val textCol = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
                textCol.addView(TextView(ctx).apply {
                    text = label
                    setTextColor(Color.parseColor("#999999"))
                    textSize = 10f
                })
                textCol.addView(TextView(ctx).apply {
                    text = value
                    setTextColor(Color.parseColor("#333333"))
                    textSize = 13f
                    setTypeface(typeface, Typeface.BOLD)
                })
                addView(textCol)
            }
        }

        metaRow.addView(metaBox("📦", "Items", "$itemsCount unit${if (itemsCount != 1) "s" else ""}"))
        metaRow.addView(metaBox("💳", "Payment", paymentMethod))
        body.addView(metaRow)

        // ── Action buttons ──
        val actionRow = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }

        // View Order button (green)
        val viewBtn = TextView(ctx).apply {
            text = "👁  View Order"
            setTextColor(Color.WHITE)
            textSize = 15f
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(16), dp(14), dp(16), dp(14))
            val bg = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#FF6B35"))
            }
            background = bg
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginEnd = dp(8)
            }
            setOnClickListener {
                // Open the app
                openApp()
                dismissAndStop()
            }
        }

        // Dismiss button
        val dismissBtn = TextView(ctx).apply {
            text = "Dismiss"
            setTextColor(Color.parseColor("#666666"))
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(dp(20), dp(14), dp(20), dp(14))
            val bg = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#F0F0F0"))
                setStroke(1, Color.parseColor("#DDDDDD"))
            }
            background = bg
            setOnClickListener { dismissAndStop() }
        }

        actionRow.addView(viewBtn)
        actionRow.addView(dismissBtn)
        body.addView(actionRow)

        // Round the bottom corners of body
        val bodyBg = GradientDrawable().apply {
            setColor(Color.WHITE)
            cornerRadii = floatArrayOf(
                0f, 0f,
                0f, 0f,
                dp(20).toFloat(), dp(20).toFloat(),
                dp(20).toFloat(), dp(20).toFloat()
            )
        }
        body.background = bodyBg

        card.addView(body)
        root.addView(card)

        return root
    }

    // ── Open the main app ─────────────────────────────────────────────

    private fun openApp() {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }
            if (intent != null) startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.w("OrderOverlay", "openApp failed", e)
        }
    }

    // ── Cleanup ───────────────────────────────────────────────────────

    private fun removeOverlay() {
        try {
            overlayView?.let { v ->
                windowManager?.removeView(v)
            }
        } catch (_: Exception) {}
        overlayView = null
    }

    private fun dismissAndStop() {
        removeOverlay()
        stopSound()
        stopForeground(true)
        stopSelf()
    }
}
