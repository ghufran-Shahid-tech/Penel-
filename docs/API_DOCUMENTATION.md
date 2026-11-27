# Gold Fire Authorized Testing API & SDK Contract

## Security Boundary

`GOLD FIRE — ADVANCED TEST PANEL` operates strictly through an authenticated QA Testing API and explicit Gold Fire SDK hooks. It does **not** perform memory injection, process tampering, root access, or unauthorized modification of external apps.

## Endpoints

### 1. Integration Health Check
`GET /api/v1/health`

Returns server readiness, protocol version, and active QA session count.

### 2. Start Authorized Test Session
`POST /api/v1/sessions/connect`
- Header: `Authorization: Bearer <GOLDFIRE_QA_API_KEY>`
- Body:
```json
{
  "build_id": "goldfire-staging-2.4.1",
  "client_platform": "android-ndk-kotlin",
  "protocol_version": "1.0.0"
}
```
- Response: Returns `session_id` and scoped `session_token`.

### 3. Submit Test Telemetry & Evaluate Anti-Cheat Detection
`POST /api/v1/tests/evaluate`
- Header: `Authorization: Bearer <session_token>`
- Supported `module` values:
  - `AIM_TEST`
  - `ESP_TEST`
  - `OVERLAY_TEST`
  - `MOVEMENT_TEST`
  - `DAMAGE_TEST`
  - `FIRE_RATE_TEST`
- Response includes `verdict` (`DETECTED`, `FLAGGED`, `NOMINAL`, `UNDETECTED_GAP`), `rule_id`, `severity`, `latency_ms`, and `recommended_action`.

### 4. Disconnect Safely
`POST /api/v1/sessions/{session_id}/disconnect`
- Revokes the active session token immediately.

## Game SDK Integration (Gold Fire Server/Client)

To validate real gameplay builds, configure your Gold Fire staging server to mirror incoming QA session events (`session_id`) into your anti-cheat pipeline and return the triggered rule ID using the `DetectionVerdict` JSON schema above.
