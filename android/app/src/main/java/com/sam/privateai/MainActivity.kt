package com.sam.privateai

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognizerIntent
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import java.util.Locale
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val voiceCode = 1001
    private var language = "bn-BD"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = WebViewClient()
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        val allowed = request.resources.filter {
                            it == PermissionRequest.RESOURCE_AUDIO_CAPTURE ||
                            it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                        }.toTypedArray()
                        if (allowed.isNotEmpty()) request.grant(allowed)
                    }
                }
            }
            addJavascriptInterface(VoiceBridge(), "SAMVoiceBridge")
        }

        val root = FrameLayout(this)
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))

        val voiceButton = Button(this).apply {
            text = "🎙 SAM Voice"
            setOnClickListener { startVoice() }
            contentDescription = "Speak to SAM"
        }
        val buttonParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        )
        buttonParams.gravity = android.view.Gravity.BOTTOM or android.view.Gravity.END
        buttonParams.setMargins(0, 0, 24, 24)
        root.addView(voiceButton, buttonParams)

        setContentView(root)

        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), voiceCode)
        }

        webView.loadUrl("https://sam-ai-2026.vercel.app")
    }

    private fun startVoice() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), voiceCode)
            return
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to SAM")
        }
        startActivityForResult(intent, voiceCode)
    }

    private fun putVoiceIntoSam(text: String) {
        val safe = JSONObject.quote(text)
        val script = "(function(){const t=document.querySelector('textarea[aria-label="Message"]');" +
            "if(!t)return false;" +
            "const s=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;" +
            "s.call(t,$safe);t.dispatchEvent(new Event('input',{bubbles:true}));t.focus();return true;})()"
        webView.evaluateJavascript(script, null)
    }

    private inner class VoiceBridge {
        @android.webkit.JavascriptInterface
        fun setLanguage(code: String) {
            language = when (code) {
                "en-US", "hi-IN" -> code
                else -> "bn-BD"
            }
        }
    }

    @Deprecated("Compatibility with Android speech recognition")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == voiceCode && resultCode == RESULT_OK) {
            val result = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!result.isNullOrBlank()) putVoiceIntoSam(result)
        }
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("SAMVoiceBridge")
        webView.destroy()
        super.onDestroy()
    }
}
