from __future__ import annotations

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


ModuleType = Literal[
    "AIM_TEST",
    "ESP_TEST",
    "OVERLAY_TEST",
    "MOVEMENT_TEST",
    "DAMAGE_TEST",
    "FIRE_RATE_TEST",
]


class SessionConnectRequest(BaseModel):
    build_id: str = Field(..., min_length=3, max_length=64)
    client_platform: str = Field(default="android-ndk-kotlin", max_length=48)
    protocol_version: str = Field(default="1.0.0", max_length=16)


class SessionConnectResponse(BaseModel):
    connected: bool
    session_id: str
    session_token: str
    build_id: str
    sdk_contract_version: str = "1.0.0"
    expires_in_seconds: int = 3600


class TestTelemetryEnvelope(BaseModel):
    session_id: str = Field(..., min_length=3, max_length=64)
    module: ModuleType
    payload: Dict[str, Any]


class DetectionVerdict(BaseModel):
    event_id: str
    session_id: str
    module: ModuleType
    verdict: Literal["DETECTED", "FLAGGED", "NOMINAL", "UNDETECTED_GAP"]
    rule_id: str
    severity: Literal["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    latency_ms: float
    details: str
    recommended_action: Optional[str] = None
