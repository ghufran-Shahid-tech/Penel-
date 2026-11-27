#include "goldfire_test_engine.h"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <sstream>

namespace goldfire::qa {

namespace {
int64_t currentTimestampMs() {
    using namespace std::chrono;
    return duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
}
} // namespace

std::string TestEngine::getEngineInfoJson() {
    std::ostringstream oss;
    oss << "{"
        << "\"engine\":\"GoldFireNativeTestEngine\","
        << "\"standard\":\"C++17\","
        << "\"mode\":\"authorized_telemetry_simulation\","
        << "\"memoryAccess\":\"disabled\""
        << "}";
    return oss.str();
}

std::string TestEngine::generateAimAnomaly(
    double angularVelocityDegPerSec,
    double headshotRatio,
    int32_t tickCount
) {
    const double clampedVel = std::clamp(angularVelocityDegPerSec, 0.0, 5000.0);
    const double clampedRatio = std::clamp(headshotRatio, 0.0, 1.0);
    const int32_t safeTicks = std::clamp(tickCount, 1, 240);

    // Compute synthetic micro-snap variance score expected to trigger Aimbot heuristics
    const double snapVariance = clampedVel > 420.0 ? 0.0021 : 0.145;
    const double suspiciousScore = std::min(1.0, (clampedVel / 900.0) * 0.65 + clampedRatio * 0.35);

    std::ostringstream oss;
    oss << std::fixed << std::setprecision(4)
        << "{"
        << "\"timestamp_ms\":" << currentTimestampMs() << ","
        << "\"scenario\":\"aim_snap_and_accuracy_anomaly\","
        << "\"angular_velocity_dps\":" << clampedVel << ","
        << "\"headshot_ratio\":" << clampedRatio << ","
        << "\"sample_ticks\":" << safeTicks << ","
        << "\"micro_jitter_variance\":" << snapVariance << ","
        << "\"synthetic_risk_index\":" << suspiciousScore
        << "}";
    return oss.str();
}

std::string TestEngine::generateEspQuery(
    double queryRadiusMeters,
    int32_t occludedTargetsRequested
) {
    const double safeRadius = std::clamp(queryRadiusMeters, 1.0, 500.0);
    const int32_t safeTargets = std::clamp(occludedTargetsRequested, 0, 64);

    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2)
        << "{"
        << "\"timestamp_ms\":" << currentTimestampMs() << ","
        << "\"scenario\":\"unauthorized_visibility_probe\","
        << "\"query_radius_m\":" << safeRadius << ","
        << "\"occluded_targets_requested\":" << safeTargets << ","
        << "\"line_of_sight_verified\":false,"
        << "\"fog_of_war_violation\":" << (safeTargets > 0 ? "true" : "false")
        << "}";
    return oss.str();
}

std::string TestEngine::generateMovementAnomaly(
    double speedMultiplier,
    double teleportDeltaMeters,
    int32_t frameDeltaMs
) {
    const double safeMult = std::clamp(speedMultiplier, 0.1, 10.0);
    const double safeTeleport = std::clamp(teleportDeltaMeters, 0.0, 500.0);
    const int32_t safeFrameMs = std::clamp(frameDeltaMs, 4, 1000);
    const double baseSprintMps = 6.8;
    const double reportedVelocityMps = baseSprintMps * safeMult + (safeTeleport / (safeFrameMs / 1000.0));

    std::ostringstream oss;
    oss << std::fixed << std::setprecision(3)
        << "{"
        << "\"timestamp_ms\":" << currentTimestampMs() << ","
        << "\"scenario\":\"kinematic_speed_and_teleport_anomaly\","
        << "\"speed_multiplier\":" << safeMult << ","
        << "\"teleport_delta_m\":" << safeTeleport << ","
        << "\"frame_delta_ms\":" << safeFrameMs << ","
        << "\"reported_velocity_mps\":" << reportedVelocityMps
        << "}";
    return oss.str();
}

std::string TestEngine::generateDamageAnomaly(
    double simulatedDamage,
    double weaponBaselineDamage,
    bool forcedCriticalFlag
) {
    const double safeDamage = std::clamp(simulatedDamage, 0.0, 9999.0);
    const double safeBase = std::max(1.0, weaponBaselineDamage);
    const double ratio = safeDamage / safeBase;

    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2)
        << "{"
        << "\"timestamp_ms\":" << currentTimestampMs() << ","
        << "\"scenario\":\"abnormal_damage_packet\","
        << "\"reported_damage\":" << safeDamage << ","
        << "\"weapon_baseline_damage\":" << safeBase << ","
        << "\"damage_multiplier_observed\":" << ratio << ","
        << "\"forced_critical_flag\":" << (forcedCriticalFlag ? "true" : "false")
        << "}";
    return oss.str();
}

std::string TestEngine::generateFireRateAnomaly(
    int32_t simulatedRpm,
    int32_t weaponMaxRpm
) {
    const int32_t safeSimRpm = std::clamp(simulatedRpm, 60, 6000);
    const int32_t safeMaxRpm = std::max(60, weaponMaxRpm);
    const double shotIntervalMs = 60000.0 / static_cast<double>(safeSimRpm);
    const double minLegalIntervalMs = 60000.0 / static_cast<double>(safeMaxRpm);

    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2)
        << "{"
        << "\"timestamp_ms\":" << currentTimestampMs() << ","
        << "\"scenario\":\"abnormal_fire_rate_cadence\","
        << "\"simulated_rpm\":" << safeSimRpm << ","
        << "\"weapon_max_rpm\":" << safeMaxRpm << ","
        << "\"observed_shot_interval_ms\":" << shotIntervalMs << ","
        << "\"legal_min_interval_ms\":" << minLegalIntervalMs
        << "}";
    return oss.str();
}

} // namespace goldfire::qa
