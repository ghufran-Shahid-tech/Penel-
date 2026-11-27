#pragma once

#include <cstdint>
#include <string>

namespace goldfire::qa {

/**
 * Authorized C++17 native telemetry generator for Gold Fire anti-cheat validation.
 * Produces deterministic synthetic gameplay anomaly records for server-side verification.
 * Strictly isolated from external process memory.
 */
class TestEngine {
public:
    static std::string getEngineInfoJson();

    static std::string generateAimAnomaly(
        double angularVelocityDegPerSec,
        double headshotRatio,
        int32_t tickCount
    );

    static std::string generateEspQuery(
        double queryRadiusMeters,
        int32_t occludedTargetsRequested
    );

    static std::string generateMovementAnomaly(
        double speedMultiplier,
        double teleportDeltaMeters,
        int32_t frameDeltaMs
    );

    static std::string generateDamageAnomaly(
        double simulatedDamage,
        double weaponBaselineDamage,
        bool forcedCriticalFlag
    );

    static std::string generateFireRateAnomaly(
        int32_t simulatedRpm,
        int32_t weaponMaxRpm
    );
};

} // namespace goldfire::qa
