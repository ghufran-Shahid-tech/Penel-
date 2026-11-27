import { useMemo, useState } from 'react';
import { ShieldAlert, Play, Trash2, Download, Search, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DetectionVerdict, ModuleId, VerdictType } from '../types/panel';
import { MODULE_DEFINITIONS, MODULE_ORDER } from '../data/moduleDefinitions';

interface AntiCheatSuiteViewProps {
  logs: DetectionVerdict[];
  runningSuite: boolean;
  onRunFullSuite: () => void;
  onClearLogs: () => void;
  onJumpToModule: (id: ModuleId) => void;
}

export function AntiCheatSuiteView({
  logs,
  runningSuite,
  onRunFullSuite,
  onClearLogs,
  onJumpToModule,
}: AntiCheatSuiteViewProps) {
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | VerdictType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (verdictFilter !== 'ALL' && entry.verdict !== verdictFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.module.toLowerCase().includes(q) ||
        entry.rule_id.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q)
      );
    });
  }, [logs, verdictFilter, searchQuery]);

  const stats = useMemo(() => {
    const detected = logs.filter((l) => l.verdict === 'DETECTED').length;
    const flagged = logs.filter((l) => l.verdict === 'FLAGGED').length;
    const nominal = logs.filter((l) => l.verdict === 'NOMINAL').length;
    const avgLatency =
      logs.length > 0
        ? logs.reduce((acc, item) => acc + item.latency_ms, 0) / logs.length
        : 0;
    return { detected, flagged, nominal, avgLatency };
  }, [logs]);

  const handleExportReport = () => {
    const report = {
      application: 'GOLD FIRE — ADVANCED TEST PANEL',
      exportedAt: new Date().toISOString(),
      summary: {
        totalEvents: logs.length,
        detected: stats.detected,
        flagged: stats.flagged,
        nominal: stats.nominal,
        averageLatencyMs: Number(stats.avgLatency.toFixed(2)),
      },
      events: logs,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gold-fire-anticheat-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">Anti-Cheat Test Suite</h1>
            <p className="mt-1 text-sm text-slate-300">
              Run all six authorized security vectors sequentially, inspect Gold Fire anti-cheat responses, and export structured QA logs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={runningSuite}
              onClick={onRunFullSuite}
              className="inline-flex min-h-[42px] whitespace-nowrap shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/15 transition-opacity hover:opacity-95 disabled:opacity-50 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              {runningSuite ? 'Running Detection Suite...' : 'Run All Detection Tests'}
            </button>
            <button
              type="button"
              disabled={logs.length === 0}
              onClick={handleExportReport}
              className="inline-flex min-h-[42px] whitespace-nowrap shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" />
              Export JSON
            </button>
            <button
              type="button"
              disabled={logs.length === 0}
              onClick={onClearLogs}
              className="inline-flex min-h-[42px] whitespace-nowrap shrink-0 items-center gap-1.5 rounded-xl border border-slate-800 px-3.5 py-2 text-xs font-medium text-slate-400 hover:border-slate-700 hover:text-rose-300 disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Logs
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-5 sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-400">Total Events Evaluated</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">{logs.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Caught & Mitigated</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-400">{stats.detected}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Flagged for Review</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-400">{stats.flagged}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Mean Response Latency</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-sky-300">
              {logs.length > 0 ? `${stats.avgLatency.toFixed(2)} ms` : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Per-Vector Security Response Coverage Matrix */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl">
        <h2 className="text-base font-semibold text-white">Vector Detection Coverage</h2>
        <p className="mt-1 text-xs text-slate-400">
          Select any security vector to tune its individual test engine parameters.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_ORDER.map((id) => {
            const def = MODULE_DEFINITIONS[id];
            const modLogs = logs.filter((l) => l.module === def.apiModule);
            const last = modLogs[0];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onJumpToModule(id)}
                className="flex flex-col items-start rounded-xl border border-slate-800/80 bg-[#080B12] p-4 text-left transition-colors hover:border-sky-500/40 hover:bg-[#0D121D] cursor-pointer"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{def.title}</span>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    {modLogs.length} runs
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  {last ? (
                    <span
                      className={
                        last.verdict === 'DETECTED'
                          ? 'font-medium text-emerald-400'
                          : last.verdict === 'FLAGGED'
                            ? 'font-medium text-amber-400'
                            : 'text-slate-300'
                      }
                    >
                      {last.verdict} · {last.rule_id}
                    </span>
                  ) : (
                    <span>Not tested yet</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filterable Audit Logs Table */}
      <section className="rounded-2xl border border-slate-800/80 bg-[#0C1018]/80 p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Security Response Logs</h2>
            <p className="text-xs text-slate-400">
              Showing {filteredLogs.length} of {logs.length} recorded anti-cheat evaluations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter rule or module..."
                className="min-h-[38px] rounded-xl border border-slate-800 bg-[#07090F] pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#07090F] p-1">
              {(['ALL', 'DETECTED', 'FLAGGED', 'NOMINAL'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setVerdictFilter(tab)}
                  className={`whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    verdictFilter === tab
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#07090F] px-4 py-10 text-center">
              <ShieldAlert className="h-7 w-7 text-slate-600" />
              <p className="mt-2 text-sm font-medium text-slate-300">No anti-cheat logs match the current filter</p>
              <p className="mt-1 text-xs text-slate-500">
                Click Run All Detection Tests above to validate every Gold Fire security rule.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 pr-3 font-medium">Timestamp</th>
                    <th className="pb-2.5 pr-3 font-medium">Module</th>
                    <th className="pb-2.5 pr-3 font-medium">Verdict</th>
                    <th className="pb-2.5 pr-3 font-medium">Rule & Action</th>
                    <th className="pb-2.5 text-right font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.map((log) => (
                    <tr key={log.event_id} className="hover:bg-slate-900/50">
                      <td className="py-3 pr-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 pr-3 font-mono font-medium text-slate-200 whitespace-nowrap">
                        {log.module}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold ${
                            log.verdict === 'DETECTED'
                              ? 'text-emerald-400'
                              : log.verdict === 'FLAGGED'
                                ? 'text-amber-400'
                                : 'text-slate-300'
                          }`}
                        >
                          {log.verdict === 'DETECTED' ? (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          ) : log.verdict === 'FLAGGED' ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {log.verdict}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-mono text-slate-300">{log.rule_id} · {log.severity}</div>
                        <div className="mt-0.5 text-slate-400">{log.details}</div>
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {log.latency_ms.toFixed(2)} ms
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
  );
}
