#include <jni.h>
#include <string>
#include "goldfire_test_engine.h"

using goldfire::qa::TestEngine;

extern "C" {

JNIEXPORT jstring JNICALL
Java_com_goldfire_testpanel_nativebridge_NativeTestEngine_getNativeEngineInfo(
    JNIEnv* env,
    jobject /* thiz */
) {
    const std::string json = TestEngine::getEngineInfoJson();
    return env->NewStringUTF(json.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_goldfire_testpanel_nativebridge_NativeTestEngine_generateAimAnomalyPayload(
    JNIEnv* env,
    jobject /* thiz */,
    jdouble angularVelocityDegPerSec,
    jdouble headshotRatio,
    jint tickCount
) {
    const std::string json = TestEngine::generateAimAnomaly(
        angularVelocityDegPerSec,
        headshotRatio,
        tickCount
    );
    return env->NewStringUTF(json.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_goldfire_testpanel_nativebridge_NativeTestEngine_generateEspQueryPayload(
    JNIEnv* env,
    jobject /* thiz */,
    jdouble queryRadiusMeters,
    jint occludedTargetsRequested
) {
    const std::string json = TestEngine::generateEspQuery(
        queryRadiusMeters,
        occludedTargetsRequested
    );
    return env->NewStringUTF(json.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_goldfire_testpanel_nativebridge_NativeTestEngine_generateMovementAnomalyPayload(
    JNIEnv* env,
    jobject /* thiz */,
    jdouble speedMultiplier,
    jdouble teleportDeltaMeters,
    jint frameDeltaMs
) {
    const std::string json = TestEngine::generateMovementAnomaly(
        speedMultiplier,
        teleportDeltaMeters,
        frameDeltaMs
    );
    return env->NewStringUTF(json.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_goldfire_testpanel_nativebridge_NativeTestEngine_generateDamageAnomalyPayload(
    JNIEnv* env,
    jobject /* thiz */,
    jdouble simulatedDamage,
    jdouble weaponBaselineDamage,
    jboolean forcedCriticalFlag
) {
    const std::string json = TestEngine::generateDamageAnomaly(
        simulatedDamage,
        weaponBaselineDamage,
        forcedCriticalFlag == JNI_TRUE
    );
    return env->NewStringUTF(json.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_goldfire_testpanel_nativebridge_NativeTestEngine_generateFireRateAnomalyPayload(
    JNIEnv* env,
    jobject /* thiz */,
    jint simulatedRpm,
    jint weaponMaxRpm
) {
    const std::string json = TestEngine::generateFireRateAnomaly(
        simulatedRpm,
        weaponMaxRpm
    );
    return env->NewStringUTF(json.c_str());
}

} // extern "C"
