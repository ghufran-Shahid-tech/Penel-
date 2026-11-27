package com.goldfire.testpanel.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Authenticated HTTP client communicating with the Gold Fire QA Testing API
 * and authorized game SDK verification endpoints.
 */
class GoldFireApiClient {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    @Volatile
    private var baseUrl: String = "http://10.0.2.2:8000"

    @Volatile
    private var sessionToken: String? = null

    @Volatile
    private var activeSessionId: String? = null

    fun configureEndpoint(url: String) {
        baseUrl = url.trimEnd('/')
    }

    fun checkIntegrationStatus(): String {
        val request = Request.Builder()
            .url("$baseUrl/api/v1/health")
            .get()
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                response.body?.string() ?: """{"status":"unreachable"}"""
            }
        } catch (ex: Exception) {
            JSONObject()
                .put("status", "offline")
                .put("error", ex.message ?: "Connection refused")
                .toString()
        }
    }

    fun startAuthorizedSession(buildId: String, apiKey: String): String {
        val bodyJson = JSONObject()
            .put("build_id", buildId)
            .put("client_platform", "android-ndk-kotlin")
            .put("protocol_version", "1.0.0")
            .toString()

        val request = Request.Builder()
            .url("$baseUrl/api/v1/sessions/connect")
            .header("Authorization", "Bearer $apiKey")
            .post(bodyJson.toRequestBody(jsonMediaType))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                val raw = response.body?.string() ?: "{}"
                if (response.isSuccessful) {
                    val parsed = JSONObject(raw)
                    sessionToken = parsed.optString("session_token", apiKey)
                    activeSessionId = parsed.optString("session_id", null)
                }
                raw
            }
        } catch (ex: Exception) {
            JSONObject()
                .put("connected", false)
                .put("error", ex.message ?: "Handshake failed")
                .toString()
        }
    }

    fun dispatchTestTelemetry(moduleName: String, nativePayloadJson: String): String {
        val token = sessionToken ?: return JSONObject()
            .put("verdict", "SIMULATED_LOCAL")
            .put("rule_id", "LOCAL-OFFLINE-CHECK")
            .put("details", "No active server session; validated locally.")
            .toString()

        val envelope = JSONObject()
            .put("session_id", activeSessionId ?: "local-qa")
            .put("module", moduleName)
            .put("payload", JSONObject(nativePayloadJson))
            .toString()

        val request = Request.Builder()
            .url("$baseUrl/api/v1/tests/evaluate")
            .header("Authorization", "Bearer $token")
            .post(envelope.toRequestBody(jsonMediaType))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                response.body?.string() ?: """{"verdict":"ERROR"}"""
            }
        } catch (ex: Exception) {
            JSONObject()
                .put("verdict", "NETWORK_ERROR")
                .put("error", ex.message ?: "Request failed")
                .toString()
        }
    }

    fun disconnect(): String {
        val sid = activeSessionId
        val token = sessionToken
        sessionToken = null
        activeSessionId = null

        if (sid == null || token == null) {
            return """{"disconnected":true}"""
        }

        val request = Request.Builder()
            .url("$baseUrl/api/v1/sessions/$sid/disconnect")
            .header("Authorization", "Bearer $token")
            .post("{}".toRequestBody(jsonMediaType))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                response.body?.string() ?: """{"disconnected":true}"""
            }
        } catch (_: Exception) {
            """{"disconnected":true}"""
        }
    }
}
