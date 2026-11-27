from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_full_authorized_qa_workflow():
    # 1. Health check
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ready"

    # 2. Authenticate QA session
    connect = client.post(
        "/api/v1/sessions/connect",
        headers={"Authorization": "Bearer gf-qa-authorized-token"},
        json={"build_id": "goldfire-staging-2.4.1", "client_platform": "pytest"},
    )
    assert connect.status_code == 200
    data = connect.json()
    session_id = data["session_id"]
    headers = {"Authorization": f"Bearer {data['session_token']}"}

    # 3. Verify all 6 anomaly modules trigger server-side anti-cheat detections
    cases = [
        ("AIM_TEST", {"angular_velocity_dps": 840.0, "headshot_ratio": 0.98}),
        ("ESP_TEST", {"query_radius_m": 180.0, "occluded_targets_requested": 4}),
        ("OVERLAY_TEST", {"suspicious_overlay_flag": True, "window_alpha": 0.8}),
        ("MOVEMENT_TEST", {"speed_multiplier": 2.4, "teleport_delta_m": 32.0}),
        ("DAMAGE_TEST", {"reported_damage": 350.0, "weapon_baseline_damage": 45.0, "forced_critical_flag": True}),
        ("FIRE_RATE_TEST", {"simulated_rpm": 1450, "weapon_max_rpm": 650}),
    ]
    for module, payload in cases:
        res = client.post(
            "/api/v1/tests/evaluate",
            headers=headers,
            json={"session_id": session_id, "module": module, "payload": payload},
        )
        assert res.status_code == 200
        assert res.json()["verdict"] == "DETECTED"

    # 4. Safe disconnect
    disc = client.post(f"/api/v1/sessions/{session_id}/disconnect", headers=headers)
    assert disc.status_code == 200
    assert disc.json()["disconnected"] is True
