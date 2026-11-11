package com.saasmobile

import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class TtsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private var isReady = false

    override fun getName() = "TtsModule"

    override fun initialize() {
        super.initialize()
        tts = TextToSpeech(reactApplicationContext, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            tts?.setPitch(1.2f) // Slightly higher pitch (matches web)
            tts?.setSpeechRate(1.0f)
            isReady = true
        }
    }

    @ReactMethod
    fun speak(text: String) {
        if (isReady) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "order_announcement")
        }
    }

    override fun invalidate() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isReady = false
        super.invalidate()
    }
}
