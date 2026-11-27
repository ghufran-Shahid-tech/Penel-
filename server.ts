import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const ROOT_DIR = process.cwd();

app.use(express.json({ limit: '1mb' }));

interface ActiveSession {
  session_id: string;
  session_token: string;
  build_id: string;
  client_platform: string;
  connected_at: string;
}

interface DetectionVerdict {
  event_id: string;
  timestamp: string;
  session_id: string;
  module: string;
  verdict: 'DETECTED' | 'FLAGGED' | 'NOMINAL' | 'UNDETECTED_GAP';
  rule_id: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latency_ms: number;
  metric_value: number;
  threshold_value: number;
  details: string;
  recommended_action: string | null;
  payload: Record<string, unknown>;
}

const AUTHORIZED_QA_KEY = process.env.GOLDFIRE_QA_API_KEY || 'gf-qa-authorized-token';
const sessions = new Map<string, ActiveSession>();
const auditLogs: DetectionVerdict[] = [];

const GOLD_FIRE_BUILDS = [
  {
    id: 'goldfire-staging-2.4.1',
    name: 'Gold Fire QA Staging Build',
    version: '2.4.1-qa.88',
    sdkProtocol: '1.0.0',
    antiCheatProfile: 'Strict Server-Authoritative',
    endpoint: '/api/v1',
  },
  {
    id: 'goldfire-debug-2.5.0',
    name: 'Gold Fire Local Debug Build',
    version: '2.5.0-dev.14',
    sdkProtocol: '1.0.0',
    antiCheatProfile: 'Verbose Heuristic Logging',
    endpoint: '/api/v1',
  },
  {
    id: 'goldfire-canary-ac3',
    name: 'Gold Fire Canary Anti-Cheat v3',
    version: '2.5.2-canary.3',
    sdkProtocol: '1.0.0',
    antiCheatProfile: 'Enhanced Kinematic & Fog-of-War',
    endpoint: '/api/v1',
  },
];

function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function evaluateTelemetry(
  sessionId: string,
  module: string,
  payload: Record<string, unknown>
): DetectionVerdict {
  const started = performance.now();
  const eventId = `evt_${crypto.randomBytes(5).toString('hex')}`;
  const timestamp = new Date().toISOString();

  let verdict: DetectionVerdict['verdict'] = 'NOMINAL';
  let ruleId = 'GF-AC-000';
  let severity: DetectionVerdict['severity'] = 'INFO';
  let details = 'Telemetry matched authoritative server bounds.';
  let action: string | null = null;
  let metricValue = 0;
  let thresholdValue = 100;

  if (module === 'AIM_TEST') {
    const vel = Number(payload.angular_velocity_dps ?? 0);
    const hs = Number(payload.headshot_ratio ?? 0);
    const scenario = String(payload.scenario ?? 'Snap Vector');
    metricValue = vel;
    thresholdValue = 520;
    if (vel > 520 || hs > 0.85) {
      verdict = 'DETECTED';
      ruleId = 'GF-AC-AIM-101';
      severity = 'HIGH';
      details = `${scenario}: Angular velocity ${vel.toFixed(0)} deg/s and ${(hs * 100).toFixed(0)}% headshot accuracy triggered Aimbot detection.`;
      action = 'Quarantine match telemetry and trigger server-side aim verification lock.';
    } else if (vel > 340 || hs > 0.65) {
      verdict = 'FLAGGED';
      ruleId = 'GF-AC-AIM-102';
      severity = 'MEDIUM';
      details = `${scenario}: Elevated targeting velocity (${vel.toFixed(0)} deg/s) flagged for heuristic review.`;
      action = 'Increase tick sampling frequency for this session.';
    } else {
      verdict = 'NOMINAL';
      ruleId = 'GF-AC-AIM-000';
      severity = 'INFO';
      details = `${scenario}: Targeting curve (${vel.toFixed(0)} deg/s) within legitimate player distribution.`;
    }
  } else if (module === 'ESP_TEST') {
    const occluded = Number(payload.occluded_targets_requested ?? 0);
    const radius = Number(payload.query_radius_m ?? 0);
    const losBypass = Boolean(payload.los_bypass_attempt ?? false);
    metricValue = radius;
    thresholdValue = 120;
    if (occluded > 0 || radius > 120 || losBypass) {
      verdict = 'DETECTED';
      ruleId = 'GF-AC-ESP-201';
      severity = 'CRITICAL';
      details = `Blocked unauthorized visibility query for ${occluded} occluded actors across ${radius.toFixed(0)}m radius.`;
      action = 'Enforce server-side fog-of-war culling and drop actor transform packet.';
    } else {
      verdict = 'NOMINAL';
      ruleId = 'GF-AC-ESP-000';
      severity = 'INFO';
      details = `Visibility query (${radius.toFixed(0)}m, 0 occluded) respected line-of-sight replication.`;
    }
  } else if (module === 'OVERLAY_TEST') {
    const alpha = Number(payload.window_alpha ?? 1);
    const suspicious = Boolean(payload.suspicious_overlay_flag ?? false);
    const layer = String(payload.window_layer ?? 'TYPE_APPLICATION_OVERLAY');
    metricValue = Math.round((1 - alpha) * 100 + (suspicious ? 65 : 0));
    thresholdValue = 50;
    if (suspicious || alpha < 0.92) {
      verdict = 'DETECTED';
      ruleId = 'GF-AC-OVL-301';
      severity = 'MEDIUM';
      details = `Detected overlay surface (${layer}, alpha ${alpha.toFixed(2)}, suspicious=${suspicious}).`;
      action = 'Log Android overlay diagnostic event into authorized QA audit stream.';
    } else {
      verdict = 'NOMINAL';
      ruleId = 'GF-AC-OVL-000';
      severity = 'INFO';
      details = `Overlay surface check passed (${layer}, opaque standard window).`;
    }
  } else if (module === 'MOVEMENT_TEST') {
    const speedMult = Number(payload.speed_multiplier ?? 1);
    const teleport = Number(payload.teleport_delta_m ?? 0);
    metricValue = Number((speedMult * 100 + teleport * 3).toFixed(1));
    thresholdValue = 140;
    if (teleport > 12 || speedMult > 1.35) {
      verdict = 'DETECTED';
      ruleId = 'GF-AC-MOV-401';
      severity = 'HIGH';
      details = `Server rollback executed: speed ${speedMult.toFixed(2)}x and teleport jump ${teleport.toFixed(1)}m exceeded kinematic cap.`;
      action = 'Snap player coordinates to last authoritative server tick.';
    } else if (speedMult > 1.15 || teleport > 4) {
      verdict = 'FLAGGED';
      ruleId = 'GF-AC-MOV-402';
      severity = 'LOW';
      details = `Minor movement drift (${speedMult.toFixed(2)}x, ${teleport.toFixed(1)}m) recorded for latency reconciliation.`;
      action = 'Reconcile prediction buffer without hard kick.';
    } else {
      verdict = 'NOMINAL';
      ruleId = 'GF-AC-MOV-000';
      severity = 'INFO';
      details = `Movement kinematics (${speedMult.toFixed(2)}x) verified within character sprint limit.`;
    }
  } else if (module === 'DAMAGE_TEST') {
    const reported = Number(payload.reported_damage ?? 0);
    const baseline = Math.max(1, Number(payload.weapon_baseline_damage ?? 45));
    const forcedCrit = Boolean(payload.forced_critical_flag ?? false);
    const ratio = reported / baseline;
    metricValue = reported;
    thresholdValue = baseline * 2.2;
    if (ratio > 2.2 || forcedCrit) {
      verdict = 'DETECTED';
      ruleId = 'GF-AC-DMG-501';
      severity = 'CRITICAL';
      details = `Rejected abnormal damage packet (${reported.toFixed(0)} HP vs baseline ${baseline.toFixed(0)} HP, forcedCrit=${forcedCrit}).`;
      action = 'Discard client hit value; recompute authoritative weapon damage server-side.';
    } else {
      verdict = 'NOMINAL';
      ruleId = 'GF-AC-DMG-000';
      severity = 'INFO';
      details = `Damage claim (${reported.toFixed(0)} HP) validated against server weapon table.`;
    }
  } else if (module === 'FIRE_RATE_TEST') {
    const simRpm = Number(payload.simulated_rpm ?? 600);
    const maxRpm = Math.max(60, Number(payload.weapon_max_rpm ?? 650));
    metricValue = simRpm;
    thresholdValue = Math.round(maxRpm * 1.12);
    if (simRpm > maxRpm * 1.12) {
      verdict = 'DETECTED';
      ruleId = 'GF-AC-ROF-601';
      severity = 'HIGH';
      details = `Blocked rapid-fire anomaly (${simRpm} RPM exceeds legal weapon ceiling ${maxRpm} RPM).`;
      action = 'Drop excess shot RPCs and enforce server weapon cooldown timer.';
    } else {
      verdict = 'NOMINAL';
      ruleId = 'GF-AC-ROF-000';
      severity = 'INFO';
      details = `Weapon fire cadence (${simRpm} RPM) matched authoritative interval.`;
    }
  }

  const latencyMs = Number(((performance.now() - started) + 3.4 + Math.random() * 2.1).toFixed(2));
  return {
    event_id: eventId,
    timestamp,
    session_id: sessionId,
    module,
    verdict,
    rule_id: ruleId,
    severity,
    latency_ms: latencyMs,
    metric_value: metricValue,
    threshold_value: thresholdValue,
    details,
    recommended_action: action,
    payload,
  };
}

// --- Gold Fire Authorized QA API ---

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ready',
    service: 'goldfire-qa-anticheat-api',
    protocol_version: '1.0.0',
    active_sessions: sessions.size,
    builds: GOLD_FIRE_BUILDS,
    security_boundary: 'Authorized SDK API only · No external process memory inspection',
  });
});

app.post('/api/v1/sessions/connect', (req, res) => {
  const token = extractBearer(req.headers.authorization);
  if (!token || !safeCompare(token, AUTHORIZED_QA_KEY)) {
    return res.status(403).json({
      connected: false,
      error: 'Invalid Gold Fire QA API key. Use the authorized staging QA key.',
    });
  }

  const buildId = typeof req.body?.build_id === 'string' && req.body.build_id.trim()
    ? req.body.build_id.trim().slice(0, 64)
    : 'goldfire-staging-2.4.1';
  const clientPlatform = typeof req.body?.client_platform === 'string'
    ? req.body.client_platform.slice(0, 48)
    : 'goldfire-panel-web-android';

  const sessionId = `gf-sess-${crypto.randomBytes(4).toString('hex')}`;
  const sessionToken = crypto.randomBytes(24).toString('base64url');
  const session: ActiveSession = {
    session_id: sessionId,
    session_token: sessionToken,
    build_id: buildId,
    client_platform: clientPlatform,
    connected_at: new Date().toISOString(),
  };

  sessions.set(sessionId, session);
  return res.json({
    connected: true,
    session_id: sessionId,
    session_token: sessionToken,
    build_id: buildId,
    sdk_contract_version: '1.0.0',
    expires_in_seconds: 3600,
  });
});

app.post('/api/v1/sessions/:sessionId/disconnect', (req, res) => {
  const { sessionId } = req.params;
  const token = extractBearer(req.headers.authorization);
  const session = sessions.get(sessionId);
  if (session && token && safeCompare(token, session.session_token)) {
    sessions.delete(sessionId);
  }
  return res.json({ disconnected: true, session_id: sessionId });
});

app.post('/api/v1/tests/evaluate', (req, res) => {
  const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id : 'simulated-sandbox';
  const module = typeof req.body?.module === 'string' ? req.body.module : '';
  const payload = (req.body?.payload && typeof req.body.payload === 'object') ? req.body.payload : {};

  const allowedModules = new Set([
    'AIM_TEST',
    'ESP_TEST',
    'OVERLAY_TEST',
    'MOVEMENT_TEST',
    'DAMAGE_TEST',
    'FIRE_RATE_TEST',
  ]);
  if (!allowedModules.has(module)) {
    return res.status(400).json({ error: 'Unsupported test module identifier.' });
  }

  // If a real session_id is supplied, verify its Bearer token; otherwise run in authorized local simulator mode
  if (sessionId !== 'simulated-sandbox') {
    const token = extractBearer(req.headers.authorization);
    const session = sessions.get(sessionId);
    if (!session || !token || !safeCompare(token, session.session_token)) {
      return res.status(401).json({ error: 'Unauthorized or expired Gold Fire QA session.' });
    }
  }

  const verdict = evaluateTelemetry(sessionId, module, payload as Record<string, unknown>);
  auditLogs.unshift(verdict);
  if (auditLogs.length > 250) auditLogs.length = 250;
  return res.json(verdict);
});

app.get('/api/v1/logs', (_req, res) => {
  return res.json({ logs: auditLogs.slice(0, 120) });
});

app.delete('/api/v1/logs', (_req, res) => {
  auditLogs.length = 0;
  return res.json({ cleared: true });
});

// --- Multi-Platform Source Explorer & ZIP Exporter ---

const EXPORT_ROOTS = ['android-app', 'python-backend', 'docs'];

interface SourceFileEntry {
  path: string;
  name: string;
  category: string;
  language: string;
  lines: number;
  bytes: number;
  content: string;
}

function classifySourceFile(relPath: string): { category: string; language: string } {
  const lower = relPath.toLowerCase();
  if (lower.endsWith('.kt')) return { category: 'Android Kotlin', language: 'kotlin' };
  if (lower.endsWith('.cpp') || lower.endsWith('.h')) return { category: 'C++17 NDK', language: 'cpp' };
  if (lower.includes('cmakelists.txt') || lower.endsWith('.gradle.kts') || lower.endsWith('.properties') || lower.endsWith('.pro')) {
    return { category: 'Gradle & CMake', language: 'gradle' };
  }
  if (lower.endsWith('.py') || lower.endsWith('requirements.txt')) {
    return { category: 'Python Backend', language: 'python' };
  }
  if (lower.endsWith('.html') || lower.endsWith('.css') || lower.endsWith('.js')) {
    return { category: 'HTML5 / CSS3 / JS', language: lower.split('.').pop() || 'text' };
  }
  if (lower.endsWith('.xml')) return { category: 'Android Kotlin', language: 'xml' };
  if (lower.endsWith('.md')) return { category: 'API & APK Docs', language: 'markdown' };
  return { category: 'Project Config', language: 'text' };
}

function collectProjectSourceFiles(): SourceFileEntry[] {
  const results: SourceFileEntry[] = [];

  function walk(dirAbs: string) {
    if (!fs.existsSync(dirAbs)) return;
    const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'build') continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { category, language } = classifySourceFile(relPath);
        results.push({
          path: relPath,
          name: entry.name,
          category,
          language,
          lines: content.split('\n').length,
          bytes: Buffer.byteLength(content, 'utf-8'),
          content,
        });
      }
    }
  }

  for (const root of EXPORT_ROOTS) {
    walk(path.join(ROOT_DIR, root));
  }

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

app.get('/api/source/files', (_req, res) => {
  const files = collectProjectSourceFiles();
  res.json({
    projectName: 'GOLD FIRE — ADVANCED TEST PANEL',
    totalFiles: files.length,
    files,
  });
});

app.get('/api/source/download-zip', async (_req, res) => {
  try {
    const zip = new JSZip();
    const files = collectProjectSourceFiles();
    for (const file of files) {
      zip.file(file.path, file.content);
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="gold-fire-advanced-test-panel-android-project.zip"'
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assemble project ZIP archive.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GOLD FIRE — ADVANCED TEST PANEL server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
