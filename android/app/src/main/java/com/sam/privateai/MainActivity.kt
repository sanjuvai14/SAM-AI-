package com.sam.privateai

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.provider.MediaStore
import android.speech.RecognizerIntent
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var transcript: TextView
    private val voiceCode = 1001
    private val cameraCode = 1002
    private val screenCode = 1003
    private var language = "bn-BD"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 48, 32, 32)
        }
        transcript = TextView(this)
        transcript.text = "SAM - Private AI\nVoice / Camera / Screen ready"
        layout.addView(transcript)

        layout.addView(Button(this).apply {
            text = "Speak to SAM"
            setOnClickListener { startVoice() }
        })
        layout.addView(Button(this).apply {
            text = "English voice"
            setOnClickListener { language = "en-US"; startVoice() }
        })
        layout.addView(Button(this).apply {
            text = "বাংলা voice"
            setOnClickListener { language = "bn-BD"; startVoice() }
        })
        layout.addView(Button(this).apply {
            text = "हिन्दी voice"
            setOnClickListener { language = "hi-IN"; startVoice() }
        })
        layout.addView(Button(this).apply {
            text = "Camera"
            setOnClickListener { openCamera() }
        })
        layout.addView(Button(this).apply {
            text = "Share screen"
            setOnClickListener { requestScreenCapture() }
        })

        setContentView(layout)
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA), 1004)
        }
    }

    private fun startVoice() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to SAM")
        }
        startActivityForResult(intent, voiceCode)
    }

    private fun openCamera() {
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.CAMERA), cameraCode)
            return
        }
        startActivityForResult(Intent(MediaStore.ACTION_IMAGE_CAPTURE), cameraCode)
    }

    private fun requestScreenCapture() {
        val manager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        startActivityForResult(manager.createScreenCaptureIntent(), screenCode)
    }

    @Deprecated("Compatibility with the minimal Android client")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            voiceCode -> if (resultCode == RESULT_OK) {
                val result = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
                if (!result.isNullOrBlank()) transcript.text = "SAM heard (" + Locale.forLanguageTag(language).displayLanguage + "):\n" + result
            }
            cameraCode -> if (resultCode == RESULT_OK) transcript.text = "Camera permission/capture intent completed."
            screenCode -> if (resultCode == RESULT_OK) transcript.text = "Screen capture permission granted for this session."
        }
    }
}
