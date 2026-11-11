package com.saasmobile

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class WhatsAppShareModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WhatsAppShareModule"

    @ReactMethod
    fun shareToWhatsApp(filePath: String, message: String, phoneNumber: String, promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }

            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "PDF file not found")
                return
            }

            val authority = "${reactApplicationContext.packageName}.fileprovider"
            val contentUri: Uri = FileProvider.getUriForFile(reactApplicationContext, authority, file)

            // Use ACTION_SEND with jid for direct chat + file attachment
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                setPackage("com.whatsapp")
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                if (message.isNotEmpty()) {
                    putExtra(Intent.EXTRA_TEXT, message)
                }
                if (phoneNumber.isNotEmpty()) {
                    putExtra("jid", "$phoneNumber@s.whatsapp.net")
                }
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            activity.startActivity(sendIntent)
            promise.resolve(true)
        } catch (e: android.content.ActivityNotFoundException) {
            promise.reject("WA_NOT_FOUND", "WhatsApp is not installed")
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e.message, e)
        }
    }
}
