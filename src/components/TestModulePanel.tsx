import { Play, Square, RotateCcw, Zap, ShieldCheck, AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import type { ModuleConfigState, ModuleDefinition, VerdictType } from '../types/panel';
import { ModuleVectorIcon } from './CustomIcons';
import { TelemetryChart } from './TelemetryChart';

interface TestModulePanelProps {
  definition: ModuleDefinition;
  state: ModuleConfigState;
  overlayConsentGranted: boolean;
  onToggleEnabled: () => void;
  onStart: () => void;
  onStop: () => void;
  onPulse: () => void;
  onReset: () => void;
  onParamChange: (key: string, value: number | boolean | string) => void;
  onLaunchFloatingOverlay: () => void;
}

function verdictTextClass(verdict: VerdictType): string {
  switch (verdict) {
    case 'DETECTED':
      return 'text-emerald-400';
    case 'FLAGGED':
      return 'text-amber-400';
    case 'UNDETECTED_GAP':
      return 'text-rose-400';
    default:
      return 'text-slate-300';
  }
}

function verdictLabel(verdict: VerdictType): string {
  switch (verdict) {
    case 'DETECTED':
      return 'Detected by AC';
    case 'FLAGGED':
      return 'Flagged Review';
    case 'UNDETECTED_GAP':
      return 'Missed Gap';
    default:
      return 'Nominal Baseline';
  }
}

export function TestModulePanel({
  definition,
  state,
  overlayConsentGranted,
  onToggleEnabled,
  onStart,
  onStop,
  onPulse,
  onReset,
  onParamChange,
  onLaunchFloatingOverlay,
}: TestModulePanelProps) {
  const detectedCount = state.results.filter((r) => r.verdict === 'DETECTED').length;
  const latest = state.results[0] || null;
  const accentRing =
    definition.accent === 'blue'
      ? 'text-sky-400 border-sky-500/30 bg-sky-500/10'
      : 'text-purple-400 border-purple-500/30 bg-purple-500/10';

  return (
    <div className="space-y-6">
      {/* Module Header & Primary Controls */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accentRing}`}>
                <ModuleVectorIcon id={definition.id} className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {definition.title}
                </h1>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                  <span>Module: {state.enabled ? 'Enabled' : 'Disabled'}</span>
                  <span aria-hidden="true">·</span>
                  <span>Execution: {state.running ? 'Running Stream' : 'Idle'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Events: {state.results.length} ({detectedCount} detected)
                  </span>
                </div>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              {definition.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-400">
              {definition.capabilities.map((cap, i) => (
                <span key={cap} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="text-slate-700" aria-hidden="true">/</span>}
                  <span>{cap}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Standard Test Engine Controls: Enable/Disable, Start, Stop, Single Pulse, Reset */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`min-h-[42px] whitespace-nowrap shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                state.enabled
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/20'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {state.enabled ? 'Enabled' : 'Disabled'}
            </button>

            {!state.running ? (
              <button
                type="button"
                disabled={!state.enabled}
                onClick={onStart}
                className="inline-flex min-h-[42px] whitespace-nowrap shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/15 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                Start Test
              </button>
            ) : (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex min-h-[42px] whitespace-nowrap shrink-0 items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
                Stop Test
              </button>
            )}

            <button
              type="button"
              disabled={!state.enabled}
              onClick={onPulse}
              className="inline-flex min-h-[42px] whitespace-nowrap shrink-0 items-center gap-1.5 rounded-xl border border-slate-700/90 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-sky-400" />
              Single Pulse
            </button>

            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-[42px] whitespace-nowrap shrink-0 items-center gap-1.5 rounded-xl border border-slate-800 bg-transparent px-3.5 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-5 sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-400">Last Detection Verdict</div>
            <div className={`mt-1 text-sm font-semibold ${latest ? verdictTextClass(latest.verdict) : 'text-slate-500'}`}>
              {latest ? verdictLabel(latest.verdict) : 'Not Run Yet'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Triggered Rule ID</div>
            <div className="mt-1 font-mono text-sm font-medium tabular-nums text-slate-200">
              {latest ? latest.rule_id : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Evaluation Latency</div>
            <div className="mt-1 font-mono text-sm font-medium tabular-nums text-slate-200">
              {latest ? `${latest.latency_ms.toFixed(2)} ms` : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Detection Rate</div>
            <div className="mt-1 font-mono text-sm font-medium tabular-nums text-sky-300">
              {state.results.length > 0
                ? `${Math.round((detectedCount / state.results.length) * 100)}%`
                : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Simulation Parameters + Live Telemetry */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Parameter Controls */}
        <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl xl:col-span-5">
          <h2 className="text-base font-semibold text-white">Simulation Parameters</h2>
          <p className="mt-1 text-xs text-slate-400">
            Adjust synthetic telemetry values dispatched to the Gold Fire verification engine.
          </p>

          <div className="mt-5 space-y-5">
            {definition.paramDescriptors.map((param) => {
              const val = state.params[param.key];

              if (param.type === 'select' && param.options) {
                return (
                  <div key={param.key} className="space-y-2">
                    <label
                      htmlFor={`param-${definition.id}-${param.key}`}
                      className="block text-xs font-medium text-slate-300"
                    >
                      {param.label}
                    </label>
                    <select
                      id={`param-${definition.id}-${param.key}`}
                      value={String(val)}
                      onChange={(e) => onParamChange(param.key, e.target.value)}
                      className="min-h-[42px] w-full rounded-xl border border-slate-800 bg-[#07090F] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                    >
                      {param.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (param.type === 'boolean') {
                const checked = Boolean(val);
                return (
                  <div
                    key={param.key}
                    className="flex items-center justify-between gap-4 border-t border-slate-800/60 pt-4"
                  >
                    <span className="text-xs font-medium text-slate-300">{param.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      onClick={() => onParamChange(param.key, !checked)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        checked ? 'bg-sky-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              }

              const numVal = Number(val);
              return (
                <div key={param.key} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor={`param-${definition.id}-${param.key}`}
                      className="font-medium text-slate-300"
                    >
                      {param.label}
                    </label>
                    <span className="font-mono font-semibold tabular-nums text-sky-300">
                      {param.unit === 'ratio'
                        ? `${Math.round(numVal * 100)}%`
                        : `${numVal} ${param.unit || ''}`}
                    </span>
                  </div>
                  <input
                    id={`param-${definition.id}-${param.key}`}
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={numVal}
                    onChange={(e) => onParamChange(param.key, Number(e.target.value))}
                    className="gf-slider w-full"
                  />
                </div>
              );
            })}
          </div>

          {/* Dedicated Android Overlay Permission Diagnostics when on Overlay Test */}
          {definition.id === 'overlay' && (
            <div className="mt-6 border-t border-slate-800/80 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Android Overlay Permission Diagnostics
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    SYSTEM_ALERT_WINDOW: {overlayConsentGranted ? 'Consent Granted' : 'Awaiting User Consent'} · Android 10+ (API 29+)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLaunchFloatingOverlay}
                  className="inline-flex min-h-[40px] whitespace-nowrap shrink-0 items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-3 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-500/25 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Test Floating Overlay
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Live Telemetry & Results Stream */}
        <section className="space-y-5 xl:col-span-7">
          <TelemetryChart
            points={state.telemetrySeries}
            metricLabel={definition.metricLabel}
            metricUnit={definition.metricUnit}
            thresholdLabel={definition.thresholdLabel}
            accent={definition.accent}
          />

          <div className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Detection Results</h2>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                Showing {state.results.length} recent events
              </span>
            </div>

            {state.results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-[#080A10] px-4 py-8 text-center text-sm text-slate-400">
                No telemetry events recorded for {definition.title} yet. Click <span className="font-medium text-white">Start Test</span> or <span className="font-medium text-white">Single Pulse</span> to validate anti-cheat detection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2.5 pr-3 font-medium">Time</th>
                      <th className="pb-2.5 pr-3 font-medium">Verdict</th>
                      <th className="pb-2.5 pr-3 font-medium">Rule ID</th>
                      <th className="pb-2.5 pr-3 font-medium">Details</th>
                      <th className="pb-2.5 text-right font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {state.results.slice(0, 10).map((item) => (
                      <tr key={item.event_id} className="hover:bg-slate-900/50">
                        <td className="py-3 pr-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${verdictTextClass(item.verdict)}`}>
                            {item.verdict === 'DETECTED' ? (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            ) : item.verdict === 'FLAGGED' ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            {verdictLabel(item.verdict)}
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                          {item.rule_id}
                        </td>
                        <td className="py-3 pr-3 text-slate-300 max-w-xs">
                          <p className="line-clamp-2">{item.details}</p>
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-slate-400 whitespace-nowrap">
                          {item.latency_ms.toFixed(1)} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
