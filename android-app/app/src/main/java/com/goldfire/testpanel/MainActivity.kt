package com.goldfire.testpanel

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import com.goldfire.testpanel.bridge.PanelJsBridge
import com.goldfire.testpanel.databinding.ActivityMainBinding
import com.goldfire.testpanel.nativebridge.NativeTestEngine
import com.goldfire.testpanel.network.GoldFireApiClient

/**
 * Main standalone entry point for GOLD FIRE — ADVANCED TEST PANEL.
 * Hosts the responsive HTML5/CSS3/JS control panel inside a hardened WebView
 * bridged to Kotlin services, C++17 NDK test generators, and the Gold Fire Test API.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var nativeEngine: NativeTestEngine
    private lateinit var apiClient: GoldFireApiClient
    private lateinit var jsBridge: PanelJsBridge

    private val overlaySettingsLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        val granted = Settings.canDrawOverlays(this)
        notifyWebOverlayPermission(granted)
        if (granted) {
            startFloatingOverlayService()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        nativeEngine = NativeTestEngine()
        apiClient = GoldFireApiClient()
        jsBridge = PanelJsBridge(
            context = this,
            nativeEngine = nativeEngine,
            apiClient = apiClient,
            onRequestFloatingPanel = { requestFloatingPanelWithConsent() },
            onStopFloatingPanel = { stopFloatingOverlayService() }
        )

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        binding.panelWebView.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.cacheMode = WebSettings.LOAD_NO_CACHE
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW

            addJavascriptInterface(jsBridge, "GoldFireAndroid")

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ) = assetLoader.shouldInterceptRequest(request.url)

                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean {
                    // Restrict WebView navigation strictly to bundled panel assets
                    return request.url.host != "appassets.androidplatform.net"
                }
            }

            loadUrl("https://appassets.androidplatform.net/assets/panel/index.html")
        }
    }

    private fun requestFloatingPanelWithConsent() {
        runOnUiThread {
            if (Settings.canDrawOverlays(this)) {
                startFloatingOverlayService()
                return@runOnUiThread
            }

            AlertDialog.Builder(this)
                .setTitle(R.string.overlay_consent_title)
                .setMessage(R.string.overlay_consent_message)
                .setPositiveButton("Open Overlay Settings") { _, _ ->
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:$packageName")
                    )
                    overlaySettingsLauncher.launch(intent)
                }
                .setNegativeButton("Cancel") { dialog, _ ->
                    dialog.dismiss()
                    notifyWebOverlayPermission(false)
                }
                .show()
        }
    }

    private fun startFloatingOverlayService() {
        val intent = Intent(this, FloatingPanelService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(this, intent)
        } else {
            startService(intent)
        }
        notifyWebOverlayPermission(true)
    }

    private fun stopFloatingOverlayService() {
        stopService(Intent(this, FloatingPanelService::class.java))
    }

    private fun notifyWebOverlayPermission(granted: Boolean) {
        binding.panelWebView.post {
            binding.panelWebView.evaluateJavascript(
                "window.onAndroidOverlayPermission && window.onAndroidOverlayPermission($granted);",
                null
            )
        }
    }

    override fun onDestroy() {
        binding.panelWebView.removeJavascriptInterface("GoldFireAndroid")
        binding.panelWebView.destroy()
        apiClient.disconnect()
        super.onDestroy()
    }
}
