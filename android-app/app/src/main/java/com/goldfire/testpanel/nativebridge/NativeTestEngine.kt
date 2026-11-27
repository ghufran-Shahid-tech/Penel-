package com.goldfire.testpanel.nativebridge

/**
 * JNI wrapper around the C++17 NDK telemetry simulation library (libgoldfire_test_engine.so).
 * Generates deterministic, authorized anti-cheat QA telemetry payloads without modifying
 * or inspecting external process memory.
 */
class NativeTestEngine {

    companion object {
        init {
            System.loadLibrary("goldfire_test_engine")
        }
    }

    external fun getNativeEngineInfo(): String

    external fun generateAimAnomalyPayload(
        angularVelocityDegPerSec: Double,
        headshotRatio: Double,
        tickCount: Int
    ): String

    external fun generateEspQueryPayload(
        queryRadiusMeters: Double,
        occludedTargetsRequested: Int
    ): String

    external fun generateMovementAnomalyPayload(
        speedMultiplier: Double,
        teleportDeltaMeters: Double,
        frameDeltaMs: Int
    ): String

    external fun generateDamageAnomalyPayload(
        simulatedDamage: Double,
        weaponBaselineDamage: Double,
        forcedCriticalFlag: Boolean
    ): String

    external fun generateFireRateAnomalyPayload(
        simulatedRpm: Int,
        weaponMaxRpm: Int
    ): String
}
