from __future__ import annotations

import time
import uuid
from typing import Any, Dict
from sdk_contract import DetectionVerdict, ModuleType


class AntiCheatDetectionEngine:
    """
    Server-side Gold Fire anti-cheat verification engine.
    Evaluates authorized QA telemetry payloads against server-authoritative rules
    to confirm whether unauthorized gameplay anomalies are caught accurately.
    """

    def evaluate(
        self,
        session_id: str,
        module: ModuleType,
        payload: Dict[str, Any],
    ) -> DetectionVerdict:
        started = time.perf_counter()
        event_id = f"evt_{uuid.uuid4().hex[:10]}"

        if module == "AIM_TEST":
            vel = float(payload.get("angular_velocity_dps", 0.0))
            hs_ratio = float(payload.get("headshot_ratio", 0.0))
            if vel > 520.0 or hs_ratio > 0.85:
                verdict, rule, sev = "DETECTED", "GF-AC-AIM-101", "HIGH"
                details = f"Abnormal angular snap ({vel:.1f} deg/s) / headshot ratio ({hs_ratio*100:.1f}%) flagged."
                action = "Quarantine match replay & apply aim validation lock"
            elif vel > 340.0 or hs_ratio > 0.65:
                verdict, rule, sev = "FLAGGED", "GF-AC-AIM-102", "MEDIUM"
                details = f"Elevated targeting velocity ({vel:.1f} deg/s) queued for heuristic review."
                action = "Increase server tick sampling"
            else:
                verdict, rule, sev = "NOMINAL", "GF-AC-AIM-000", "INFO"
                details = "Aim kinematics within human baseline envelope."
                action = None

        elif module == "ESP_TEST":
            occluded = int(payload.get("occluded_targets_requested", 0))
            radius = float(payload.get("query_radius_m", 0.0))
            if occluded > 0 or radius > 120.0:
                verdict, rule, sev = "DETECTED", "GF-AC-ESP-201", "CRITICAL"
                details = f"Blocked unauthorized visibility probe for {occluded} occluded actors at {radius:.1f}m."
                action = "Enforce server-side fog-of-war culling & log violation"
            else:
                verdict, rule, sev = "NOMINAL", "GF-AC-ESP-000", "INFO"
                details = "Visibility query respected line-of-sight replication bounds."
                action = None

        elif module == "OVERLAY_TEST":
            suspicious = bool(payload.get("suspicious_overlay_flag", False))
            alpha = float(payload.get("window_alpha", 1.0))
            if suspicious or alpha < 0.95:
                verdict, rule, sev = "DETECTED", "GF-AC-OVL-301", "MEDIUM"
                details = f"Android overlay window flagged (alpha={alpha:.2f}, suspicious={suspicious})."
                action = "Record overlay telemetry in authorized QA audit log"
            else:
                verdict, rule, sev = "NOMINAL", "GF-AC-OVL-000", "INFO"
                details = "No unauthorized overlay surface detected."
                action = None

        elif module == "MOVEMENT_TEST":
            speed_mult = float(payload.get("speed_multiplier", 1.0))
            teleport = float(payload.get("teleport_delta_m", 0.0))
            if teleport > 12.0 or speed_mult > 1.35:
                verdict, rule, sev = "DETECTED", "GF-AC-MOV-401", "HIGH"
                details = f"Server rollback triggered: speed x{speed_mult:.2f}, teleport delta {teleport:.2f}m."
                action = "Snap actor back to last authoritative server position"
            elif speed_mult > 1.15 or teleport > 4.0:
                verdict, rule, sev = "FLAGGED", "GF-AC-MOV-402", "LOW"
                details = f"Minor kinematic drift ({speed_mult:.2f}x) logged for packet-loss check."
                action = "Reconcile client prediction buffer"
            else:
                verdict, rule, sev = "NOMINAL", "GF-AC-MOV-000", "INFO"
                details = "Movement delta validated within character sprint envelope."
                action = None

        elif module == "DAMAGE_TEST":
            reported = float(payload.get("reported_damage", 0.0))
            baseline = max(1.0, float(payload.get("weapon_baseline_damage", 45.0)))
            forced_crit = bool(payload.get("forced_critical_flag", False))
            ratio = reported / baseline
            if ratio > 2.2 or forced_crit:
                verdict, rule, sev = "DETECTED", "GF-AC-DMG-501", "CRITICAL"
                details = f"Rejected client damage claim ({reported:.1f} vs max {baseline*2.0:.1f}, forcedCrit={forced_crit})."
                action = "Discard client damage packet; compute damage server-side"
            else:
                verdict, rule, sev = "NOMINAL", "GF-AC-DMG-000", "INFO"
                details = "Damage packet matched server weapon table."
                action = None

        else:  # FIRE_RATE_TEST
            sim_rpm = int(payload.get("simulated_rpm", 600))
            max_rpm = max(60, int(payload.get("weapon_max_rpm", 650)))
            if sim_rpm > int(max_rpm * 1.12):
                verdict, rule, sev = "DETECTED", "GF-AC-ROF-601", "HIGH"
                details = f"Abnormal fire cadence rejected ({sim_rpm} RPM exceeds legal cap {max_rpm} RPM)."
                action = "Drop excess fire events & lock weapon cooldown"
            else:
                verdict, rule, sev = "NOMINAL", "GF-AC-ROF-000", "INFO"
                details = "Weapon fire cadence matches authoritative server cooldown."
                action = None

        latency_ms = round((time.perf_counter() - started) * 1000.0 + 4.2, 2)
        return DetectionVerdict(
            event_id=event_id,
            session_id=session_id,
            module=module,
            verdict=verdict,
            rule_id=rule,
            severity=sev,
            latency_ms=latency_ms,
            details=details,
            recommended_action=action,
        )
