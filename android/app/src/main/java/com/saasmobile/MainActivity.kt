package com.saasmobile

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript.
   */
  override fun getMainComponentName(): String = "Cracker1"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleOrderNavigationIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    intent?.let { handleOrderNavigationIntent(it) }
  }

  /**
   * If the intent carries "navigateTo" = "OrderDetail" + "orderId",
   * emit a DeviceEvent so React Native can navigate to the order detail page.
   */
  private fun handleOrderNavigationIntent(intent: Intent) {
    val navigateTo = intent.getStringExtra("navigateTo") ?: return
    val orderId = intent.getStringExtra("orderId") ?: return

    android.util.Log.d("MainActivity", "Navigation intent: $navigateTo orderId=$orderId")

    // Remove the extras so we don't re-navigate on config change
    intent.removeExtra("navigateTo")
    intent.removeExtra("orderId")

    // Emit to React Native after a short delay (allow JS bridge to initialize)
    android.os.Handler(mainLooper).postDelayed({
      try {
        val reactContext = reactInstanceManager?.currentReactContext
        if (reactContext != null) {
          val params = Arguments.createMap().apply {
            putString("screen", navigateTo)
            putString("orderId", orderId)
          }
          reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onNavigateFromNative", params)
          android.util.Log.d("MainActivity", "Emitted onNavigateFromNative event")
        } else {
          android.util.Log.w("MainActivity", "ReactContext not ready, will retry...")
          // Retry after another delay
          android.os.Handler(mainLooper).postDelayed({
            try {
              val ctx = reactInstanceManager?.currentReactContext
              if (ctx != null) {
                val params = Arguments.createMap().apply {
                  putString("screen", navigateTo)
                  putString("orderId", orderId)
                }
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("onNavigateFromNative", params)
              }
            } catch (_: Exception) {}
          }, 2000)
        }
      } catch (e: Exception) {
        android.util.Log.e("MainActivity", "Failed to emit navigation event", e)
      }
    }, 500)
  }
}
