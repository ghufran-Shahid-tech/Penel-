import { useState } from 'react';
import { Link2, Unlink, RefreshCw, ShieldCheck, Lock, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import type { GoldFireBuild, SessionState } from '../types/panel';

interface GameConnectionViewProps {
  builds: GoldFireBuild[];
  session: SessionState;
  integrationHealth: {
    checked: boolean;
    status: string;
    protocolVersion: string;
    activeSessions: number;
    latencyMs: number | null;
    error?: string;
  };
  onCheckIntegration: () => Promise<void>;
  onConnect: (buildId: string, apiKey: string) => Promise<{ ok: boolean; error?: string }>;
  onDisconnect: () => Promise<void>;
}

export function GameConnectionView({
  builds,
  session,
  integrationHealth,
  onCheckIntegration,
  onConnect,
  onDisconnect,
}: GameConnectionViewProps) {
  const [selectedBuildId, setSelectedBuildId] = useState(
    session.buildId || builds[0]?.id || 'goldfire-staging-2.4.1'
  );
  const [apiKey, setApiKey] = useState('gf-qa-authorized-token');
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const handleHealthCheck = async () => {
    setChecking(true);
    setFeedback(null);
    await onCheckIntegration();
    setChecking(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setFeedback(null);
    const result = await onConnect(selectedBuildId, apiKey);
    setConnecting(false);
    if (result.ok) {
      setFeedback({ type: 'ok', text: 'Authorized Gold Fire QA session established.' });
    } else {
      setFeedback({ type: 'error', text: result.error || 'Authentication failed.' });
    }
  };

  const handleDisconnect = async () => {
    await onDisconnect();
    setFeedback({ type: 'ok', text: 'Disconnected safely and revoked test session token.' });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">Game Connection</h1>
            <p className="mt-1 text-sm text-slate-300">
              Select a target Gold Fire QA build, verify SDK integration status, and start an authenticated anti-cheat testing session.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleHealthCheck}
              disabled={checking}
              className="inline-flex min-h-[42px] whitespace-nowrap shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-sky-400 ${checking ? 'animate-spin' : ''}`} />
              Check Integration Status
            </button>
          </div>
        </div>

        {/* Integration & Session Status Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-800/80 pt-5 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-400">Session State</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
              {session.connected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Authenticated Session Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">Disconnected (Sandbox Ready)</span>
                </>
              )}
            </div>
            <div className="mt-1 font-mono text-xs text-slate-500">
              {session.sessionId ? `ID: ${session.sessionId}` : 'No active remote session'}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">SDK API Integration</div>
            <div className="mt-1 text-sm font-semibold text-white">
              {integrationHealth.checked
                ? integrationHealth.status === 'ready'
                  ? 'API Ready · Protocol ' + integrationHealth.protocolVersion
                  : 'API Unreachable'
                : 'Not Checked Yet'}
            </div>
            <div className="mt-1 font-mono text-xs tabular-nums text-slate-500">
              {integrationHealth.latencyMs !== null
                ? `Handshake ${integrationHealth.latencyMs.toFixed(1)} ms · ${integrationHealth.activeSessions} active`
                : 'Click Check Integration Status'}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Security Boundary</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-sky-300">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Authorized SDK API Only</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              No external memory access or root hooks
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Target Gold Fire Build Selection */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl xl:col-span-7">
          <h2 className="text-base font-semibold text-white">Select Target Gold Fire Test Build</h2>
          <p className="mt-1 text-xs text-slate-400">
            Choose which instrumented Gold Fire QA environment will receive test telemetry events.
          </p>

          <div className="mt-4 space-y-3">
            {builds.map((build) => {
              const selected = selectedBuildId === build.id;
              return (
                <button
                  key={build.id}
                  type="button"
                  onClick={() => setSelectedBuildId(build.id)}
                  className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    selected
                      ? 'border-sky-500/60 bg-sky-500/10'
                      : 'border-slate-800 bg-[#080B12] hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Server className={`h-4 w-4 ${selected ? 'text-sky-400' : 'text-slate-500'}`} />
                      <span className="text-sm font-semibold text-white">{build.name}</span>
                    </div>
                    <div className="font-mono text-xs text-slate-400">
                      {build.id} · Version {build.version} · SDK v{build.sdkProtocol}
                    </div>
                    <div className="text-xs text-slate-400">
                      Profile: {build.antiCheatProfile}
                    </div>
                  </div>
                  <span
                    className={`mt-1 text-xs font-semibold ${
                      selected ? 'text-sky-300' : 'text-slate-500'
                    }`}
                  >
                    {selected ? 'Selected' : 'Choose'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Authentication & Session Control */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl xl:col-span-5">
          <h2 className="text-base font-semibold text-white">Authorized Session Handshake</h2>
          <p className="mt-1 text-xs text-slate-400">
            Authenticate with your Gold Fire QA token to bind a scoped testing session.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="qa-endpoint" className="block text-xs font-medium text-slate-300">
                Testing API Endpoint
              </label>
              <input
                id="qa-endpoint"
                type="text"
                readOnly
                value="/api/v1/sessions/connect"
                className="min-h-[42px] w-full rounded-xl border border-slate-800 bg-[#07090F] px-3 py-2 font-mono text-xs text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="qa-token" className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>QA Authorization Token</span>
                <span className="font-mono text-[11px] text-slate-500">Default QA Key prefilled</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  id="qa-token"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter authorized Gold Fire QA token"
                  className="min-h-[42px] w-full rounded-xl border border-slate-800 bg-[#07090F] pl-9 pr-3 font-mono text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {feedback && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                  feedback.type === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {!session.connected ? (
                <button
                  type="button"
                  disabled={connecting}
                  onClick={handleConnect}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/15 hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  <Link2 className="h-4 w-4" />
                  {connecting ? 'Authenticating...' : 'Connect & Start Session'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 cursor-pointer"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect Safely
                </button>
              )}
            </div>
          </div>

          {/* Transparent SDK Security Architecture Note */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 text-xs leading-relaxed text-slate-400">
            <strong className="font-semibold text-slate-200">Explicit SDK Integration Policy:</strong>{' '}
            This standalone Android panel never attempts to inspect or modify another process&apos;s private memory. Live game verification communicates strictly over TLS/Bearer API endpoints exposed by your own instrumented Gold Fire test build.
          </div>
        </section>
      </div>
    </div>
  );
}
