package com.goldfire.testpanel.bridge

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.webkit.JavascriptInterface
import com.goldfire.testpanel.nativebridge.NativeTestEngine
import com.goldfire.testpanel.network.GoldFireApiClient
import org.json.JSONObject

/**
 * Exposes safe, authorized QA testing methods from Kotlin and C++17 NDK
 * to the bundled HTML5/CSS3/JS control panel.
 */
class PanelJsBridge(
    private val context: Context,
    private val nativeEngine: NativeTestEngine,
    private val apiClient: GoldFireApiClient,
    private val onRequestFloatingPanel: () -> Unit,
    private val onStopFloatingPanel: () -> Unit
) {

    @JavascriptInterface
    fun getDeviceDiagnostics(): String {
        return JSONObject()
            .put("androidSdk", Build.VERSION.SDK_INT)
            .put("deviceModel", Build.MODEL)
            .put("overlayPermissionGranted", Settings.canDrawOverlays(context))
            .put("nativeEngine", JSONObject(nativeEngine.getNativeEngineInfo()))
            .put("rootRequired", false)
            .toString()
    }

    @JavascriptInterface
    fun requestFloatingOverlay() {
        onRequestFloatingPanel()
    }

    @JavascriptInterface
    fun stopFloatingOverlay() {
        onStopFloatingPanel()
    }

    @JavascriptInterface
    fun configureApiEndpoint(url: String) {
        apiClient.configureEndpoint(url)
    }

    @JavascriptInterface
    fun checkIntegrationStatus(): String {
        return apiClient.checkIntegrationStatus()
    }

    @JavascriptInterface
    fun connectGameSession(buildId: String, apiKey: String): String {
        return apiClient.startAuthorizedSession(buildId, apiKey)
    }

    @JavascriptInterface
    fun disconnectGameSession(): String {
        return apiClient.disconnect()
    }

    @JavascriptInterface
    fun runAimAnomalyTest(angularVelocity: Double, headshotRatio: Double, ticks: Int): String {
        val nativeJson = nativeEngine.generateAimAnomalyPayload(angularVelocity, headshotRatio, ticks)
        return apiClient.dispatchTestTelemetry("AIM_TEST", nativeJson)
    }

    @JavascriptInterface
    fun runEspVisibilityTest(radiusMeters: Double, occludedTargets: Int): String {
        val nativeJson = nativeEngine.generateEspQueryPayload(radiusMeters, occludedTargets)
        return apiClient.dispatchTestTelemetry("ESP_TEST", nativeJson)
    }

    @JavascriptInterface
    fun runMovementAnomalyTest(speedMultiplier: Double, teleportDelta: Double, frameMs: Int): String {
        val nativeJson = nativeEngine.generateMovementAnomalyPayload(speedMultiplier, teleportDelta, frameMs)
        return apiClient.dispatchTestTelemetry("MOVEMENT_TEST", nativeJson)
    }

    @JavascriptInterface
    fun runDamageAnomalyTest(simulatedDamage: Double, baselineDamage: Double, forcedCrit: Boolean): String {
        val nativeJson = nativeEngine.generateDamageAnomalyPayload(simulatedDamage, baselineDamage, forcedCrit)
        return apiClient.dispatchTestTelemetry("DAMAGE_TEST", nativeJson)
    }

    @JavascriptInterface
    fun runFireRateAnomalyTest(simulatedRpm: Int, weaponMaxRpm: Int): String {
        val nativeJson = nativeEngine.generateFireRateAnomalyPayload(simulatedRpm, weaponMaxRpm)
        return apiClient.dispatchTestTelemetry("FIRE_RATE_TEST", nativeJson)
    }
}
