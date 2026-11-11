package com.saasmobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class TenantConfigModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TenantConfigModule"

    @ReactMethod
    fun readConfig(promise: Promise) {
        try {
            val assetManager = reactApplicationContext.assets
            val inputStream = assetManager.open("tenant-config.json")
            val content = inputStream.bufferedReader().use { it.readText() }
            inputStream.close()
            promise.resolve(content)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }
}
