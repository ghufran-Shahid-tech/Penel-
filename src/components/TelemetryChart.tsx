import type { VerdictType } from '../types/panel';

interface TelemetryPoint {
  tick: number;
  value: number;
  threshold: number;
  verdict: VerdictType;
}

interface TelemetryChartProps {
  points: TelemetryPoint[];
  metricLabel: string;
  metricUnit: string;
  thresholdLabel: string;
  accent: 'blue' | 'purple';
}

export function TelemetryChart({
  points,
  metricLabel,
  metricUnit,
  thresholdLabel,
  accent,
}: TelemetryChartProps) {
  const width = 640;
  const height = 176;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const latest = points[points.length - 1];
  const maxVal = Math.max(
    10,
    ...points.map((p) => Math.max(p.value, p.threshold) * 1.18)
  );
  const threshold = latest ? latest.threshold : 100;
  const thresholdY = padTop + innerH - (Math.min(threshold, maxVal) / maxVal) * innerH;

  const strokeColor = accent === 'blue' ? '#38BDF8' : '#A855F7';
  const fillGradId = `gf-area-${accent}`;

  const coords = points.map((p, idx) => {
    const x =
      points.length <= 1
        ? padLeft + innerW * 0.5
        : padLeft + (idx / (points.length - 1)) * innerW;
    const y = padTop + innerH - (Math.min(p.value, maxVal) / maxVal) * innerH;
    return { x, y, ...p };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : '';

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0A0D14]/90 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Live Telemetry Stream</h3>
          <p className="text-xs text-slate-400">
            {metricLabel} · {thresholdLabel}
          </p>
        </div>
        <div className="font-mono text-xs tabular-nums text-slate-300">
          {latest ? (
            <>
              Latest: <span className="font-semibold text-white">{latest.value} {metricUnit}</span>
              <span className="mx-2 text-slate-600">/</span>
              Ceiling: <span className="text-slate-400">{latest.threshold} {metricUnit}</span>
            </>
          ) : (
            <span className="text-slate-500">Awaiting test events</span>
          )}
        </div>
      </div>

      {points.length === 0 ? (
        <div className="flex h-[176px] items-center justify-center rounded-lg border border-dashed border-slate-800 bg-[#07090E] px-4 text-center text-xs text-slate-500">
          Start the test or send a single pulse to inspect real-time anti-cheat telemetry response.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[176px] w-full overflow-visible"
          role="img"
          aria-label={`Live ${metricLabel} telemetry graph`}
        >
          <defs>
            <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + innerH * ratio;
            const val = Math.round(maxVal * (1 - ratio));
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Anti-Cheat Detection Ceiling Line */}
          <line
            x1={padLeft}
            y1={thresholdY}
            x2={width - padRight}
            y2={thresholdY}
            stroke="#F59E0B"
            strokeWidth="1.25"
            strokeDasharray="5 4"
          />
          <text
            x={width - padRight}
            y={Math.max(12, thresholdY - 5)}
            textAnchor="end"
            className="fill-amber-400 font-mono text-[10px]"
          >
            AC Threshold ({threshold})
          </text>

          {/* Area + Signal Path */}
          {areaPath && <path d={areaPath} fill={`url(#${fillGradId})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Event Sample Points */}
          {coords.map((c) => {
            const dotColor =
              c.verdict === 'DETECTED'
                ? '#10B981'
                : c.verdict === 'FLAGGED'
                  ? '#F59E0B'
                  : '#94A3B8';
            return (
              <circle
                key={c.tick}
                cx={c.x}
                cy={c.y}
                r="3.5"
                fill={dotColor}
                stroke="#06070A"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
