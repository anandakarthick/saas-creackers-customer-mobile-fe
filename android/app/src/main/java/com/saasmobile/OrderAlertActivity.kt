package com.saasmobile

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.*
import android.widget.*

/**
 * Full-screen Activity that shows the order alert popup.
 * Works over the lock screen, over other apps, everywhere.
 * This is how phone call screens work on Android.
 */
class OrderAlertActivity : Activity() {

    companion object {
        var orderNumber: String = ""
        var orderId: String = ""
        var total: String = ""
        var customerName: String = "Customer"
        var itemsCount: Int = 1
        var paymentMethod: String = "COD"
        var primaryColorStr: String = "#DC2626"
        var secondaryColorStr: String = "#9333EA"

        fun launch(context: Context, ordNum: String, ordId: String, tot: String,
                   custName: String, items: Int, payment: String,
                   primary: String, secondary: String) {
            orderNumber = ordNum
            orderId = ordId
            total = tot
            customerName = custName
            itemsCount = items
            paymentMethod = payment
            primaryColorStr = primary
            secondaryColorStr = secondary

            try {
                val intent = Intent(context, OrderAlertActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                        Intent.FLAG_ACTIVITY_NO_HISTORY or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                context.startActivity(intent)
                android.util.Log.d("OrderAlertActivity", "Activity launched ✓")
            } catch (e: Exception) {
                android.util.Log.e("OrderAlertActivity", "Failed to launch", e)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        android.util.Log.d("OrderAlertActivity", "onCreate — showing alert for order #$orderNumber")

        try {
            // ── Show over lock screen WITHOUT dismissing the keyguard ──
            // The alert shows on top of the lock screen.
            // When user taps "View Order", they get the unlock screen first.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)
            }
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_FULLSCREEN
            )

            setContentView(buildUI())
        } catch (e: Exception) {
            android.util.Log.e("OrderAlertActivity", "onCreate failed", e)
            finish()
        }
    }

    private fun buildUI(): View {
        val density = resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        val pColor = try { Color.parseColor(primaryColorStr) } catch (_: Exception) { Color.parseColor("#DC2626") }
        val sColor = try { Color.parseColor(secondaryColorStr) } catch (_: Exception) { Color.parseColor("#9333EA") }

        // Semi-transparent full-screen backdrop
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#AA000000"))
        }

        val scrollView = ScrollView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply { gravity = Gravity.TOP }
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(50), dp(16), dp(16))
        }

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                cornerRadius = dp(20).toFloat()
                setColor(Color.WHITE)
            }
            elevation = dp(24).toFloat()
        }

        // ── Header gradient ──
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(20), dp(18), dp(20), dp(18))
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(pColor, sColor)
            ).apply {
                cornerRadii = floatArrayOf(
                    dp(20).toFloat(), dp(20).toFloat(),
                    dp(20).toFloat(), dp(20).toFloat(),
                    0f, 0f, 0f, 0f
                )
            }
        }

        val hLeft = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        hLeft.addView(TextView(this).apply { text = "🔔"; textSize = 22f })
        val hCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), 0, 0, 0)
        }
        hCol.addView(TextView(this).apply {
            text = "NEW ORDER"; setTextColor(Color.WHITE); textSize = 17f
            setTypeface(typeface, Typeface.BOLD)
        })
        hCol.addView(TextView(this).apply {
            text = "just now"; setTextColor(Color.parseColor("#FFFFFFB3")); textSize = 11f
        })
        hLeft.addView(hCol)

        val closeBtn = TextView(this).apply {
            text = "✕"; setTextColor(Color.WHITE)
            textSize = 22f; gravity = Gravity.CENTER
            setPadding(dp(16), dp(16), dp(16), dp(16))
            setOnClickListener { dismissAlert() }
        }
        header.addView(hLeft)
        header.addView(closeBtn)
        card.addView(header)

        // ── Body ──
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(16), dp(20), dp(20))
        }

        // Order # + Total
        val oRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(14) }
        }
        val oCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        oCol.addView(TextView(this).apply {
            text = "ORDER"; setTextColor(Color.GRAY); textSize = 10f
            setTypeface(typeface, Typeface.BOLD)
        })
        oCol.addView(TextView(this).apply {
            text = "#$orderNumber"; setTextColor(Color.parseColor("#222222")); textSize = 22f
            setTypeface(typeface, Typeface.BOLD)
        })
        val tCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.END
        }
        tCol.addView(TextView(this).apply {
            text = "TOTAL"; setTextColor(Color.GRAY); textSize = 10f
            gravity = Gravity.END; setTypeface(typeface, Typeface.BOLD)
        })
        tCol.addView(TextView(this).apply {
            text = total.ifEmpty { "N/A" }; setTextColor(pColor)
            textSize = 24f; setTypeface(typeface, Typeface.BOLD); gravity = Gravity.END
        })
        oRow.addView(oCol)
        oRow.addView(tCol)
        body.addView(oRow)

        // Customer
        val cRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), dp(12), dp(14), dp(12))
            background = GradientDrawable().apply {
                cornerRadius = dp(12).toFloat()
                setColor(Color.parseColor("#F8F8F8"))
                setStroke(1, Color.parseColor("#EEEEEE"))
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }
        cRow.addView(TextView(this).apply { text = "👤"; textSize = 18f; setPadding(0, 0, dp(8), 0) })
        cRow.addView(TextView(this).apply {
            text = customerName; setTextColor(Color.parseColor("#333333")); textSize = 15f
            setTypeface(typeface, Typeface.BOLD)
        })
        body.addView(cRow)

        // Meta row
        val mRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(18) }
        }
        fun metaBox(icon: String, label: String, value: String) = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = GradientDrawable().apply {
                cornerRadius = dp(10).toFloat()
                setColor(Color.parseColor("#F8F8F8"))
                setStroke(1, Color.parseColor("#EEEEEE"))
            }
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginEnd = dp(4); marginStart = dp(4)
            }
            addView(TextView(this@OrderAlertActivity).apply {
                text = icon; textSize = 16f; setPadding(0, 0, dp(6), 0)
            })
            val c = LinearLayout(this@OrderAlertActivity).apply { orientation = LinearLayout.VERTICAL }
            c.addView(TextView(this@OrderAlertActivity).apply {
                text = label; setTextColor(Color.GRAY); textSize = 10f
            })
            c.addView(TextView(this@OrderAlertActivity).apply {
                text = value; setTextColor(Color.parseColor("#333333")); textSize = 14f
                setTypeface(typeface, Typeface.BOLD)
            })
            addView(c)
        }
        mRow.addView(metaBox("📦", "Items", "$itemsCount unit${if (itemsCount != 1) "s" else ""}"))
        mRow.addView(metaBox("💳", "Payment", paymentMethod))
        body.addView(mRow)

        // Buttons
        val bRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
        }
        bRow.addView(TextView(this).apply {
            text = "👁  View Order"; setTextColor(Color.WHITE)
            textSize = 16f; setTypeface(typeface, Typeface.BOLD); gravity = Gravity.CENTER
            setPadding(dp(16), dp(16), dp(16), dp(16))
            background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat(); setColor(pColor)
            }
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginEnd = dp(8)
            }
            setOnClickListener { viewOrder() }
        })
        bRow.addView(TextView(this).apply {
            text = "Dismiss"; setTextColor(Color.parseColor("#666666"))
            textSize = 15f; gravity = Gravity.CENTER
            setPadding(dp(20), dp(16), dp(20), dp(16))
            background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat(); setColor(Color.parseColor("#F0F0F0"))
                setStroke(1, Color.parseColor("#DDDDDD"))
            }
            setOnClickListener { dismissAlert() }
        })
        body.addView(bRow)

        card.addView(body)
        container.addView(card)
        scrollView.addView(container)
        root.addView(scrollView)
        return root
    }

    /**
     * "View Order" tapped — dismiss the keyguard (shows unlock screen
     * if locked), then launch the main app with the orderId so it
     * navigates to the order detail page.
     */
    private fun viewOrder() {
        AlertModuleHelper.stopAlert()

        // Launch main app with orderId extra
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("navigateTo", "OrderDetail")
                putExtra("orderId", orderId)
            }

            // If locked, request keyguard dismiss first
            val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            if (km.isKeyguardLocked && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                km.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
                    override fun onDismissSucceeded() {
                        if (intent != null) startActivity(intent)
                        finish()
                    }
                    override fun onDismissCancelled() {
                        // User cancelled unlock — just dismiss alert
                        finish()
                    }
                    override fun onDismissError() {
                        if (intent != null) startActivity(intent)
                        finish()
                    }
                })
            } else {
                if (intent != null) startActivity(intent)
                finish()
            }
        } catch (e: Exception) {
            android.util.Log.e("OrderAlertActivity", "viewOrder failed", e)
            finish()
        }
    }

    private fun dismissAlert() {
        AlertModuleHelper.stopAlert()
        // Cancel the full-screen intent notification
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(99999)
        } catch (_: Exception) {}
        finish()
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        dismissAlert()
    }
}

/**
 * Static helper so OrderAlertActivity can stop the alert loop
 * without needing a reference to the React Native module instance.
 */
object AlertModuleHelper {
    var onStopAlert: (() -> Unit)? = null

    fun stopAlert() {
        try { onStopAlert?.invoke() } catch (_: Exception) {}
    }
}
