from __future__ import annotations

import os
import secrets
import uuid
from typing import Dict, List

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from detection_engine import AntiCheatDetectionEngine
from sdk_contract import (
    DetectionVerdict,
    SessionConnectRequest,
    SessionConnectResponse,
    TestTelemetryEnvelope,
)

app = FastAPI(
    title="Gold Fire Authorized Anti-Cheat Testing API",
    version="1.0.0",
    description="Authenticated QA testing server for GOLD FIRE — ADVANCED TEST PANEL.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

AUTHORIZED_API_KEY = os.getenv("GOLDFIRE_QA_API_KEY", "gf-qa-authorized-token")
ACTIVE_SESSIONS: Dict[str, dict] = {}
AUDIT_LOGS: List[DetectionVerdict] = []
ENGINE = AntiCheatDetectionEngine()


def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer authentication token.")
    return authorization.removeprefix("Bearer ").strip()


@app.get("/api/v1/health")
def health_check() -> dict:
    return {
        "status": "ready",
        "service": "goldfire-qa-anticheat-api",
        "protocol_version": "1.0.0",
        "active_sessions": len(ACTIVE_SESSIONS),
    }


@app.post("/api/v1/sessions/connect", response_model=SessionConnectResponse)
def connect_session(
    req: SessionConnectRequest,
    authorization: str | None = Header(default=None),
) -> SessionConnectResponse:
    token = _extract_bearer(authorization)
    if not secrets.compare_digest(token, AUTHORIZED_API_KEY):
        raise HTTPException(status_code=403, detail="Invalid Gold Fire QA API key.")

    session_id = f"gf-sess-{uuid.uuid4().hex[:8]}"
    session_token = secrets.token_urlsafe(24)
    ACTIVE_SESSIONS[session_id] = {
        "build_id": req.build_id,
        "platform": req.client_platform,
        "token": session_token,
    }
    return SessionConnectResponse(
        connected=True,
        session_id=session_id,
        session_token=session_token,
        build_id=req.build_id,
    )


@app.post("/api/v1/sessions/{session_id}/disconnect")
def disconnect_session(
    session_id: str,
    authorization: str | None = Header(default=None),
) -> dict:
    token = _extract_bearer(authorization)
    session = ACTIVE_SESSIONS.get(session_id)
    if not session or not secrets.compare_digest(token, session["token"]):
        raise HTTPException(status_code=401, detail="Unknown or expired test session.")

    ACTIVE_SESSIONS.pop(session_id, None)
    return {"disconnected": True, "session_id": session_id}


@app.post("/api/v1/tests/evaluate", response_model=DetectionVerdict)
def evaluate_test_event(
    envelope: TestTelemetryEnvelope,
    authorization: str | None = Header(default=None),
) -> DetectionVerdict:
    token = _extract_bearer(authorization)
    session = ACTIVE_SESSIONS.get(envelope.session_id)
    if not session or not secrets.compare_digest(token, session["token"]):
        raise HTTPException(status_code=401, detail="Unauthorized or disconnected QA session.")

    verdict = ENGINE.evaluate(
        session_id=envelope.session_id,
        module=envelope.module,
        payload=envelope.payload,
    )
    AUDIT_LOGS.insert(0, verdict)
    del AUDIT_LOGS[200:]
    return verdict


@app.get("/api/v1/logs", response_model=List[DetectionVerdict])
def list_audit_logs(authorization: str | None = Header(default=None)) -> List[DetectionVerdict]:
    token = _extract_bearer(authorization)
    valid = secrets.compare_digest(token, AUTHORIZED_API_KEY) or any(
        secrets.compare_digest(token, s["token"]) for s in ACTIVE_SESSIONS.values()
    )
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid token.")
    return AUDIT_LOGS[:100]
