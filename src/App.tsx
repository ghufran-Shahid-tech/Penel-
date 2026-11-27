import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Link2,
  Code2,
  Layers,
  Smartphone,
  Monitor,
  Sliders,
} from 'lucide-react';
import type {
  DetectionVerdict,
  GoldFireBuild,
  ModuleConfigState,
  ModuleId,
  NavDestination,
  SessionState,
} from './types/panel';
import { MODULE_DEFINITIONS, MODULE_ORDER } from './data/moduleDefinitions';
import { GoldFireCrest, ModuleVectorIcon } from './components/CustomIcons';
import { TestModulePanel } from './components/TestModulePanel';
import { AntiCheatSuiteView } from './components/AntiCheatSuiteView';
import { GameConnectionView } from './components/GameConnectionView';
import { SourceStudioView } from './components/SourceStudioView';
import { FloatingPanelOverlay } from './components/FloatingPanelOverlay';

function createInitialModuleStates(): Record<ModuleId, ModuleConfigState> {
  const result = {} as Record<ModuleId, ModuleConfigState>;
  for (const id of MODULE_ORDER) {
    result[id] = {
      enabled: true,
      running: false,
      params: { ...MODULE_DEFINITIONS[id].defaultParams },
      results: [],
      telemetrySeries: [],
    };
  }
  return result;
}

const DEFAULT_BUILDS: GoldFireBuild[] = [
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

export default function App() {
  const [nav, setNav] = useState<NavDestination>('modules');
  const [activeModule, setActiveModule] = useState<ModuleId>('aim');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [androidPreviewMode, setAndroidPreviewMode] = useState(false);

  const [moduleStates, setModuleStates] = useState<Record<ModuleId, ModuleConfigState>>(
    createInitialModuleStates
  );
  const [allLogs, setAllLogs] = useState<DetectionVerdict[]>([]);
  const [runningSuite, setRunningSuite] = useState(false);

  // Floating overlay mode state + explicit consent
  const [overlayConsentGranted, setOverlayConsentGranted] = useState(false);
  const [showOverlayConsent, setShowOverlayConsent] = useState(false);
  const [floatingOpen, setFloatingOpen] = useState(false);

  // Game connection & integration health state
  const [builds, setBuilds] = useState<GoldFireBuild[]>(DEFAULT_BUILDS);
  const [session, setSession] = useState<SessionState>({
    connected: false,
    sessionId: null,
    sessionToken: null,
    buildId: DEFAULT_BUILDS[0].id,
    buildName: DEFAULT_BUILDS[0].name,
    connectedAt: null,
    mode: 'LOCAL_SANDBOX',
  });
  const [integrationHealth, setIntegrationHealth] = useState<{
    checked: boolean;
    status: string;
    protocolVersion: string;
    activeSessions: number;
    latencyMs: number | null;
    error?: string;
  }>({
    checked: false,
    status: 'unknown',
    protocolVersion: '1.0.0',
    activeSessions: 0,
    latencyMs: null,
  });

  // Refs for interval timers & latest params/session inside streaming callbacks
  const timersRef = useRef<Partial<Record<ModuleId, ReturnType<typeof setInterval>>>>({});
  const moduleStatesRef = useRef(moduleStates);
  const sessionRef = useRef(session);
  const tickCounterRef = useRef(1);

  useEffect(() => {
    moduleStatesRef.current = moduleStates;
  }, [moduleStates]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const checkIntegrationHealth = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/v1/health');
      const data = await res.json();
      const elapsed = performance.now() - start;
      if (Array.isArray(data.builds) && data.builds.length > 0) {
        setBuilds(data.builds);
      }
      setIntegrationHealth({
        checked: true,
        status: data.status || 'ready',
        protocolVersion: data.protocol_version || '1.0.0',
        activeSessions: Number(data.active_sessions ?? 0),
        latencyMs: elapsed,
      });
    } catch (err) {
      setIntegrationHealth({
        checked: true,
        status: 'offline',
        protocolVersion: '—',
        activeSessions: 0,
        latencyMs: null,
        error: err instanceof Error ? err.message : 'Unable to reach API',
      });
    }
  }, []);

  useEffect(() => {
    checkIntegrationHealth();
    return () => {
      Object.values(timersRef.current).forEach((timer) => {
        if (timer) clearInterval(timer);
      });
    };
  }, [checkIntegrationHealth]);

  const dispatchModuleEvent = useCallback(async (id: ModuleId) => {
    const def = MODULE_DEFINITIONS[id];
    const currentMod = moduleStatesRef.current[id];
    if (!currentMod || !currentMod.enabled) return;

    const activeSess = sessionRef.current;
    // Add slight realistic jitter around configured parameter values when streaming
    const payload: Record<string, unknown> = { ...currentMod.params };
    if (id === 'aim') {
      const baseVel = Number(payload.angular_velocity_dps ?? 760);
      payload.angular_velocity_dps = Math.max(80, Math.round(baseVel + (Math.random() - 0.5) * 44));
    } else if (id === 'movement') {
      const baseMult = Number(payload.speed_multiplier ?? 2.35);
      payload.speed_multiplier = Number(Math.max(0.5, baseMult + (Math.random() - 0.5) * 0.14).toFixed(2));
    } else if (id === 'firerate') {
      const baseRpm = Number(payload.simulated_rpm ?? 1420);
      payload.simulated_rpm = Math.max(200, Math.round(baseRpm + (Math.random() - 0.5) * 60));
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (activeSess.connected && activeSess.sessionToken) {
      headers.Authorization = `Bearer ${activeSess.sessionToken}`;
    }

    try {
      const res = await fetch('/api/v1/tests/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: activeSess.connected && activeSess.sessionId ? activeSess.sessionId : 'simulated-sandbox',
          module: def.apiModule,
          payload,
        }),
      });
      if (!res.ok) return;
      const verdict: DetectionVerdict = await res.json();
      const tick = tickCounterRef.current++;

      setModuleStates((prev) => {
        const target = prev[id];
        return {
          ...prev,
          [id]: {
            ...target,
            results: [verdict, ...target.results].slice(0, 30),
            telemetrySeries: [
              ...target.telemetrySeries,
              {
                tick,
                value: verdict.metric_value,
                threshold: verdict.threshold_value,
                verdict: verdict.verdict,
              },
            ].slice(-20),
          },
        };
      });

      setAllLogs((prev) => [verdict, ...prev].slice(0, 150));
    } catch {
      // Keep UI resilient if transient request fails
    }
  }, []);

  const stopModuleStream = useCallback((id: ModuleId) => {
    const existing = timersRef.current[id];
    if (existing) {
      clearInterval(existing);
      delete timersRef.current[id];
    }
    setModuleStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], running: false },
    }));
  }, []);

  const startModuleStream = useCallback(
    (id: ModuleId) => {
      if (!moduleStatesRef.current[id].enabled) return;
      if (timersRef.current[id]) return;

      setModuleStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], running: true },
      }));

      // Immediate pulse followed by steady 1.2s telemetry stream
      dispatchModuleEvent(id);
      timersRef.current[id] = setInterval(() => {
        dispatchModuleEvent(id);
      }, 1200);
    },
    [dispatchModuleEvent]
  );

  const toggleModuleEnabled = useCallback(
    (id: ModuleId) => {
      const nextEnabled = !moduleStatesRef.current[id].enabled;
      if (!nextEnabled) {
        stopModuleStream(id);
      }
      setModuleStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], enabled: nextEnabled, running: nextEnabled ? prev[id].running : false },
      }));
    },
    [stopModuleStream]
  );

  const resetModule = useCallback(
    (id: ModuleId) => {
      stopModuleStream(id);
      setModuleStates((prev) => ({
        ...prev,
        [id]: {
          enabled: true,
          running: false,
          params: { ...MODULE_DEFINITIONS[id].defaultParams },
          results: [],
          telemetrySeries: [],
        },
      }));
    },
    [stopModuleStream]
  );

  const updateModuleParam = useCallback(
    (id: ModuleId, key: string, value: number | boolean | string) => {
      setModuleStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          params: { ...prev[id].params, [key]: value },
        },
      }));
    },
    []
  );

  const runFullAntiCheatSuite = useCallback(async () => {
    setRunningSuite(true);
    for (const id of MODULE_ORDER) {
      if (moduleStatesRef.current[id].enabled) {
        await dispatchModuleEvent(id);
        await new Promise((resolve) => setTimeout(resolve, 140));
      }
    }
    setRunningSuite(false);
  }, [dispatchModuleEvent]);

  const clearAllLogs = useCallback(async () => {
    setAllLogs([]);
    try {
      await fetch('/api/v1/logs', { method: 'DELETE' });
    } catch {
      // Ignore network clear failure
    }
  }, []);

  const connectSession = useCallback(
    async (buildId: string, apiKey: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/v1/sessions/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            build_id: buildId,
            client_platform: 'goldfire-panel-android-web',
            protocol_version: '1.0.0',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.connected) {
          return { ok: false, error: data.error || 'Authentication rejected by Gold Fire API.' };
        }
        const matchedBuild = builds.find((b) => b.id === buildId);
        setSession({
          connected: true,
          sessionId: data.session_id,
          sessionToken: data.session_token,
          buildId,
          buildName: matchedBuild?.name || buildId,
          connectedAt: new Date().toISOString(),
          mode: 'AUTHORIZED_API',
        });
        checkIntegrationHealth();
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Connection failed',
        };
      }
    },
    [builds, checkIntegrationHealth]
  );

  const disconnectSession = useCallback(async () => {
    const active = sessionRef.current;
    if (active.sessionId && active.sessionToken) {
      try {
        await fetch(`/api/v1/sessions/${active.sessionId}/disconnect`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${active.sessionToken}`,
          },
        });
      } catch {
        // Proceed with local cleanup safely
      }
    }
    setSession((prev) => ({
      ...prev,
      connected: false,
      sessionId: null,
      sessionToken: null,
      connectedAt: null,
      mode: 'LOCAL_SANDBOX',
    }));
    checkIntegrationHealth();
  }, [checkIntegrationHealth]);

  const handleOpenFloatingPanel = () => {
    if (!overlayConsentGranted) {
      setShowOverlayConsent(true);
    } else {
      setFloatingOpen((prev) => !prev);
    }
  };

  const activeRunningCount = MODULE_ORDER.filter((id) => moduleStates[id].running).length;

  return (
    <div className="min-h-screen bg-[#06070A] text-slate-100">
      {/* Subtle Ambient Top Radial Highlight (Restrained 10% accent glow) */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-72 opacity-40"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, rgba(56, 189, 248, 0.14) 0%, rgba(168, 85, 247, 0.08) 45%, rgba(6, 7, 10, 0) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#06070A]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setNav('modules')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            <GoldFireCrest className="h-7 w-7 shrink-0" />
            <span className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
              Gold Fire Test Panel
            </span>
          </button>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Panel Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {(
              [
                { id: 'modules', label: 'Test Modules' },
                { id: 'anticheat', label: 'Anti-Cheat Suite' },
                { id: 'connection', label: 'Game Connection' },
                { id: 'source', label: 'Source & APK' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setNav(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  nav === item.id
                    ? 'text-white after:absolute after:inset-x-0 after:-bottom-[21px] after:h-[2px] after:bg-gradient-to-r after:from-sky-400 after:to-purple-500'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleOpenFloatingPanel}
              className="inline-flex min-h-[40px] whitespace-nowrap shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/15 transition-opacity hover:opacity-95 cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5" />
              {floatingOpen ? 'Hide Floating Panel' : 'Floating Panel'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="relative z-10 mx-auto flex max-w-[1440px] gap-6 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
        {/* Expandable & Collapsible Desktop Sidebar for all 7 Test Sections */}
        <aside
          className={`hidden md:flex shrink-0 flex-col rounded-2xl border border-slate-800/80 bg-[#0B0E16]/85 p-3 backdrop-blur-xl transition-all duration-200 self-start sticky top-22 ${
            sidebarCollapsed ? 'w-[76px]' : 'w-[252px]'
          }`}
        >
          <div className="mb-3 flex items-center justify-between px-1.5">
            {!sidebarCollapsed && (
              <span className="text-xs font-semibold text-slate-400">
                Security Test Vectors
              </span>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand navigation panel' : 'Collapse navigation panel'}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white cursor-pointer"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="space-y-1">
            {MODULE_ORDER.map((id) => {
              const def = MODULE_DEFINITIONS[id];
              const st = moduleStates[id];
              const isSelected = nav === 'modules' && activeModule === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveModule(id);
                    setNav('modules');
                  }}
                  title={def.title}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/15 text-white'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? def.accent === 'blue'
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-purple-500/20 text-purple-300'
                        : 'bg-slate-900/80 text-slate-400'
                    }`}
                  >
                    <ModuleVectorIcon id={id} className="h-4 w-4" />
                  </span>
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{def.title}</div>
                      <div className="truncate font-mono text-[11px] tabular-nums text-slate-500">
                        {st.running
                          ? 'Running'
                          : st.enabled
                            ? `${st.results.length} events`
                            : 'Disabled'}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}

            <div className="my-2 border-t border-slate-800/80" />

            <button
              type="button"
              onClick={() => setNav('anticheat')}
              title="Anti-Cheat Test"
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                nav === 'anticheat'
                  ? 'bg-purple-500/15 text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  nav === 'anticheat'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-slate-900/80 text-slate-400'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
              </span>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">Anti-Cheat Test</div>
                  <div className="truncate font-mono text-[11px] tabular-nums text-slate-500">
                    {allLogs.length} audit logs
                  </div>
                </div>
              )}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="mt-4 border-t border-slate-800/80 pt-3 px-1.5 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Target Build</span>
                <span className="font-mono text-slate-200 truncate max-w-[120px]">
                  {session.connected ? session.buildId : 'Sandbox'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Streams</span>
                <span className="font-mono tabular-nums text-sky-300">{activeRunningCount} / 6</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">
          {/* Workspace Context Toolbar (Viewport Switch + Mobile Module Scroller) */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#0B0E16]/75 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
              <span className="font-semibold text-white">
                {session.connected ? `Connected: ${session.buildName}` : 'Authorized QA Sandbox Mode'}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-400">
                {activeRunningCount} active streams
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-400">
                {allLogs.length} verified events
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-1 rounded-xl border border-slate-800 bg-[#07090F] p-1">
              <button
                type="button"
                onClick={() => setAndroidPreviewMode(false)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  !androidPreviewMode
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop Panel
              </button>
              <button
                type="button"
                onClick={() => setAndroidPreviewMode(true)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  androidPreviewMode
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Android Screen Frame
              </button>
            </div>
          </div>

          {/* Mobile Horizontal Module Selector when in Test Modules */}
          {nav === 'modules' && (
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
              {MODULE_ORDER.map((id) => {
                const def = MODULE_DEFINITIONS[id];
                const isSelected = activeModule === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveModule(id)}
                    className={`min-h-[40px] whitespace-nowrap shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-sky-500/50 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-[#0B0E16] text-slate-400'
                    }`}
                  >
                    {def.title}
                  </button>
                );
              })}
            </div>
          )}

          {/* Optional Responsive Android Portrait Frame Wrapper */}
          <div
            className={
              androidPreviewMode
                ? 'mx-auto max-w-[430px] rounded-[28px] border-2 border-slate-700/80 bg-[#06070A] p-3.5 shadow-2xl shadow-purple-500/10'
                : ''
            }
          >
            {androidPreviewMode && (
              <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2 text-[11px] font-mono text-slate-400">
                <span>Android 10+ Viewport (412dp)</span>
                <span>APK WebView Parity</span>
              </div>
            )}

            {nav === 'modules' && (
              <TestModulePanel
                definition={MODULE_DEFINITIONS[activeModule]}
                state={moduleStates[activeModule]}
                overlayConsentGranted={overlayConsentGranted}
                onToggleEnabled={() => toggleModuleEnabled(activeModule)}
                onStart={() => startModuleStream(activeModule)}
                onStop={() => stopModuleStream(activeModule)}
                onPulse={() => dispatchModuleEvent(activeModule)}
                onReset={() => resetModule(activeModule)}
                onParamChange={(k, v) => updateModuleParam(activeModule, k, v)}
                onLaunchFloatingOverlay={handleOpenFloatingPanel}
              />
            )}

            {nav === 'anticheat' && (
              <AntiCheatSuiteView
                logs={allLogs}
                runningSuite={runningSuite}
                onRunFullSuite={runFullAntiCheatSuite}
                onClearLogs={clearAllLogs}
                onJumpToModule={(id) => {
                  setActiveModule(id);
                  setNav('modules');
                }}
              />
            )}

            {nav === 'connection' && (
              <GameConnectionView
                builds={builds}
                session={session}
                integrationHealth={integrationHealth}
                onCheckIntegration={checkIntegrationHealth}
                onConnect={connectSession}
                onDisconnect={disconnectSession}
              />
            )}

            {nav === 'source' && <SourceStudioView />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Thumb Navigation Bar (Android ergonomics, <= 15% sticky height cap) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800/90 bg-[#06070A]/95 backdrop-blur-xl md:hidden"
      >
        <div className="grid h-16 grid-cols-4 items-center">
          {(
            [
              { id: 'modules', label: 'Tests', icon: Sliders },
              { id: 'anticheat', label: 'Anti-Cheat', icon: ShieldCheck },
              { id: 'connection', label: 'Connect', icon: Link2 },
              { id: 'source', label: 'Source', icon: Code2 },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setNav(item.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer ${
                  active ? 'text-sky-400' : 'text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Optional Movable, Draggable, Resizable Floating Panel Overlay */}
      <FloatingPanelOverlay
        open={floatingOpen}
        consentGranted={overlayConsentGranted}
        showConsentModal={showOverlayConsent}
        moduleStates={moduleStates}
        sessionConnected={session.connected}
        onGrantConsent={() => {
          setOverlayConsentGranted(true);
          setShowOverlayConsent(false);
          setFloatingOpen(true);
        }}
        onDeclineConsent={() => {
          setShowOverlayConsent(false);
        }}
        onClose={() => setFloatingOpen(false)}
        onToggleStartStop={(id) => {
          if (moduleStates[id].running) {
            stopModuleStream(id);
          } else {
            startModuleStream(id);
          }
        }}
        onPulseModule={(id) => dispatchModuleEvent(id)}
        onRunAllSuite={runFullAntiCheatSuite}
      />
    </div>
  );
}
